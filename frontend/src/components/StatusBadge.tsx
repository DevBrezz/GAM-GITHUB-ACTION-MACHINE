import type { BuildStatus } from '../types'

const labels: Record<BuildStatus, string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  success: 'Success',
  failure: 'Failure',
  cancelled: 'Cancelled',
  timed_out: 'Timed Out',
  unsupported: 'Unsupported',
  error: 'Error',
  unknown: 'Unknown',
}

export default function StatusBadge({ status }: { status: BuildStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      {status === 'in_progress' && <span className="spinner" />}
      {labels[status] || status}
    </span>
  )
}
