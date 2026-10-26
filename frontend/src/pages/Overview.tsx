import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Build, HealthResponse } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function Overview() {
  const [builds, setBuilds] = useState<Build[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.listBuilds(1, 10).catch(() => ({ builds: [], total: 0, page: 1, pageSize: 10 })),
      api.health().catch(() => null),
    ]).then(([list, h]) => {
      if (!cancelled) {
        setBuilds(list.builds)
        setHealth(h)
        setLoading(false)
      }
    }).catch((e) => {
      if (!cancelled) {
        setError(e.message)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const counts = {
    total: builds.length,
    success: builds.filter((b) => b.status === 'success').length,
    failure: builds.filter((b) => b.status === 'failure' || b.status === 'error').length,
    active: builds.filter((b) => b.status === 'queued' || b.status === 'in_progress').length,
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.25rem' }}>Overview</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        GitHub Action Machine — Universal Build Automation Platform
      </p>

      {error && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--danger)' }}>
          Backend unreachable: {error}. Configure <code>VITE_API_BASE_URL</code> and deploy the Worker.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Recent builds', value: counts.total },
          { label: 'Active', value: counts.active },
          { label: 'Succeeded', value: counts.success },
          { label: 'Failed', value: counts.failure },
        ].map((c) => (
          <div key={c.label} className="glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      {health && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Backend status</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Version: {health.version}</span>
            <span>Author: {health.author}</span>
            <span>GitHub: {health.configured.github ? 'Configured' : 'NOT CONFIGURED'}</span>
            <span>R2: {health.configured.r2 ? 'Bound' : 'NOT CONFIGURED'}</span>
            <span>KV: {health.configured.kv ? 'Bound' : 'NOT CONFIGURED'}</span>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Recent builds</h2>
          <Link to="/new" className="btn btn-primary">New Build</Link>
        </div>

        {loading && <div className="empty-state">Loading…</div>}
        {!loading && builds.length === 0 && (
          <div className="empty-state">
            <h3>No builds yet</h3>
            <p>Upload a project ZIP to start your first build.</p>
            <Link to="/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>Start a build</Link>
          </div>
        )}
        {!loading && builds.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Build ID</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Type</th>
                <th style={{ padding: '0.5rem' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <Link to={`/builds/${b.id}`}>{b.id.slice(0, 8)}…</Link>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-secondary)' }}>{b.projectType || '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
