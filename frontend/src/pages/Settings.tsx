import { useState } from 'react'
import { api, githubConnection } from '../services/api'
import type { HealthResponse } from '../types'

export default function Settings() {
  const saved = githubConnection.getConfig()
  const [owner, setOwner] = useState(saved.owner)
  const [repo, setRepo] = useState(saved.repo)
  const [branch, setBranch] = useState(saved.branch || 'main')
  const [token, setToken] = useState('')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [connected, setConnected] = useState(githubConnection.isConnected())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connect = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      githubConnection.configure({ owner, repo, branch }, token)
      const status = await api.health()
      setHealth(status)
      setConnected(true)
      setToken('')
      setMessage('Connected. The token remains in memory only and will be cleared when this page is reloaded.')
    } catch (e) {
      githubConnection.disconnect()
      setConnected(false)
      setError(e instanceof Error ? e.message : 'Could not connect to GitHub.')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = () => {
    githubConnection.disconnect()
    setConnected(false)
    setHealth(null)
    setMessage('Disconnected. Your token was cleared from memory.')
    setError(null)
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.35rem' }}>Settings</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Connect GTM directly to a private GitHub repository. No Worker, R2, KV, or API base URL is used.
      </p>

      <form onSubmit={connect} className="glass" style={{ padding: '1.25rem', maxWidth: 720, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>GitHub Actions runner repository</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Use a separate <strong>private</strong> repository for builds and uploaded source. Copy <code>.github/workflows/build.yml</code> from the GTM repository into that private repository.
        </p>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Repository owner</label>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} required placeholder="e.g. DevBrezz" style={{ width: '100%', marginBottom: '0.85rem' }} />
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Private repository name</label>
        <input value={repo} onChange={(e) => setRepo(e.target.value)} required placeholder="e.g. gtm-build-runner" style={{ width: '100%', marginBottom: '0.85rem' }} />
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Default branch</label>
        <input value={branch} onChange={(e) => setBranch(e.target.value)} required placeholder="main" style={{ width: '100%', marginBottom: '0.85rem' }} />
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Fine-grained GitHub Personal Access Token</label>
        <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required placeholder={connected ? 'Connected token is held in memory' : 'github_pat_…'} style={{ width: '100%', marginBottom: '0.5rem' }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Required repository permissions: <strong>Actions: Read and write</strong> and <strong>Contents: Read and write</strong>. Metadata read-only is automatic. Do not use an account-wide classic token. The token is never written to localStorage or sent to any service except api.github.com.
        </p>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{message}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !token.trim()}>{busy ? 'Connecting…' : 'Connect & Test'}</button>
          {connected && <button className="btn btn-secondary" type="button" onClick={disconnect}>Disconnect</button>}
        </div>
      </form>

      <div className="glass" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Connection status</h2>
        <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>GitHub API: {connected ? 'Connected in this tab' : 'Not connected'}</li>
          <li>Runner: {health ? `${health.author} / ${health.status}` : 'Not tested'}</li>
          <li>R2 storage: NOT USED</li>
          <li>KV metadata: NOT USED</li>
          <li>VITE_API_BASE_URL: NOT USED</li>
        </ul>
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Security and limitations</h2>
        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <li>The runner repository must be private; uploaded ZIPs are committed to temporary upload branches before dispatch.</li>
          <li>GTM deletes the temporary branch after the workflow finishes. Git history/object cleanup is controlled by GitHub and is not an immediate secure-erasure guarantee.</li>
          <li>The token is memory-only. Reloading the page clears it, so reconnect in Settings after reload.</li>
          <li>Uploaded projects and custom commands execute on GitHub-hosted runners. Do not build untrusted code with a token/account that has access to sensitive repositories.</li>
          <li>GitHub Actions usage limits, repository policy, and artifact retention still apply.</li>
        </ul>
      </div>
    </div>
  )
}
