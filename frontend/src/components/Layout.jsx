import { useContext } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AuthContext } from '../App'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/emissions', label: 'Emissions Hub', icon: '🏭' },
  { path: '/calculator', label: 'Carbon Calculator', icon: '🔢' },
  { path: '/analytics', label: 'Analytics & Insights', icon: '📈' },
  { path: '/forecast', label: 'Predictive AI & Forecast', icon: '🔮' },
  { path: '/reports', label: 'Reports & Audit', icon: '📋' },
]

export default function Layout() {
  const { user, logout } = useContext(AuthContext)
  const location = useLocation()

  const getCurrentPageName = () => {
    const item = navItems.find(n => n.path === location.pathname)
    return item ? item.label : 'Dashboard'
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌿</div>
          <div className="sidebar-logo-text">
            <h3>EcoInsight OS</h3>
            <p>Enterprise Cloud ⚙</p>
          </div>
        </div>

        <div className="sidebar-section-label">Platform Telemetry</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-runtime">
            <span className="dot"></span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kernel Runtime</div>
              <div style={{ marginTop: 2 }}>C++ Scheduler • 4 Workers (RR/Prio)</div>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontWeight: 600 }}>12ms</span>
          </div>

          <NavLink to="/profile" className="sidebar-link" style={{ marginTop: 4 }}>
            <span className="sidebar-link-icon">⚙</span>
            <span>Settings & Org</span>
          </NavLink>

          <div className="sidebar-user" onClick={logout} title="Click to logout">
            <div className="sidebar-user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <p>{user?.name || 'User'}</p>
              <p>{user?.organization || 'Organization'}</p>
            </div>
            <span style={{ fontSize: '14px', cursor: 'pointer' }}>↗</span>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <span>Organization</span>
              <span>/</span>
              <span className="current">{user?.organization || 'Acme Corp'}</span>
            </div>

            <div className="topbar-status">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `topbar-status-item ${isActive ? '' : ''}`
                }
                style={{ textDecoration: 'none', color: 'inherit', fontWeight: location.pathname === '/dashboard' ? 700 : 400, borderColor: location.pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--border-primary)' }}
              >
                <span className="topbar-status-dot"></span>
                Dashboard
              </NavLink>

              <div className="topbar-status-item">
                <span style={{ color: 'var(--accent-primary)' }}>PostgreSQL:</span> 99.98% uptime
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-status-item">
              📅 Q3 2026 (YTD)
            </div>
            <button className="btn btn-secondary btn-sm">
              ⚡ Run Calculator
            </button>
            <NavLink to="/emissions" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              + Log Emission
            </NavLink>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
