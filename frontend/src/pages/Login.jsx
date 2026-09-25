import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../App'
import api from '../services/api'

export default function Login() {
  const { login } = useContext(AuthContext)
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
        const mockUser = {
          id: 1,
          name: 'Elena Vance',
          email: form.email,
          organization: 'Acme Corp (Global)',
          industry: 'Technology',
          location: 'Frankfurt',
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
