export default function Docs() {
  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Documentation</h1>
      <div className="glass" style={{ padding: '1.5rem', maxWidth: 720 }}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Full documentation lives in the repository under <code>docs/</code>.
        </p>
        <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <li><strong>INSTALLATION.md</strong> — local setup</li>
          <li><strong>DEPLOYMENT.md</strong> — Cloudflare Worker, R2, KV, GitHub Pages</li>
          <li><strong>SECURITY.md</strong> — threat model and required controls</li>
          <li><strong>TROUBLESHOOTING.md</strong> — common failures</li>
          <li><strong>API.md</strong> — HTTP API contract</li>
        </ul>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Product: GitHub Action Machine (GTM)<br />
          Author: KingBrezz<br />
          Description: Universal Build Automation Platform Powered by GitHub Actions.
        </p>
      </div>
    </div>
  )
}
