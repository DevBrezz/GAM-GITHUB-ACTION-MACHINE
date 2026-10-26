import type {
  Build,
  BuildListResponse,
  CreateBuildRequest,
  CreateBuildResponse,
  HealthResponse,
  Artifact,
} from '../types'

const API = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const WORKFLOW = 'build.yml'
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

type GitHubConfig = { owner: string; repo: string; branch: string }
type GitHubRun = {
  id: number
  name?: string
  display_title?: string
  status: string
  conclusion: string | null
  created_at: string
  run_started_at?: string | null
  updated_at: string
  html_url: string
  run_number: number
  event: string
}
type GitHubArtifact = {
  id: number
  name: string
  size_in_bytes: number
  created_at: string
  expires_at: string
  archive_download_url: string
}
type GitHubJob = { id: number; name: string; status: string; conclusion: string | null }

let tokenInMemory = ''
const CONFIG_KEY = 'gtm.github.config.v1'

function readConfig(): GitHubConfig {
  try {
    const value = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') as Partial<GitHubConfig>
    return {
      owner: (value.owner || '').trim(),
      repo: (value.repo || '').trim(),
      branch: (value.branch || 'main').trim() || 'main',
    }
  } catch {
    return { owner: '', repo: '', branch: 'main' }
  }
}

export const githubConnection = {
  getConfig: readConfig,
  isConnected: () => Boolean(tokenInMemory),
  configure(config: GitHubConfig, token: string) {
    const normalized = {
      owner: config.owner.trim(),
      repo: config.repo.trim(),
      branch: config.branch.trim() || 'main',
    }
    if (!normalized.owner || !normalized.repo || !token.trim()) {
      throw new Error('Owner, repository, and a GitHub token are required.')
    }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized))
    tokenInMemory = token.trim()
  },
  disconnect() {
    tokenInMemory = ''
  },
}

function requireConfig() {
  const config = readConfig()
  if (!config.owner || !config.repo) throw new Error('Configure the private build repository in Settings first.')
  if (!tokenInMemory) throw new Error('GitHub token is not connected. Open Settings and connect again; the token is intentionally not saved.')
  return config
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!tokenInMemory) throw new Error('GitHub token is not connected. Open Settings and connect again.')
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenInMemory}`,
      'X-GitHub-Api-Version': API_VERSION,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json() as { message?: string }
      if (body.message) message = body.message
    } catch { /* response may not be JSON */ }
    if (response.status === 401) message = 'GitHub rejected this token. Check that it is valid and has not expired.'
    if (response.status === 403) message = `GitHub denied this action. Check token permissions and Actions usage limits. (${message})`
    if (response.status === 404) message = `Repository or workflow not found, or the token cannot access it. (${message})`
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function repoPath(config = requireConfig()) {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`
}

function toStatus(run: GitHubRun): Build['status'] {
  if (run.status !== 'completed') return run.status === 'queued' || run.status === 'requested' || run.status === 'waiting' ? 'queued' : 'in_progress'
  switch (run.conclusion) {
    case 'success': return 'success'
    case 'cancelled': return 'cancelled'
    case 'timed_out': return 'timed_out'
    case 'skipped': return 'unsupported'
    case 'failure':
    case 'startup_failure':
    case 'action_required': return 'failure'
    default: return 'unknown'
  }
}

function buildIdFromRun(run: GitHubRun) {
  const title = run.display_title || run.name || ''
  const match = title.match(/^GTM Build\s+(.+)$/)
  return match?.[1] || String(run.id)
}

function toBuild(run: GitHubRun): Build {
  const started = run.run_started_at || undefined
  const completed = run.status === 'completed' ? run.updated_at : undefined
  const startMs = started ? new Date(started).getTime() : NaN
  const endMs = completed ? new Date(completed).getTime() : NaN
  return {
    id: buildIdFromRun(run),
    status: toStatus(run),
    createdAt: run.created_at,
    startedAt: started,
    completedAt: completed,
    durationMs: Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : undefined,
    githubRunId: run.id,
    githubRunUrl: run.html_url,
    projectType: undefined,
    logAvailable: true,
    errorMessage: run.conclusion && !['success', 'cancelled'].includes(run.conclusion) ? `GitHub Actions conclusion: ${run.conclusion}` : undefined,
  }
}

async function getRuns(): Promise<GitHubRun[]> {
  const config = requireConfig()
  const response = await gh<{ workflow_runs: GitHubRun[] }>(`${repoPath(config)}/actions/workflows/${WORKFLOW}/runs?per_page=100`)
  return response.workflow_runs.filter((run) => (run.display_title || run.name || '').startsWith('GTM Build '))
}

async function findRun(id: string) {
  const runs = await getRuns()
  const run = runs.find((item) => buildIdFromRun(item) === id || String(item.id) === id)
  if (!run) throw new Error(`Build ${id} was not found yet. Refresh in a few seconds if it was just started.`)
  return run
}

function bytesToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

