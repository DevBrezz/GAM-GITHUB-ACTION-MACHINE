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

export interface BuildRecord {
  id: string
  status: BuildStatus
  projectName?: string
  projectType?: string
  runtime?: string
  command?: string
  profile?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  exitCode?: number
  githubRunId?: number
  githubRunUrl?: string
  errorMessage?: string
  sourceKey?: string
  artifacts?: ArtifactRecord[]
  logAvailable?: boolean
  clientIp?: string
}

export interface ArtifactRecord {
  id: string
  name: string
  size?: number
  contentType?: string
  createdAt: string
  expiresAt?: string
  r2Key?: string
}

export interface Env {
  ARTIFACTS?: R2Bucket
  BUILDS?: KVNamespace
  GITHUB_TOKEN?: string
  GITHUB_OWNER?: string
  GITHUB_REPO?: string
  GITHUB_REF?: string
  ADMIN_API_KEY?: string
  MAX_UPLOAD_BYTES?: string
  ARTIFACT_RETENTION_DAYS?: string
  DEFAULT_TIMEOUT_MINUTES?: string
  ALLOWED_ORIGINS?: string
}
