import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Build } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function BuildHistory() {
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .listBuilds(1, 50, statusFilter || undefined)
      .then((r) => {
        setBuilds(r.builds)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = search
    ? builds.filter((b) => b.id.toLowerCase().includes(search.toLowerCase()))
    : builds

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Build History</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search Build ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 180 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="in_progress">In Progress</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="cancelled">Cancelled</option>
          <option value="unsupported">Unsupported</option>
        </select>
        <Link to="/new" className="btn btn-primary">New Build</Link>
      </div>

      {error && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ padding: '1rem' }}>
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No builds found</h3>
            <p>Start a new build or clear filters.</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Build ID</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Project type</th>
                <th style={{ padding: '0.5rem' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <Link to={`/builds/${b.id}`}>{b.id}</Link>
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
