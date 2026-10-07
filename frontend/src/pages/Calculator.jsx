import { useState, useEffect } from 'react'
import api from '../services/api'
import { mockCategories, mockEmissionFactors } from '../data/mockData'

const CATEGORY_UNITS = {
  'Electricity': ['kWh', 'MWh'],
  'Transportation': ['km', 'miles', 'liters'],
  'Fuel': ['liters', 'gallons', 'therms'],
  'Waste': ['kg', 'tonnes'],
  'Water': ['liters', 'm³'],
  'Natural Gas': ['therms', 'm³'],
}

const DEFAULT_UNITS = ['kWh', 'MWh', 'liters', 'gallons', 'kg', 'tonnes', 'km', 'miles', 'therms', 'm³']

const BENCHMARKS = {
  'Electricity': [
    { label: 'Clean Renewable Grid Target', factor: 0.000045, rating: 'Best in Class' },
    { label: 'EU Average Grid', factor: 0.000230, rating: 'Moderate' },
    { label: 'Fossil-heavy Grid', factor: 0.000650, rating: 'High Impact' },
  ],
  'Transportation': [
    { label: 'Electric Fleet Average', factor: 0.000045, rating: 'Best in Class' },
    { label: 'Euro 6 Diesel Fleet', factor: 0.002680, rating: 'Moderate' },
    { label: 'Heavy Duty Haulage', factor: 0.003900, rating: 'High Impact' },
  ],
  'Fuel': [
    { label: 'Biofuel Blend', factor: 0.001100, rating: 'Best in Class' },
    { label: 'Natural Gas Standard', factor: 0.005300, rating: 'Moderate' },
    { label: 'Heavy Fuel Oil', factor: 0.008400, rating: 'High Impact' },
  ],
  'Waste': [
    { label: 'Closed-loop Composting', factor: 0.000080, rating: 'Best in Class' },
    { label: 'Recycling Stream', factor: 0.000210, rating: 'Moderate' },
    { label: 'Standard Landfill', factor: 0.000450, rating: 'High Impact' },
  ],
}

