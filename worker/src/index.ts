import type { Env, BuildRecord, ArtifactRecord } from './types'
import { json, error, corsHeaders, generateBuildId, isValidBuildId, validateZipBasic, parseMeta } from './utils'
import { dispatchWorkflow, findRunByBuildId, fetchRunLogs, mapGitHubStatus } from './github'

const VERSION = '1.0.0'
const AUTHOR = 'KingBrezz'

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || '*'
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function maxUpload(env: Env): number {
  return Number(env.MAX_UPLOAD_BYTES || 104857600)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const origin = request.headers.get('Origin')
    const allowed = getAllowedOrigins(env)
    const cors = corsHeaders(origin, allowed)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    try {
      let res: Response

      if (request.method === 'GET' && (path === '/api/health' || path === '/health')) {
        res = handleHealth(env)
      } else if (request.method === 'GET' && (path === '/api/settings' || path === '/settings')) {
        res = handleSettings(env)
      } else if (request.method === 'POST' && (path === '/api/build' || path === '/build')) {
        res = await handleCreateBuild(request, env, ctx)
      } else if (request.method === 'GET' && path.match(/^\/(?:api\/)?builds$/)) {
        res = await handleListBuilds(url, env)
      } else if (request.method === 'GET' && path.match(/^\/(?:api\/)?build\/[a-f0-9]{32}$/)) {
        const id = path.split('/').pop()!
        res = await handleGetBuild(id, env)
      } else if (request.method === 'GET' && path.match(/^\/(?:api\/)?build\/[a-f0-9]{32}\/logs$/)) {
        const id = path.split('/')[path.split('/').length - 2]
        res = await handleGetLogs(id, env)
      } else if (request.method === 'GET' && path.match(/^\/(?:api\/)?build\/[a-f0-9]{32}\/artifacts$/)) {
        const id = path.split('/')[path.split('/').length - 2]
        res = await handleGetArtifacts(id, env)
      } else if (request.method === 'POST' && path.match(/^\/(?:api\/)?build\/[a-f0-9]{32}\/cancel$/)) {
        res = error('Cancel is not implemented for GitHub-hosted runs in this version', 501, 'NOT_IMPLEMENTED')
      } else if (request.method === 'GET' && path.match(/^\/(?:api\/)?artifacts\/[a-f0-9-]+\/download$/)) {
        const id = path.split('/')[path.split('/').length - 2]
        res = await handleDownloadArtifact(id, env)
      } else if (request.method === 'POST' && (path === '/api/internal/callback' || path === '/internal/callback')) {
        res = await handleCallback(request, env)
      } else {
        res = error('Not found', 404, 'NOT_FOUND')
      }

      const headers = new Headers(res.headers)
      Object.entries(cors).forEach(([k, v]) => headers.set(k, v as string))
      return new Response(res.body, { status: res.status, headers })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Internal error'
      const headers = new Headers(corsHeaders(origin, allowed) as HeadersInit)
      headers.set('Content-Type', 'application/json')
      return new Response(JSON.stringify({ error: msg, code: 'INTERNAL' }), { status: 500, headers })
    }
  },
}

function handleHealth(env: Env): Response {
  return json({
    status: 'ok',
    version: VERSION,
    author: AUTHOR,
    product: 'GitHub Action Machine',
    timestamp: new Date().toISOString(),
    configured: {
      github: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO),
      r2: Boolean(env.ARTIFACTS),
      kv: Boolean(env.BUILDS),
    },
  })
}

function handleSettings(env: Env): Response {
  return json({
    maxUploadBytes: maxUpload(env),
    defaultTimeoutMinutes: Number(env.DEFAULT_TIMEOUT_MINUTES || 30),
    artifactRetentionDays: Number(env.ARTIFACT_RETENTION_DAYS || 7),
    rateLimitPerMinute: 10,
    product: 'GitHub Action Machine',
    author: AUTHOR,
  })
}

