import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Artifact } from '../types'

interface ArtifactRow extends Artifact {
  buildId: string
}

export default function Artifacts() {
  const [rows, setRows] = useState<ArtifactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listBuilds(1, 50)
      .then(async (list) => {
        const successBuilds = list.builds.filter((b) => b.status === 'success')
        const collected: ArtifactRow[] = []
        for (const b of successBuilds.slice(0, 20)) {
          try {
            const { artifacts } = await api.getArtifacts(b.id)
            for (const a of artifacts) {
              collected.push({ ...a, buildId: b.id })
            }
          } catch {
            // ignore per-build errors
          }
        }
        setRows(collected)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const downloadArtifact = async (artifactId: string, name: string) => {
    setDownloadError(null)
    try { await api.downloadArtifact(artifactId, name) }
    catch (e) { setDownloadError(e instanceof Error ? e.message : 'Artifact download failed') }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Artifacts</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Artifacts from successful GitHub Actions runs. GitHub retains these artifacts for 7 days.
      </p>

      {error && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {downloadError && <div className="glass" style={{ padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>{downloadError}</div>}
      <div className="glass" style={{ padding: '1rem' }}>
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="empty-state">
            <h3>No artifacts yet</h3>
            <p>Successful builds will list downloadable artifacts here.</p>
            <Link to="/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>New Build</Link>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Build</th>
                <th style={{ padding: '0.5rem' }}>Size</th>
                <th style={{ padding: '0.5rem' }}>Created</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{a.name}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <Link to={`/builds/${a.buildId}`}>{a.buildId.slice(0, 8)}…</Link>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {a.size != null ? `${(a.size / 1024).toFixed(1)} KB` : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }} onClick={() => void downloadArtifact(a.id, a.name)}>
                      Download ZIP
                    </button>
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