async function deleteRef(config: GitHubConfig, branch: string) {
  try {
    await gh(`${repoPath(config)}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' })
  } catch { /* best effort cleanup */ }
}

export const api = {
  async health(): Promise<HealthResponse> {
    const config = requireConfig()
    await gh('/user')
    const repository = await gh<{ private: boolean }>(repoPath(config))
    if (!repository.private) throw new Error('Security check failed: the runner repository must be PRIVATE because GTM temporarily uploads source ZIPs to branches.')
    await gh(`${repoPath(config)}/actions/workflows/${WORKFLOW}`)
    return {
      status: 'connected', version: 'GitHub Actions direct mode', author: 'KingBrezz', timestamp: new Date().toISOString(),
      configured: { github: true, r2: false, kv: false },
    }
  },

  async listBuilds(page = 1, pageSize = 20, status?: string): Promise<BuildListResponse> {
    const runs = (await getRuns()).map(toBuild)
    const filtered = status ? runs.filter((build) => build.status === status) : runs
    const start = Math.max(0, (page - 1) * pageSize)
    return { builds: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize }
  },

  async getBuild(id: string): Promise<Build> {
    const build = toBuild(await findRun(id))
    try { build.artifacts = (await this.getArtifacts(build.id)).artifacts } catch { /* artifacts may not be ready */ }
    return build
  },

  async getLogs(id: string): Promise<{ logs: string; truncated?: boolean }> {
    const config = requireConfig()
    const run = await findRun(id)
    const response = await gh<{ jobs: GitHubJob[] }>(`${repoPath(config)}/actions/runs/${run.id}/jobs?per_page=100`)
    const output: string[] = []
    for (const job of response.jobs) {
      output.push(`===== ${job.name} (${job.status}${job.conclusion ? ` / ${job.conclusion}` : ''}) =====`)
      try {
        const logResponse = await fetch(`${API}${repoPath(config)}/actions/jobs/${job.id}/logs`, {
          headers: { Authorization: `Bearer ${tokenInMemory}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION },
        })
        if (logResponse.ok) output.push(await logResponse.text())
        else output.push(`Logs not available yet (${logResponse.status}). Open the GitHub Actions run for full logs.`)
      } catch {
        output.push('Could not retrieve this job log. Open the GitHub Actions run link for full logs.')
      }
    }
    return { logs: output.join('\n\n') || 'No job logs are available yet.' }
  },

  async getArtifacts(id: string): Promise<{ artifacts: Artifact[] }> {
    const config = requireConfig()
    const run = await findRun(id)
    const response = await gh<{ artifacts: GitHubArtifact[] }>(`${repoPath(config)}/actions/runs/${run.id}/artifacts?per_page=100`)
    return { artifacts: response.artifacts.filter((item) => !item.name.startsWith('gtm-source-')).map((item) => ({
      id: String(item.id), name: item.name, size: item.size_in_bytes, createdAt: item.created_at, expiresAt: item.expires_at,
    })) }
  },

  async downloadArtifact(artifactId: string, name: string) {
    const config = requireConfig()
    const response = await fetch(`${API}${repoPath(config)}/actions/artifacts/${encodeURIComponent(artifactId)}/zip`, {
      headers: { Authorization: `Bearer ${tokenInMemory}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION },
    })
    if (!response.ok) throw new Error(`Artifact download failed (${response.status}).`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },

  async createBuild(file: File, meta: CreateBuildRequest): Promise<CreateBuildResponse> {
    const config = requireConfig()
    if (file.size > MAX_SOURCE_BYTES) throw new Error('Direct GitHub upload is limited to 20 MB per ZIP. This limit avoids oversized browser/API requests.')
    if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Only .zip files are accepted.')
    if (!Number.isFinite(meta.timeoutMinutes) || (meta.timeoutMinutes ?? 30) < 5 || (meta.timeoutMinutes ?? 30) > 120) throw new Error('Timeout must be between 5 and 120 minutes.')

    const buildId = `gtm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const uploadBranch = `gtm-upload-${buildId}`
    const base = repoPath(config)
    const branchRef = await gh<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(config.branch)}`)
    await gh(`${base}/git/refs`, {
      method: 'POST', body: JSON.stringify({ ref: `refs/heads/${uploadBranch}`, sha: branchRef.object.sha }),
    })

    try {
      await gh(`${base}/contents/source.zip`, {
        method: 'PUT',
        body: JSON.stringify({ message: `GTM: upload source for ${buildId}`, content: bytesToBase64(await file.arrayBuffer()), branch: uploadBranch }),
      })
      await gh(`${base}/actions/workflows/${WORKFLOW}/dispatches`, {
        method: 'POST',
        body: JSON.stringify({
          ref: config.branch,
          inputs: {
            build_id: buildId,
            source_ref: uploadBranch,
            profile: meta.profile || 'auto',
            custom_command: meta.customCommand || '',
            timeout_minutes: String(meta.timeoutMinutes || 30),
          },
        }),
      })
      return { buildId, status: 'queued', message: 'Build dispatched to GitHub Actions.' }
    } catch (error) {
      await deleteRef(config, uploadBranch)
      throw error
    }
  },

  async cancelBuild(id: string): Promise<{ status: string }> {
    const config = requireConfig()
    const run = await findRun(id)
    await gh(`${repoPath(config)}/actions/runs/${run.id}/cancel`, { method: 'POST' })
    return { status: 'cancelled' }
  },

  async getSettings(): Promise<Record<string, unknown>> {
    const config = readConfig()
    return { owner: config.owner, repo: config.repo, branch: config.branch, maxUploadBytes: MAX_SOURCE_BYTES, defaultTimeoutMinutes: 30, artifactRetentionDays: 7, rateLimitPerMinute: 'GitHub API rate limits apply' }
  },
}