async function handleCreateBuild(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.BUILDS) {
    return error('KV not bound (BUILDS). Configure wrangler.toml.', 503, 'NOT_CONFIGURED')
  }
  if (!env.ARTIFACTS) {
    return error('R2 not bound (ARTIFACTS). Configure wrangler.toml.', 503, 'NOT_CONFIGURED')
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return error('Expected multipart/form-data', 400, 'INVALID_CONTENT_TYPE')
  }

  const form = await request.formData()
  const file = form.get('file')
  const metaRaw = form.get('meta')
  const meta = parseMeta(typeof metaRaw === 'string' ? metaRaw : null)

  if (file === null || typeof file === 'string') {
    return error('Missing file field', 400, 'MISSING_FILE')
  }

  // Some Cloudflare Workers type-library versions narrow FormDataEntryValue
  // to never. Cast only after rejecting null/string values.
  const uploadFile = file as unknown as {
    name: string
    size: number
    arrayBuffer: () => Promise<ArrayBuffer>
  }

  const max = maxUpload(env)
  if (uploadFile.size > max) {
    return error(`File exceeds limit of ${max} bytes`, 413, 'FILE_TOO_LARGE')
  }

  const buf = await uploadFile.arrayBuffer()
  const validation = await validateZipBasic(buf, max)
  if (!validation.ok) {
    return error(validation.reason || 'Invalid ZIP', 400, 'INVALID_ZIP')
  }

  const buildId = generateBuildId()
  const sourceKey = `sources/${buildId}/${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  await env.ARTIFACTS.put(sourceKey, buf, {
    httpMetadata: { contentType: 'application/zip' },
    customMetadata: { buildId, originalName: uploadFile.name },
  })

  const record: BuildRecord = {
    id: buildId,
    status: 'queued',
    projectName: meta.fileName || uploadFile.name,
    profile: meta.profile || 'auto',
    command: meta.customCommand,
    createdAt: new Date().toISOString(),
    sourceKey,
    artifacts: [],
    logAvailable: false,
    clientIp: request.headers.get('CF-Connecting-IP') || undefined,
  }

  await env.BUILDS.put(`build:${buildId}`, JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 14, // 14 days
  })

  // Index for list
  const indexKey = 'build:index'
  const indexRaw = await env.BUILDS.get(indexKey)
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
  index.unshift(buildId)
  await env.BUILDS.put(indexKey, JSON.stringify(index.slice(0, 500)))

  if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
    const dispatch = await dispatchWorkflow(
      env,
      buildId,
      sourceKey,
      meta.profile || 'auto',
      meta.customCommand,
      meta.timeoutMinutes
    )
    if (!dispatch.ok) {
      record.status = 'error'
      record.errorMessage = `Workflow dispatch failed (HTTP ${dispatch.status}): ${dispatch.body?.slice(0, 500) || 'unknown'}`
      record.completedAt = new Date().toISOString()
      await env.BUILDS.put(`build:${buildId}`, JSON.stringify(record))
      return json({ buildId, status: record.status, message: record.errorMessage }, 502)
    }
    // Attempt to resolve run id shortly after dispatch
    ctx.waitUntil(
      (async () => {
        await new Promise((r) => setTimeout(r, 3000))
        const found = await findRunByBuildId(env, buildId)
        if (found.runId) {
          const latest = await env.BUILDS!.get(`build:${buildId}`)
          if (latest) {
            const rec = JSON.parse(latest) as BuildRecord
            rec.githubRunId = found.runId
            rec.githubRunUrl = found.htmlUrl
            if (found.status) {
              rec.status = mapGitHubStatus(found.status, found.conclusion)
            }
            await env.BUILDS!.put(`build:${buildId}`, JSON.stringify(rec))
          }
        }
      })()
    )
  } else {
    record.status = 'error'
    record.errorMessage = 'GitHub integration NOT CONFIGURED (GITHUB_TOKEN / OWNER / REPO). Source stored; no workflow dispatched.'
    record.completedAt = new Date().toISOString()
    await env.BUILDS.put(`build:${buildId}`, JSON.stringify(record))
  }

  return json({
    buildId,
    status: record.status,
    message: record.errorMessage || 'Build queued',
  }, 201)
}

async function handleListBuilds(url: URL, env: Env): Promise<Response> {
  if (!env.BUILDS) return error('KV not bound', 503, 'NOT_CONFIGURED')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))
  const statusFilter = url.searchParams.get('status') || ''

  const indexRaw = await env.BUILDS.get('build:index')
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
  const builds: BuildRecord[] = []
  for (const id of index) {
    const raw = await env.BUILDS.get(`build:${id}`)
    if (!raw) continue
    const b = JSON.parse(raw) as BuildRecord
    if (statusFilter && b.status !== statusFilter) continue
    builds.push(sanitizeBuild(b))
  }
  const total = builds.length
  const slice = builds.slice((page - 1) * pageSize, page * pageSize)
  return json({ builds: slice, total, page, pageSize })
}

async function handleGetBuild(id: string, env: Env): Promise<Response> {
  if (!isValidBuildId(id)) return error('Invalid build id', 400, 'INVALID_ID')
  if (!env.BUILDS) return error('KV not bound', 503, 'NOT_CONFIGURED')

  let raw = await env.BUILDS.get(`build:${id}`)
  if (!raw) return error('Build not found', 404, 'NOT_FOUND')
  let record = JSON.parse(raw) as BuildRecord

  // Refresh status from GitHub if still active
  if (
    env.GITHUB_TOKEN &&
    (record.status === 'queued' || record.status === 'in_progress' || !record.githubRunId)
  ) {
    const found = await findRunByBuildId(env, id)
    if (found.runId) {
      record.githubRunId = found.runId
      record.githubRunUrl = found.htmlUrl
      const mapped = mapGitHubStatus(found.status, found.conclusion)
      if (mapped !== 'unknown') record.status = mapped
      if (found.status === 'completed') {
        record.completedAt = record.completedAt || new Date().toISOString()
      }
      await env.BUILDS.put(`build:${id}`, JSON.stringify(record))
    }
  }

  return json(sanitizeBuild(record))
}

async function handleGetLogs(id: string, env: Env): Promise<Response> {
  if (!isValidBuildId(id)) return error('Invalid build id', 400, 'INVALID_ID')
  if (!env.BUILDS) return error('KV not bound', 503, 'NOT_CONFIGURED')
  const raw = await env.BUILDS.get(`build:${id}`)
  if (!raw) return error('Build not found', 404, 'NOT_FOUND')
  const record = JSON.parse(raw) as BuildRecord

  if (!record.githubRunId) {
    return json({
      logs: 'Waiting for runner logs. Workflow may still be queued or run ID not yet associated.',
      truncated: false,
    })
  }

  const result = await fetchRunLogs(env, record.githubRunId)
  if (result.error) {
    return json({
      logs: `${result.error}\n\nOpen the GitHub Actions run for full logs: ${record.githubRunUrl || '(no URL)'}`,
      truncated: false,
    })
  }
  return json({ logs: result.logs || '', truncated: false })
}

async function handleGetArtifacts(id: string, env: Env): Promise<Response> {
  if (!isValidBuildId(id)) return error('Invalid build id', 400, 'INVALID_ID')
  if (!env.BUILDS) return error('KV not bound', 503, 'NOT_CONFIGURED')
  const raw = await env.BUILDS.get(`build:${id}`)
  if (!raw) return error('Build not found', 404, 'NOT_FOUND')
  const record = JSON.parse(raw) as BuildRecord
  return json({ artifacts: record.artifacts || [] })
}

async function handleDownloadArtifact(artifactId: string, env: Env): Promise<Response> {
  if (!env.ARTIFACTS || !env.BUILDS) {
    return error('Storage not configured', 503, 'NOT_CONFIGURED')
  }
  // Artifact id format: buildId:name or stored r2 key lookup via KV index
  const metaKey = `artifact:${artifactId}`
  const metaRaw = await env.BUILDS.get(metaKey)
  if (!metaRaw) {
    return error('Artifact not found or expired', 404, 'NOT_FOUND')
  }
  const meta = JSON.parse(metaRaw) as ArtifactRecord & { r2Key: string }
  if (!meta.r2Key) return error('Artifact storage key missing', 404, 'NOT_FOUND')

  const obj = await env.ARTIFACTS.get(meta.r2Key)
  if (!obj) return error('Artifact object missing', 404, 'NOT_FOUND')

  const headers = new Headers()
  headers.set('Content-Type', meta.contentType || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${meta.name.replace(/"/g, '')}"`)
  if (obj.size) headers.set('Content-Length', String(obj.size))
  return new Response(obj.body, { status: 200, headers })
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  // Internal callback from workflow to register artifacts / final status
  const key = request.headers.get('X-Admin-Key') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (env.ADMIN_API_KEY && key !== env.ADMIN_API_KEY) {
    return error('Unauthorized', 401, 'UNAUTHORIZED')
  }
  if (!env.BUILDS) return error('KV not bound', 503, 'NOT_CONFIGURED')

  const body = (await request.json()) as {
    buildId: string
    status?: string
    exitCode?: number
    projectType?: string
    runtime?: string
    errorMessage?: string
    artifacts?: Array<{ name: string; r2Key: string; size?: number; contentType?: string }>
  }

  if (!isValidBuildId(body.buildId)) return error('Invalid build id', 400, 'INVALID_ID')
  const raw = await env.BUILDS.get(`build:${body.buildId}`)
  if (!raw) return error('Build not found', 404, 'NOT_FOUND')

  const record = JSON.parse(raw) as BuildRecord
  if (body.status) record.status = body.status as BuildRecord['status']
  if (body.exitCode != null) record.exitCode = body.exitCode
  if (body.projectType) record.projectType = body.projectType
  if (body.runtime) record.runtime = body.runtime
  if (body.errorMessage) record.errorMessage = body.errorMessage
  record.completedAt = new Date().toISOString()
  if (record.createdAt) {
    record.durationMs = Date.now() - new Date(record.createdAt).getTime()
  }

  if (body.artifacts?.length) {
    const retentionDays = Number(env.ARTIFACT_RETENTION_DAYS || 7)
    const expiresAt = new Date(Date.now() + retentionDays * 86400_000).toISOString()
    record.artifacts = body.artifacts.map((a) => {
      const aid = `${body.buildId}-${a.name}`.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120)
      const art: ArtifactRecord = {
        id: aid,
        name: a.name,
        size: a.size,
        contentType: a.contentType,
        createdAt: new Date().toISOString(),
        expiresAt,
        r2Key: a.r2Key,
      }
      // fire-and-forget index
      env.BUILDS!.put(`artifact:${aid}`, JSON.stringify(art), {
        expirationTtl: retentionDays * 86400,
      })
      return art
    })
  }

  await env.BUILDS.put(`build:${body.buildId}`, JSON.stringify(record))
  return json({ ok: true })
}

function sanitizeBuild(b: BuildRecord): BuildRecord {
  const { clientIp, sourceKey, ...rest } = b
  return rest
}
