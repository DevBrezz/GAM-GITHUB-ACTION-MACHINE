import type {
  BuildListResponse,
  CreateBuildRequest,
  CreateBuildResponse,
  HealthResponse,
  Artifact,
  ApiError,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let err: ApiError = { error: res.statusText }
    try {
      err = await res.json()
    } catch {
      // ignore
    }
    throw Object.assign(new Error(err.error || res.statusText), {
      status: res.status,
      code: err.code,
      details: err.details,
    })
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  health(): Promise<HealthResponse> {
    return request('/health')
  },

  listBuilds(page = 1, pageSize = 20, status?: string): Promise<BuildListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (status) params.set('status', status)
    return request(`/builds?${params}`)
  },

  getBuild(id: string): Promise<Build> {
    return request(`/build/${encodeURIComponent(id)}`)
  },

  getLogs(id: string): Promise<{ logs: string; truncated?: boolean }> {
    return request(`/build/${encodeURIComponent(id)}/logs`)
  },

  getArtifacts(id: string): Promise<{ artifacts: Artifact[] }> {
    return request(`/build/${encodeURIComponent(id)}/artifacts`)
  },

  async createBuild(
    file: File,
    meta: CreateBuildRequest
  ): Promise<CreateBuildResponse> {
    const form = new FormData()
    form.append('file', file)
    form.append('meta', JSON.stringify(meta))
    return request('/build', {
      method: 'POST',
      body: form,
    })
  },

  cancelBuild(id: string): Promise<{ status: string }> {
    return request(`/build/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    })
  },

  getSettings(): Promise<Record<string, unknown>> {
    return request('/settings')
  },

  getArtifactDownloadUrl(artifactId: string): string {
    return `${API_BASE}/artifacts/${encodeURIComponent(artifactId)}/download`
  },
}
