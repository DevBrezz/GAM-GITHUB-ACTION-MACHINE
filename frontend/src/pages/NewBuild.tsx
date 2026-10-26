import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB; GitHub Contents API direct upload limit used by GTM
const PROFILES = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'node', label: 'Node.js / npm / pnpm / yarn' },
  { id: 'java-gradle', label: 'Java / Gradle' },
  { id: 'java-maven', label: 'Java / Maven' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP / Composer' },
  { id: 'dotnet', label: '.NET' },
  { id: 'cmake', label: 'C/C++ (CMake)' },
  { id: 'android', label: 'Android (Gradle)' },
  { id: 'custom', label: 'Custom command only' },
]

export default function NewBuild() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [profile, setProfile] = useState('auto')
  const [customCommand, setCustomCommand] = useState('')
  const [timeoutMinutes, setTimeoutMinutes] = useState(30)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const onFile = useCallback((f: File | null) => {
    setError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip files are accepted.')
      setFile(null)
      return
    }
    if (f.size > MAX_SIZE) {
      setError(`File exceeds maximum size of ${MAX_SIZE / (1024 * 1024)} MB.`)
      setFile(null)
      return
    }
    if (f.size === 0) {
      setError('File is empty.')
      setFile(null)
      return
    }
    setFile(f)
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !confirmed) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.createBuild(file, {
        fileName: file.name,
        fileSize: file.size,
        profile,
        customCommand: profile === 'custom' || customCommand.trim() ? customCommand.trim() : undefined,
        timeoutMinutes,
      })
      navigate(`/builds/${res.buildId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.25rem' }}>New Build</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Upload a project ZIP. The build runs on a GitHub-hosted Actions runner. Connect your private runner repository in Settings first.
      </p>

      <form onSubmit={handleSubmit} className="glass" style={{ padding: '1.5rem', maxWidth: 640 }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(59,130,246,0.08)' : 'transparent',
            marginBottom: '1.25rem',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div style={{ fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '0.5rem' }}>Drag & drop a .zip file here</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>or click to browse (max 20 MB)</div>
            </div>
          )}
        </div>

        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Build profile
        </label>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Custom build command (optional)
        </label>
        <input
          type="text"
          value={customCommand}
          onChange={(e) => setCustomCommand(e.target.value)}
          placeholder='e.g. ./gradlew --no-daemon :app:assembleRelease'
          style={{ width: '100%', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Custom commands run only on the GitHub Actions runner. Build commands execute on the runner. Only build source you trust; this is not a perfect sandbox.
        </p>

        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Timeout (minutes)
        </label>
        <input
          type="number"
          min={5}
          max={120}
          value={timeoutMinutes}
          onChange={(e) => setTimeoutMinutes(Number(e.target.value) || 30)}
          style={{ width: 120, marginBottom: '1.25rem' }}
        />

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I understand that the uploaded source will be executed on a GitHub-hosted runner and may contain untrusted code.
            I accept the security implications.
          </span>
        </label>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file || !confirmed || submitting}
          style={{ width: '100%' }}
        >
          {submitting ? (
            <>
              <span className="spinner" /> Starting build…
            </>
          ) : (
            'Start Build'
          )}
        </button>
      </form>
    </div>
  )
}
