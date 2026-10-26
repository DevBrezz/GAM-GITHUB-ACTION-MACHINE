import type { Env } from './types'

export async function dispatchWorkflow(
  env: Env,
  buildId: string,
  sourceKey: string,
  profile: string,
  customCommand?: string,
  timeoutMinutes?: number
): Promise<{ ok: boolean; runId?: number; status: number; body?: string }> {
  const token = env.GITHUB_TOKEN
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const ref = env.GITHUB_REF || 'main'

  if (!token || !owner || !repo) {
    return { ok: false, status: 0, body: 'GitHub not configured' }
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/build.yml/dispatches`
  const body = {
    ref,
    inputs: {
      build_id: buildId,
      source_key: sourceKey,
      profile: profile || 'auto',
      custom_command: customCommand || '',
      timeout_minutes: String(timeoutMinutes || 30),
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Action-Machine/1.0 (KingBrezz)',
    },
    body: JSON.stringify(body),
  })

  // 204 = accepted; does NOT mean build succeeded
  if (res.status === 204) {
    return { ok: true, status: 204 }
  }
  const text = await res.text()
  return { ok: false, status: res.status, body: text }
}

export async function findRunByBuildId(
  env: Env,
  buildId: string,
  sinceMs = 15 * 60 * 1000
): Promise<{ runId?: number; htmlUrl?: string; status?: string; conclusion?: string | null }> {
  const token = env.GITHUB_TOKEN
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  if (!token || !owner || !repo) return {}

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?event=workflow_dispatch&per_page=20`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHub-Action-Machine/1.0 (KingBrezz)',
    },
  })
  if (!res.ok) return {}

  const data = (await res.json()) as {
    workflow_runs?: Array<{
      id: number
      html_url: string
      status: string
      conclusion: string | null
      created_at: string
      name?: string
      display_title?: string
    }>
  }

  const cutoff = Date.now() - sinceMs
  for (const run of data.workflow_runs || []) {
    const created = new Date(run.created_at).getTime()
    if (created < cutoff) continue
    // Prefer runs that mention build id in title/name if present
    const title = `${run.name || ''} ${run.display_title || ''}`
    if (title.includes(buildId)) {
      return {
        runId: run.id,
        htmlUrl: run.html_url,
        status: run.status,
        conclusion: run.conclusion,
      }
    }
  }

  // Fallback: most recent workflow_dispatch in window (documented limitation when concurrent)
  const recent = (data.workflow_runs || []).find((r) => new Date(r.created_at).getTime() >= cutoff)
  if (recent) {
    return {
      runId: recent.id,
      htmlUrl: recent.html_url,
      status: recent.status,
      conclusion: recent.conclusion,
    }
  }
  return {}
}

export async function fetchRunLogs(
  env: Env,
  runId: number
): Promise<{ logs?: string; error?: string }> {
  const token = env.GITHUB_TOKEN
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  if (!token || !owner || !repo) return { error: 'GitHub not configured' }

  // GitHub redirects to a zip of logs; Workers can follow redirects
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHub-Action-Machine/1.0 (KingBrezz)',
    },
    redirect: 'follow',
  })

  if (res.status === 404) {
    return { error: 'Logs not yet available or run not found' }
  }
  if (!res.ok) {
    return { error: `Log fetch failed: HTTP ${res.status}` }
  }

  // Response is typically a zip; for simplicity return a note.
  // Production should unzip and extract step logs.
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('zip') || contentType.includes('octet-stream')) {
    return {
      logs: `[Logs are available as a ZIP archive from GitHub Actions API for run ${runId}.]\nOpen the run URL in the UI for full browser-viewable logs.\nContent-Type: ${contentType}\nSize hint: ${res.headers.get('content-length') || 'unknown'} bytes.`,
    }
  }

  const text = await res.text()
  return { logs: text.slice(0, 500_000) }
}

export function mapGitHubStatus(
  status?: string,
  conclusion?: string | null
): import('./types').BuildStatus {
  if (!status) return 'unknown'
  if (status === 'queued' || status === 'pending' || status === 'waiting') return 'queued'
  if (status === 'in_progress' || status === 'requested') return 'in_progress'
  if (status === 'completed') {
    if (conclusion === 'success') return 'success'
    if (conclusion === 'cancelled') return 'cancelled'
    if (conclusion === 'timed_out') return 'timed_out'
    if (conclusion === 'failure' || conclusion === 'startup_failure') return 'failure'
    return 'error'
  }
  return 'unknown'
}
