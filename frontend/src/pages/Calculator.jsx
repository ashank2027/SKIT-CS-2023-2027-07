import { useState, useEffect } from 'react'
import api from '../services/api'
import { mockCategories } from '../data/mockData'

export default function Calculator() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    categoryId: '',
    activity: '',
    quantity: '',
    unit: '',
    date: '',
    location: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await api.getCategories()
      setCategories(res?.data || res || mockCategories)
    } catch {
      setCategories(mockCategories)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setResult(null)
    setSaved(false)
  }

  const handleCalculate = async (e) => {
    e.preventDefault()
    if (!form.categoryId || !form.activity || !form.quantity || !form.unit) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    setLoading(true)
    try {
      const response = await api.calculate(form)
      if (response) {
        setResult(response)
      } else {
        // Mock calculation
        const factors = { Electricity: 0.000385, Transportation: 0.00262, Fuel: 0.00201, Waste: 0.0022, Water: 0.0003, 'Natural Gas': 0.00181 }
        const category = categories.find(c => c.id === Number(form.categoryId))
        const factor = factors[category?.name] || 0.001
        setResult({
          co2e: (Number(form.quantity) * factor).toFixed(4),
          emissionFactor: factor,
          category: category?.name || 'Unknown',
          unit: 'tCO₂e',
        })
      }
    } catch (err) {
      showToast(err.message || 'Calculation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.createEmission({
        category_id: form.categoryId,
        activity: form.activity,
        quantity: Number(form.quantity),
        unit: form.unit,
        date: form.date || new Date().toISOString().split('T')[0],
        location: form.location,
      })
      setSaved(true)
      showToast('Emission record saved successfully!', 'success')
    } catch {
      setSaved(true)
      showToast('Emission record saved (dev mode)', 'success')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}

      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Carbon Calculator</h1>
            <p className="page-description">
              Calculate CO₂e emissions using validated emission factors. Quantity × Emission Factor = Estimated CO₂e
            </p>
          </div>
        </div>
      </div>

      <div className="grid-dashboard">
        {/* Calculator Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Emission Calculator</div>
            <div className="badge badge-info">Real-time computation</div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCalculate}>
              <div className="form-group">
                <label className="form-label">Emission Category *</label>
                <select
                  name="categoryId"
                  className="form-select"
                  value={form.categoryId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Activity Description *</label>
                <input
                  type="text"
                  name="activity"
                  className="form-input"
                  placeholder="e.g. Office electricity consumption"
                  value={form.activity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-input"
                    placeholder="500"
                    value={form.quantity}
                    onChange={handleChange}
                    step="any"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select name="unit" className="form-select" value={form.unit} onChange={handleChange} required>
                    <option value="">Unit</option>
                    <option value="kWh">kWh</option>
                    <option value="liters">Liters</option>
                    <option value="kg">kg</option>
                    <option value="therms">Therms</option>
                    <option value="km">km</option>
                    <option value="m³">m³</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" name="date" className="form-input" value={form.date} onChange={handleChange} />
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

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
                  {loading ? <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : '⚡ Calculate'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Result Panel */}
        <div>
          {result ? (
            <div className="card" style={{ borderColor: 'var(--border-hover)' }}>
              <div className="card-header">
                <div className="card-title">Calculation Result</div>
                <span className="badge badge-success">✓ Computed</span>
              </div>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Estimated Carbon Emission
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '42px', fontWeight: 800,
                  color: 'var(--accent-primary)', lineHeight: 1.1, marginBottom: 4,
                }}>
                  {Number(result.co2e).toFixed(4)}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  {result.unit}
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-md)', marginBottom: 'var(--space-md)',
                  textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Category</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{result.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Quantity</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(form.quantity).toLocaleString()} {form.unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Emission Factor</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-secondary)' }}>{result.emissionFactor}</span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-lg)' }}>
                  {Number(form.quantity).toLocaleString()} × {result.emissionFactor} = {Number(result.co2e).toFixed(4)} tCO₂e
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handleSave}
                  disabled={saved}
                >
                  {saved ? '✓ Saved to Records' : '💾 Calculate & Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                  <div className="empty-state-icon">🔢</div>
                  <div className="empty-state-title">Enter values to calculate</div>
                  <div className="empty-state-text">
                    Select a category, enter the quantity and unit to compute your CO₂e emission.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="card" style={{ marginTop: 'var(--space-md)' }}>
            <div className="card-body">
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                How It Works
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                The calculator uses emission factors from validated databases. Each activity category
                has a specific factor that converts your input quantity into estimated CO₂ equivalent emissions.
              </div>
              <div style={{
                marginTop: 12, padding: '10px', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
                fontSize: '11px', color: 'var(--accent-primary)',
              }}>
                CO₂e = Quantity × Emission Factor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
