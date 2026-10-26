import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { HealthResponse } from '../types'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/new', label: 'New Build' },
  { to: '/builds', label: 'Build History' },
  { to: '/artifacts', label: 'Artifacts' },
  { to: '/settings', label: 'Settings' },
  { to: '/docs', label: 'Documentation' },
]

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = () => {
      api
        .health()
        .then((h) => {
          if (!cancelled) {
            setHealth(h)
            setHealthError(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHealth(null)
            setHealthError(true)
          }
        })
    }
    check()
    const t = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const connectionLabel = healthError
    ? 'Disconnected'
    : health
      ? 'Connected'
      : 'Checking…'

  const connectionClass = healthError
    ? 'conn-bad'
    : health
      ? 'conn-ok'
      : 'conn-pending'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="#3b82f6" strokeWidth="2" />
              <path d="M10 16h12M16 10v12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="16" r="3" fill="#3b82f6" />
            </svg>
            <div>
              <span className="logo-title">GitHub Action Machine</span>
              <span className="logo-sub">GTM · by KingBrezz</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className={`connection ${connectionClass}`}>
            <span className="dot" />
            {connectionLabel}
          </span>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'nav-item active' : 'nav-item'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span>Author: KingBrezz</span>
            <span className="version">v1.0.0</span>
          </div>
        </aside>

        <main className="main">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
