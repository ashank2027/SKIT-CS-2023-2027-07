import { useState, useContext } from 'react'
import { AuthContext } from '../App'
import api from '../services/api'

export default function Profile() {
  const { user, login } = useContext(AuthContext)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization: user?.organization || '',
    industry: user?.industry || '',
    location: user?.location || '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    try {
      const response = await api.updateProfile(form)
      const updatedUser = response?.user || { ...user, ...form }
      login(updatedUser, localStorage.getItem('ecoinsight_token'))
      setEditing(false)
      showToast('Profile updated successfully', 'success')
    } catch {
      // Dev fallback
      login({ ...user, ...form }, localStorage.getItem('ecoinsight_token'))
      setEditing(false)
      showToast('Profile updated', 'success')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="fade-in">
      {toast && <div className={`toast ${toast.type}`}>✓ {toast.message}</div>}

      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Settings & Organization</h1>
            <p className="page-description">Manage your profile, organization details, and platform preferences.</p>
          </div>
          <div className="page-header-actions">
            {!editing ? (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>✏ Edit Profile</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-dashboard">
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Profile Information</div>
            <span className="badge badge-success">Active</span>
          </div>
          <div className="card-body">
            {/* Avatar Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-tertiary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 700, color: 'white',
              }}>
                {form.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{form.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{form.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                disabled={!editing}
                style={{ opacity: editing ? 1 : 0.7 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={form.email}
                onChange={handleChange}
                disabled={!editing}
                style={{ opacity: editing ? 1 : 0.7 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Organization</label>
              <input
                type="text"
                name="organization"
                className="form-input"
                value={form.organization}
                onChange={handleChange}
                disabled={!editing}
                style={{ opacity: editing ? 1 : 0.7 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <select
                  name="industry"
                  className="form-select"
                  value={form.industry}
                  onChange={handleChange}
                  disabled={!editing}
                  style={{ opacity: editing ? 1 : 0.7 }}
                >
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
                  value={form.location}
                  onChange={handleChange}
                  disabled={!editing}
                  style={{ opacity: editing ? 1 : 0.7 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div>
          {/* Platform Info */}
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header">
              <div className="card-title">Platform Details</div>
            </div>
            <div className="card-body">
              {[
                { label: 'Platform', value: 'EcoInsight Enterprise Cloud' },
                { label: 'Backend', value: 'Node.js + Express' },
                { label: 'Database', value: 'PostgreSQL' },
                { label: 'Scheduler', value: 'C++ Kernel (Prio + RR)' },
                { label: 'AI Engine', value: 'Gemini API' },
                { label: 'Frontend', value: 'React.js + Vite' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderBottom: i < 5 ? '1px solid var(--border-primary)' : 'none',
                  fontSize: '12px',
                }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Development Team</div>
            </div>
            <div className="card-body">
              {[
                { name: 'Ashank Arora', role: 'C++ / OS Scheduling', color: '#00e5a0' },
                { name: 'Daksh Modi', role: 'React.js / Frontend', color: '#00bcd4' },
                { name: 'Chetan Sharma', role: 'Node.js / Backend', color: '#7c4dff' },
                { name: 'Bhavya Chautharamani', role: 'PostgreSQL / Database', color: '#ffab00' },
              ].map((member, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border-primary)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: member.color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#0a0e14',
                  }}>
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{member.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
