import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { HealthResponse } from '../types'

export default function Settings() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.health().catch(() => null),
      api.getSettings().catch(() => null),
    ]).then(([h, s]) => {
      setHealth(h)
      setSettings(s)
      if (!h) setError('Backend not reachable. Check VITE_API_BASE_URL and Worker deployment.')
    })
  }, [])

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Settings</h1>

      {error && (
        <div className="glass" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Configuration status</h2>
        {health ? (
          <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li>API status: {health.status}</li>
            <li>Version: {health.version}</li>
            <li>Author: {health.author}</li>
            <li>GitHub integration: {health.configured.github ? 'Configured' : 'NOT CONFIGURED'}</li>
            <li>R2 storage: {health.configured.r2 ? 'Bound' : 'NOT CONFIGURED'}</li>
            <li>KV metadata: {health.configured.kv ? 'Bound' : 'NOT CONFIGURED'}</li>
          </ul>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Waiting for health response…</p>
        )}
      </div>

      <div className="glass" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Limits & policy</h2>
        <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <li>Max upload size: {(settings?.maxUploadBytes as number) ? `${Number(settings.maxUploadBytes) / (1024 * 1024)} MB` : '100 MB (default)'}</li>
          <li>Default build timeout: {(settings?.defaultTimeoutMinutes as number) || 30} minutes</li>
          <li>Artifact retention: {(settings?.artifactRetentionDays as number) || 7} days</li>
          <li>Rate limit: {(settings?.rateLimitPerMinute as number) || 10} requests / minute / IP (when configured)</li>
        </ul>
      </div>

      <div className="glass" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Required secrets</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          These must be set by the operator (Cloudflare Worker secrets / env). They are never exposed to the browser.
        </p>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem' }}>
          <li>GITHUB_TOKEN</li>
          <li>GITHUB_OWNER</li>
          <li>GITHUB_REPO</li>
          <li>Optional: ADMIN_API_KEY for protected endpoints</li>
        </ul>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          See <code>docs/DEPLOYMENT.md</code> and <code>.env.example</code>.
        </p>
      </div>
    </div>
  )
}
