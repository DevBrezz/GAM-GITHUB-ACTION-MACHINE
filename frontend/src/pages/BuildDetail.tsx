import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Build } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function BuildDetail() {
  const { id } = useParams<{ id: string }>()
  const [build, setBuild] = useState<Build | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const logRef = useRef<HTMLPreElement>(null)
  const pollRef = useRef<number | null>(null)

  const load = async () => {
    if (!id) return
    try {
      const b = await api.getBuild(id)
      setBuild(b)
      setError(null)
      if (b.logAvailable !== false) {
        try {
          const l = await api.getLogs(id)
          setLogs(l.logs || '')
        } catch {
          // logs may not be ready
        }
      }
      if (b.status === 'queued' || b.status === 'in_progress') {
        // keep polling
      } else if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load build')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    pollRef.current = window.setInterval(load, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [id])

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback
    }
  }

  const errorLog = logs
    .split('\n')
    .filter((line) => /error|fail|exception|fatal|✖|✗/i.test(line))
    .join('\n') || '(No obvious error lines detected in log)'

  if (loading && !build) {
    return <div className="empty-state">Loading build…</div>
  }

  if (error && !build) {
    return (
      <div>
        <Link to="/builds" style={{ fontSize: '0.85rem' }}>← Build History</Link>
        <div className="glass" style={{ padding: '1.5rem', marginTop: '1rem', color: 'var(--danger)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (!build) return null

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/builds" style={{ fontSize: '0.85rem' }}>← Build History</Link>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Build {build.id.slice(0, 12)}…</h1>
        <StatusBadge status={build.status} />
        <button className="btn btn-ghost" onClick={() => copyText(build.id)} title="Copy Build ID">
          Copy ID
        </button>
      </div>

      <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Created</span><br />{new Date(build.createdAt).toLocaleString()}</div>
        {build.startedAt && <div><span style={{ color: 'var(--text-muted)' }}>Started</span><br />{new Date(build.startedAt).toLocaleString()}</div>}
        {build.completedAt && <div><span style={{ color: 'var(--text-muted)' }}>Completed</span><br />{new Date(build.completedAt).toLocaleString()}</div>}
        {build.durationMs != null && <div><span style={{ color: 'var(--text-muted)' }}>Duration</span><br />{(build.durationMs / 1000).toFixed(1)}s</div>}
        <div><span style={{ color: 'var(--text-muted)' }}>Type</span><br />{build.projectType || '—'}</div>
        <div><span style={{ color: 'var(--text-muted)' }}>Runtime</span><br />{build.runtime || '—'}</div>
        {build.exitCode != null && <div><span style={{ color: 'var(--text-muted)' }}>Exit code</span><br />{build.exitCode}</div>}
        {build.githubRunUrl && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>GitHub run</span><br />
            <a href={build.githubRunUrl} target="_blank" rel="noopener noreferrer">Open run</a>
          </div>
        )}
      </div>

      {build.errorMessage && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--danger)', color: '#f87171' }}>
          {build.errorMessage}
        </div>
      )}

      {build.artifacts && build.artifacts.length > 0 && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Artifacts</h3>
          <ul style={{ listStyle: 'none' }}>
            {build.artifacts.map((a) => (
              <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{a.name} {a.size != null ? `(${(a.size / 1024).toFixed(1)} KB)` : ''}</span>
                <a
                  className="btn btn-secondary"
                  href={api.getArtifactDownloadUrl(a.id)}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0, flex: 1 }}>Logs</h3>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Autoscroll
          </label>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => copyText(logs)}>
            Copy Full Log
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => copyText(errorLog)}>
            Copy Error Log
          </button>
        </div>
        <pre
          ref={logRef}
          style={{
            background: '#0d1117',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            maxHeight: 420,
            overflow: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: '#c9d1d9',
          }}
        >
          {logs || (build.status === 'queued' || build.status === 'in_progress'
            ? 'Waiting for runner logs…'
            : 'No logs available. If the GitHub token lacks log access, open the GitHub Actions run link above.')}
        </pre>
      </div>
    </div>
  )
}
