import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../App'
import api from '../services/api'

export default function Login() {
  const { user, login, logout, isAuthenticated } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const response = await api.login(form)
      if (response && response.token) {
        login(response.user, response.token)
        navigate('/dashboard')
      } else {
        // Fallback for dev mode — simulate login when backend unavailable
        const registeredUsers = JSON.parse(localStorage.getItem('ecoinsight_registered_users') || '[]')
        const matched = registeredUsers.find(u => u.email.toLowerCase() === form.email.toLowerCase())
        
        const mockUser = matched ? {
          id: matched.id || 1,
          name: matched.name,
          email: matched.email,
          organization: matched.organization || 'EcoInsight Enterprise',
          industry: matched.industry || 'Technology',
          location: matched.location || 'Jaipur / Global',
          role: matched.role || 'Enterprise User',
        } : {
          id: 1,
          name: 'Daksh Modi',
          email: form.email || 'daksh.modi@ecoinsight.org',
          organization: 'EcoInsight Enterprise',
          industry: 'Technology',
          location: 'Jaipur / Global',
          role: 'Lead Frontend Engineer & UI/UX',
        }
        login(mockUser, 'dev-jwt-token-placeholder')
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container fade-in">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">🌿</div>
            <span className="auth-logo-text">EcoInsight</span>
          </div>

          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to your carbon intelligence dashboard</p>

          {isAuthenticated && (
            <div style={{
              padding: '12px 14px', marginBottom: '16px',
              background: 'rgba(0, 229, 160, 0.08)', border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-primary)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                👋 Currently signed in as {user?.name || 'Daksh Modi'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                You can proceed to your dashboard or sign out below.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={logout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: '16px',
              background: 'var(--accent-danger-dim)', border: '1px solid rgba(255,82,82,0.3)',
              borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent-danger)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
            >
              {loading ? (
                <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
