export type BuildStatus =
  | 'queued'
  | 'in_progress'
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'timed_out'
  | 'unsupported'
  | 'error'
  | 'unknown'

export interface Build {
  id: string
  status: BuildStatus
  projectName?: string
  projectType?: string
  runtime?: string
  command?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  exitCode?: number
  githubRunId?: number
  githubRunUrl?: string
  errorMessage?: string
  artifacts?: Artifact[]
  logAvailable?: boolean
}

export interface Artifact {
  id: string
  name: string
  size?: number
  contentType?: string
  createdAt: string
  expiresAt?: string
  downloadUrl?: string
}

export interface BuildListResponse {
  builds: Build[]
  total: number
  page: number
  pageSize: number
}

export interface HealthResponse {
  status: string
  version: string
  author: string
  timestamp: string
  configured: {
    github: boolean
    r2: boolean
    kv: boolean
  }
}

export interface CreateBuildRequest {
  fileName: string
  fileSize: number
  profile: string
  customCommand?: string
  timeoutMinutes?: number
}

export interface CreateBuildResponse {
  buildId: string
  uploadUrl?: string
  status: string
  message?: string
}

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}