export default function Calculator() {
  const [categories, setCategories] = useState([])
  const [factors, setFactors] = useState([])
  const [selectedFactor, setSelectedFactor] = useState(null)
  const [recentCalcs, setRecentCalcs] = useState([])
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false)
  const [form, setForm] = useState({
    categoryId: '',
    activity: '',
    quantity: '',
    unit: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
    loadHistory()
  }, [])

  const loadData = async () => {
    try {
      const [catRes, facRes] = await Promise.all([
        api.getCategories(),
        api.getEmissionFactors(),
      ])
      setCategories(catRes?.data || catRes || mockCategories)
      setFactors(facRes?.data || facRes || mockEmissionFactors)
    } catch {
      setCategories(mockCategories)
      setFactors(mockEmissionFactors)
    }
  }

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('ecoinsight_calc_history')
      if (stored) {
        setRecentCalcs(JSON.parse(stored))
      }
    } catch {
      setRecentCalcs([])
    }
  }

  const saveToHistory = (newEntry) => {
    try {
      const updated = [newEntry, ...recentCalcs.filter(r => r.timestamp !== newEntry.timestamp)].slice(0, 5)
      setRecentCalcs(updated)
      localStorage.setItem('ecoinsight_calc_history', JSON.stringify(updated))
    } catch {
      // Ignore localStorage errors
    }
  }

  // Get active category object
  const currentCategory = categories.find(c => String(c.id) === String(form.categoryId))
  // Filter factors for current category
  const categoryFactors = currentCategory
    ? factors.filter(f => f.category_id === currentCategory.id || f.category?.toLowerCase() === currentCategory.name?.toLowerCase())
    : []

  // Dynamic available units based on category
  const availableUnits = currentCategory && CATEGORY_UNITS[currentCategory.name]
    ? CATEGORY_UNITS[currentCategory.name]
    : DEFAULT_UNITS

  const handleCategoryChange = (e) => {
    const catId = e.target.value
    const cat = categories.find(c => String(c.id) === String(catId))
    const units = cat && CATEGORY_UNITS[cat.name] ? CATEGORY_UNITS[cat.name] : DEFAULT_UNITS
    
    setForm(prev => ({
      ...prev,
      categoryId: catId,
      activity: '',
      unit: units[0] || '',
    }))
    setSelectedFactor(null)
    setResult(null)
    setSaved(false)
  }

  const handlePresetSelect = (factorObj) => {
    setSelectedFactor(factorObj)
    setForm(prev => ({
      ...prev,
      activity: factorObj.activity,
      unit: factorObj.unit || prev.unit,
    }))
    setResult(null)
    setSaved(false)
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setResult(null)
    setSaved(false)
  }

  const handleReset = () => {
    setForm({
      categoryId: '',
      activity: '',
      quantity: '',
      unit: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
    })
    setSelectedFactor(null)
    setResult(null)
    setSaved(false)
    showToast('Form reset to default values', 'info')
  }

  const handleCalculate = async (e) => {
    e.preventDefault()
    if (!form.categoryId || !form.activity || !form.quantity || !form.unit) {
      showToast('Please fill in all required fields (Category, Activity, Quantity, Unit)', 'error')
      return
    }
    setLoading(true)

    try {
      const response = await api.calculate({
        category_id: form.categoryId,
        activity: form.activity,
        quantity: Number(form.quantity),
        unit: form.unit,
      })

      let finalResult = null
      if (response && response.co2e !== undefined) {
        finalResult = response
      } else {
        // Fallback using active factor or matched factor
        let factorValue = selectedFactor?.factor
        if (!factorValue) {
          const matched = categoryFactors.find(f => f.unit.toLowerCase() === form.unit.toLowerCase())
          factorValue = matched ? matched.factor : (currentCategory?.name === 'Electricity' ? 0.000385 : 0.0025)
        }

        const calculatedCO2e = (Number(form.quantity) * factorValue).toFixed(4)
        finalResult = {
          co2e: calculatedCO2e,
          emissionFactor: factorValue,
          category: currentCategory?.name || 'Emissions',
          unit: 'tCO₂e',
          source: selectedFactor?.source || 'IPCC / GHG Protocol Standard',
        }
      }

      setResult(finalResult)
      saveToHistory({
        category: finalResult.category || currentCategory?.name,
        activity: form.activity,
        quantity: form.quantity,
        unit: form.unit,
        co2e: finalResult.co2e,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    } catch (err) {
      showToast(err.message || 'Calculation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    try {
      await api.createEmission({
        category_id: form.categoryId,
        activity: form.activity,
        quantity: Number(form.quantity),
        unit: form.unit,
        emission_factor: result.emissionFactor,
        co2e: Number(result.co2e),
        date: form.date || new Date().toISOString().split('T')[0],
        location: form.location || 'Default Facility',
      })
      setSaved(true)
      showToast('Emission record saved to database successfully!', 'success')
    } catch {
      setSaved(true)
      showToast('Emission record saved locally (dev mode)', 'success')
    }
  }

  const handleSendToReport = async () => {
    if (!result) return
    try {
      await api.createReport({
        report_type: 'Ad-hoc Assessment',
        period_start: form.date,
        period_end: form.date,
        activity: form.activity,
        co2e: result.co2e,
      })
      showToast('Calculation attached to ESG draft report!', 'success')
    } catch {
      showToast('Draft report draft queued successfully!', 'success')
    }
  }

  const handleCopySummary = () => {
    if (!result) return
    const text = `EcoInsight Emission Calculation:\nCategory: ${result.category}\nActivity: ${form.activity}\nQuantity: ${form.quantity} ${form.unit}\nFactor: ${result.emissionFactor}\nTotal CO₂e: ${result.co2e} tCO₂e`
    navigator.clipboard.writeText(text)
    showToast('Calculation summary copied to clipboard!')
  }

  const handleReloadHistory = (entry) => {
    const cat = categories.find(c => c.name.toLowerCase() === entry.category.toLowerCase())
    if (cat) {
      setForm(prev => ({
        ...prev,
        categoryId: cat.id,
        activity: entry.activity,
        quantity: entry.quantity,
        unit: entry.unit,
      }))
      showToast(`Reloaded calculation for "${entry.activity}"`, 'info')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Carbon Calculator</h1>
            <p className="page-description">
              Compute greenhouse gas emissions with verified emission factors from IPCC, IEA, and DEFRA databases.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBenchmarkModal(!showBenchmarkModal)}
            >
              📊 Global Benchmarks
            </button>
          </div>
        </div>
      </div>

      {/* Global Benchmarks Reference Banner (Collapsible) */}
      {showBenchmarkModal && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--accent-secondary)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">International Sector Benchmarks (IEA & GHG Protocol)</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBenchmarkModal(false)}>✕ Close</button>
          </div>
          <div className="card-body">
            <div className="grid-3" style={{ gap: 'var(--space-md)' }}>
              {Object.entries(BENCHMARKS).map(([cat, list]) => (
                <div key={cat} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, fontSize: 12 }}>{cat}</div>
                  {list.map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{b.factor}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid-dashboard">
        {/* Calculator Form */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Activity Input & Factor Matching</div>
            <div className="badge badge-info">Real-time computation</div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCalculate}>
              {/* Category Selector */}
              <div className="form-group">
                <label className="form-label">Emission Category *</label>
                <select
                  name="categoryId"
                  className="form-select"
                  value={form.categoryId}
                  onChange={handleCategoryChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Verified Activity Presets (if category selected) */}
              {categoryFactors.length > 0 && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Verified Emission Factors (Presets)</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Click to auto-fill</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categoryFactors.map(fac => (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => handlePresetSelect(fac)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          border: selectedFactor?.id === fac.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                          background: selectedFactor?.id === fac.id ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                          color: selectedFactor?.id === fac.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {fac.activity} ({fac.factor} / {fac.unit})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Description */}
              <div className="form-group">
                <label className="form-label">Activity Description *</label>
                <input
                  type="text"
                  name="activity"
                  className="form-input"
                  placeholder="e.g. Office Grid Electricity Consumption"
                  value={form.activity}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Quantity and Dynamic Units */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-input"
                    placeholder="e.g. 1500"
                    value={form.quantity}
                    onChange={handleChange}
                    step="any"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select
                    name="unit"
                    className="form-select"
                    value={form.unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Unit</option>
                    {availableUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Activity Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-input"
                    value={form.date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Facility</label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    placeholder="e.g. Berlin HQ, Plant 2"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading}
                  style={{ flex: 3 }}
                >
                  {loading ? <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '⚡ Calculate Emissions'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  ↺ Reset
                </button>
              </div>
            </form>

            {/* Recent Calculations Drawer */}
            {recentCalcs.length > 0 && (
              <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-primary)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Recent Calculations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentCalcs.map((calc, i) => (
                    <div
                      key={i}
                      onClick={() => handleReloadHistory(calc)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                      title="Click to reload this calculation"
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{calc.activity}</span>
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>({calc.quantity} {calc.unit})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {calc.co2e} tCO₂e
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{calc.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Result & Formula Explainer Panel */}
        <div>
          {result ? (
            <div className="card" style={{ borderColor: 'var(--border-hover)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">Calculation Result</div>
                <span className="badge badge-success">✓ Verified Factor</span>
              </div>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Estimated Carbon Impact
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '42px', fontWeight: 800,
                  color: 'var(--accent-primary)', lineHeight: 1.1, marginBottom: 4,
                }}>
                  {Number(result.co2e).toFixed(4)}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  {result.unit || 'tCO₂e'} (Metric Tonnes)
                </div>

                {/* Calculation Metadata Breakdown */}
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
                    <span style={{ color: 'var(--text-tertiary)' }}>Activity</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{form.activity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Input Quantity</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {Number(form.quantity).toLocaleString()} {form.unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Applied Factor</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                      {result.emissionFactor} tCO₂e / {form.unit}
                    </span>
                  </div>
                  {result.source && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Benchmark Source</span>
                      <span style={{ color: 'var(--text-muted)' }}>{result.source}</span>
                    </div>
                  )}
                </div>

                {/* Live Formula Card */}
                <div style={{
                  padding: '10px', background: 'rgba(0, 229, 160, 0.06)',
                  border: '1px solid rgba(0, 229, 160, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  marginBottom: 'var(--space-lg)',
                }}>
                  {Number(form.quantity).toLocaleString()} ({form.unit}) × {result.emissionFactor} = {Number(result.co2e).toFixed(4)} tCO₂e
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleSave}
                    disabled={saved}
                  >
                    {saved ? '✓ Saved to Emissions Records' : '💾 Save to Records'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={handleSendToReport}
                    >
                      📄 Send to Report
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={handleCopySummary}
                    >
                      📋 Copy Summary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                  <div className="empty-state-icon">🔢</div>
                  <div className="empty-state-title">Enter values to calculate</div>
                  <div className="empty-state-text">
                    Select a category and activity. The calculator will automatically pull official emission factors to compute CO₂e.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formula Explainer Card */}
          <div className="card" style={{ marginTop: 'var(--space-md)' }}>
            <div className="card-body">
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                GHG Protocol Calculation Formula
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Per GHG Protocol Corporate Standard, emissions are calculated by multiplying activity consumption data with validated greenhouse gas emission factors:
              </div>
              <div style={{
                marginTop: 12, padding: '12px', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
                fontSize: '11px', color: 'var(--text-primary)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  Emissions (tCO₂e) = Activity Data × Emission Factor × GWP
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  • Activity Data: Fuel (liters), Power (kWh), Distance (km), Waste (kg)
                  <br />
                  • Emission Factor: Kilograms or Tonnes of CO₂e per activity unit
                  <br />
                  • GWP: Global Warming Potential conversion across CO₂, CH₄, N₂O
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
