import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../App'
import api from '../services/api'

export default function Register() {
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    industry: '',
    location: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { confirmPassword, ...registerData } = form
      const response = await api.register(registerData)
      if (response && response.token) {
        login(response.user, response.token)
        navigate('/dashboard')
      } else {
        // Dev mode fallback
        const mockUser = {
          id: 1,
          name: form.name,
          email: form.email,
          organization: form.organization || 'Acme Corp',
          industry: form.industry || 'Technology',
          location: form.location || 'Global',
        }
        login(mockUser, 'dev-jwt-token-placeholder')
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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

          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Start tracking and reducing your carbon footprint</p>

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
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Organization</label>
              <input
                type="text"
                name="organization"
                className="form-input"
                placeholder="Your company name"
                value={form.organization}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <select name="industry" className="form-select" value={form.industry} onChange={handleChange}>
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Energy">Energy</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  name="location"
                  className="form-input"
                  placeholder="City, Country"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
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
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
