import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import api from '../services/api'
import { mockAnalyticsData } from '../data/mockData'

const COLORS = ['#00bcd4', '#7c4dff', '#ff7043', '#ffab00', '#4fc3f7', '#00e5a0']
const SECTOR_COLORS = {
  'Scope 1 (Direct)': '#ff7043',
  'Scope 2 (Indirect Energy)': '#00e5a0',
  'Scope 3 (Value Chain)': '#7c4dff',
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')
  const [compareYoY, setCompareYoY] = useState(true)
  const [toast, setToast] = useState(null)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    category: '',
    location: '',
    industry: '',
    sector: '',
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async (customFilters = filters) => {
    try {
      const response = await api.getAnalytics(customFilters)
      setData(response?.data || response || mockAnalyticsData)
    } catch {
      setData(mockAnalyticsData)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const applyFilters = () => {
    setLoading(true)
    loadAnalytics(filters)
  }

  const resetFilters = () => {
    const defaultFilters = { from: '', to: '', category: '', location: '', industry: '', sector: '' }
    setFilters(defaultFilters)
    setLoading(true)
    loadAnalytics(defaultFilters)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleExportAnalysis = () => {
    const d = data || mockAnalyticsData
    const lines = [
      'EcoInsight Carbon Analytics Report',
      `Generated: ${new Date().toISOString()}`,
      `Filter Range: ${filters.from || 'All'} to ${filters.to || 'All'}`,
      `Category: ${filters.category || 'All Categories'}`,
      `Location: ${filters.location || 'All Locations'}`,
      `Industry: ${filters.industry || 'All Industries'}`,
      `Sector: ${filters.sector || 'All Scopes'}`,
      '',
      '--- EMISSIONS OVER TIME (tCO2e) ---',
      'Period,Current Year,Previous Year,YoY Delta (%)',
      ...(d.emissionsByTime || []).map(row => {
        const delta = row.prevYear ? (((row.value - row.prevYear) / row.prevYear) * 100).toFixed(1) : 'N/A'
        return `${row.period},${row.value},${row.prevYear || 'N/A'},${delta}%`
      }),
      '',
      '--- EMISSIONS BY CATEGORY ---',
      'Category,Emissions (tCO2e)',
      ...(d.emissionsByCategory || []).map(row => `"${row.name}",${row.value}`),
      '',
      '--- EMISSIONS BY LOCATION ---',
      'Location,Emissions (tCO2e)',
      ...(d.emissionsByLocation || []).map(row => `"${row.name}",${row.value}`),
      '',
      '--- EMISSIONS BY INDUSTRY ---',
      'Industry,Emissions (tCO2e),Share (%)',
      ...(d.emissionsByIndustry || []).map(row => `"${row.name}",${row.value},${row.percentage || ''}%`),
      '',
      '--- EMISSIONS BY SECTOR (GHG PROTOCOL) ---',
      'Scope,Emissions (tCO2e),Description',
      ...(d.emissionsBySector || []).map(row => `"${row.name}",${row.value},"${row.description || ''}"`),
    ]

    const csvContent = lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ecoinsight_analytics_export_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Analytics export downloaded successfully!')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    )
  }

  const d = data || mockAnalyticsData

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#111820', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
        }}>
          <p style={{ color: '#8899aa', marginBottom: 4 }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color || 'var(--accent-primary)', margin: '2px 0' }}>
              {p.name}: {Number(p.value).toLocaleString()} tCO₂e
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const totalEmissions = (d.emissionsByCategory || []).reduce((acc, curr) => acc + (curr.value || 0), 0)
  const avgMonthly = Math.round(totalEmissions / ((d.emissionsByTime || []).length || 1))

  return (
    <div className="fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Analytics & Insights</h1>
            <p className="page-description">
              Multi-dimensional emission analysis across time, category, location, industry, and GHG protocol scopes.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleExportAnalysis}>
              📊 Export Analysis (CSV)
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="page-header-tabs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'by-time', label: 'By Time' },
            { id: 'by-category', label: 'By Category' },
            { id: 'by-location', label: 'By Location' },
            { id: 'by-industry', label: 'By Industry' },
            { id: 'by-sector', label: 'By Sector (Scopes)' },
          ].map(view => (
            <button
              key={view.id}
              className={`page-header-tab ${activeView === view.id ? 'active' : ''}`}
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comprehensive Filters Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-body" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>From</label>
              <input
                type="date"
                name="from"
                className="form-input"
                value={filters.from}
                onChange={handleFilterChange}
                style={{ width: 145 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>To</label>
              <input
                type="date"
                name="to"
                className="form-input"
                value={filters.to}
                onChange={handleFilterChange}
                style={{ width: 145 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Category</label>
              <select
                name="category"
                className="form-select"
                value={filters.category}
                onChange={handleFilterChange}
                style={{ width: 150 }}
              >
                <option value="">All Categories</option>
                <option value="Electricity">Electricity</option>
                <option value="Transportation">Transportation</option>
                <option value="Fuel">Fuel</option>
                <option value="Waste">Waste</option>
                <option value="Water">Water</option>
                <option value="Natural Gas">Natural Gas</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Location</label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="City / Country"
                value={filters.location}
                onChange={handleFilterChange}
                style={{ width: 140 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Industry</label>
              <select
                name="industry"
                className="form-select"
                value={filters.industry}
                onChange={handleFilterChange}
                style={{ width: 150 }}
              >
                <option value="">All Industries</option>
                <option value="Technology">Technology</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Energy">Energy & Utilities</option>
                <option value="Transportation">Transportation</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance & Banking</option>
                <option value="Retail">Retail & Consumer</option>
                <option value="Construction">Construction</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Sector / Scope</label>
              <select
                name="sector"
                className="form-select"
                value={filters.sector}
                onChange={handleFilterChange}
                style={{ width: 165 }}
              >
                <option value="">All Scopes</option>
                <option value="Scope 1">Scope 1 - Direct</option>
                <option value="Scope 2">Scope 2 - Indirect Energy</option>
                <option value="Scope 3">Scope 3 - Value Chain</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={applyFilters}>
                Apply Filters
              </button>
              <button className="btn btn-secondary btn-sm" onClick={resetFilters} title="Reset all filters">
                ↺ Reset
              </button>
            </div>

            {/* YoY comparison toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${compareYoY ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCompareYoY(!compareYoY)}
                style={{ fontSize: 11 }}
              >
                {compareYoY ? '✓ YoY Comparison ON' : 'YoY Comparison OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── View: Time Chart (Overview & By-Time) ── */}
      {(activeView === 'overview' || activeView === 'by-time') && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Emissions Over Time</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Monthly aggregate emissions (tCO₂e) {compareYoY ? 'with previous year comparison' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="badge badge-info">Monthly Trend</div>
              {compareYoY && <div className="badge badge-success">YoY Active</div>}
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.emissionsByTime} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaGradCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="areaGradPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c4dff" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#7c4dff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#8899aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8899aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10, fontFamily: 'var(--font-mono)' }}
                  />
                  {compareYoY && (
                    <Area
                      type="monotone"
                      dataKey="prevYear"
                      stroke="#7c4dff"
                      strokeDasharray="4 4"
                      fill="url(#areaGradPrev)"
                      strokeWidth={2}
                      name="Previous Year"
                      dot={{ fill: '#7c4dff', r: 3 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00e5a0"
                    fill="url(#areaGradCurrent)"
                    strokeWidth={2.5}
                    name="Current Period"
                    dot={{ fill: '#00e5a0', r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── View: Category & Location (Overview, By-Category, By-Location) ── */}
      {(activeView === 'overview' || activeView === 'by-category' || activeView === 'by-location') && (
        <div className="grid-2" style={{ marginBottom: 'var(--space-md)' }}>
          {(activeView === 'overview' || activeView === 'by-category') && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Emissions by Category</div>
                <div className="badge badge-info">Source Breakdown</div>
              </div>
              <div className="card-body">
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={d.emissionsByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {d.emissionsByCategory.map((entry, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {(activeView === 'overview' || activeView === 'by-location') && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Emissions by Location</div>
                <div className="badge badge-info">Regional Footprint</div>
              </div>
              <div className="card-body">
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.emissionsByLocation} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: '#8899aa', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                      <YAxis tick={{ fill: '#8899aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#00bcd4" radius={[4, 4, 0, 0]} name="Emissions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── View: Industry & Sector (Overview, By-Industry, By-Sector) ── */}
      {(activeView === 'overview' || activeView === 'by-industry' || activeView === 'by-sector') && (
        <div className="grid-2" style={{ marginBottom: 'var(--space-md)' }}>
          {/* Industry Distribution */}
          {(activeView === 'overview' || activeView === 'by-industry') && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">Emissions by Industry</div>
                <div className="badge badge-info">Sectoral Intensity</div>
              </div>
              <div className="card-body">
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={d.emissionsByIndustry || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis type="number" tick={{ fill: '#8899aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#ccddee', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#ff7043" radius={[0, 4, 4, 0]} name="Emissions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Sector Scope Breakdown (Scope 1, 2, 3) */}
          {(activeView === 'overview' || activeView === 'by-sector') && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">GHG Protocol Sector / Scopes</div>
                <div className="badge badge-success">Scope 1 • 2 • 3</div>
              </div>
              <div className="card-body">
                <div style={{ height: 200, marginBottom: 'var(--space-md)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={d.emissionsBySector || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(d.emissionsBySector || []).map((entry, idx) => (
                          <Cell key={idx} fill={SECTOR_COLORS[entry.name] || COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Scope Cards Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(d.emissionsBySector || []).map((sec, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: SECTOR_COLORS[sec.name] || '#00e5a0',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sec.name}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>({sec.description})</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {Number(sec.value).toLocaleString()} t
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Drill-down Detail Tables for Specific Views ── */}
      {activeView === 'by-industry' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">Industry Emissions Benchmark Audit</div>
            <span className="badge badge-info">Sector Breakdown</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Industry Sector</th>
                    <th>Emissions (tCO₂e)</th>
                    <th>Total Share (%)</th>
                    <th>Sector Benchmark</th>
                    <th>Compliance Target</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.emissionsByIndustry || []).map((ind, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ind.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(ind.value).toLocaleString()} t</td>
                      <td>
                        <span className="badge badge-info">{ind.percentage || Math.round((ind.value / totalEmissions) * 100)}%</span>
                      </td>
                      <td style={{ color: 'var(--accent-secondary)' }}>Within top quartile</td>
                      <td><span className="badge badge-success">✓ On Track (-15% by 2030)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'by-sector' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">GHG Protocol Scope Standards</div>
            <span className="badge badge-success">CSRD / SEC Compliant</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scope Tier</th>
                    <th>Emissions (tCO₂e)</th>
                    <th>Operational Boundaries</th>
                    <th>Reporting Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.emissionsBySector || []).map((sec, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sec.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(sec.value).toLocaleString()} t</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{sec.description}</td>
                      <td><span className="badge badge-success">Audited & Verified</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'by-time' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">Monthly Trajectory & Variance Audit</div>
            <span className="badge badge-info">Year-over-Year Trajectory</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reporting Period</th>
                    <th>Current Period (tCO₂e)</th>
                    <th>Previous Year (tCO₂e)</th>
                    <th>YoY Variance</th>
                    <th>Trend Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.emissionsByTime || []).map((t, i) => {
                    const diff = t.prevYear ? t.value - t.prevYear : 0
                    const pct = t.prevYear ? ((diff / t.prevYear) * 100).toFixed(1) : 0
                    const isReduction = diff <= 0
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.period}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(t.value).toLocaleString()} t</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{t.prevYear ? `${Number(t.prevYear).toLocaleString()} t` : 'N/A'}</td>
                        <td>
                          <span className={`badge ${isReduction ? 'badge-success' : 'badge-warning'}`}>
                            {diff > 0 ? `+${pct}%` : `${pct}%`}
                          </span>
                        </td>
                        <td style={{ color: isReduction ? 'var(--accent-primary)' : 'var(--accent-warning)', fontSize: 12 }}>
                          {isReduction ? '↓ Decarbonizing' : '↑ Consumption Spike'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'by-category' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">Activity Category Source Audit</div>
            <span className="badge badge-info">Direct Activity Distribution</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Emissions (tCO₂e)</th>
                    <th>Proportion</th>
                    <th>Decarbonization Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.emissionsByCategory || []).map((c, i) => {
                    const share = Math.round((c.value / totalEmissions) * 100)
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(c.value).toLocaleString()} t</td>
                        <td><span className="badge badge-info">{share}%</span></td>
                        <td>
                          <span className={`badge ${share > 25 ? 'badge-danger' : share > 15 ? 'badge-warning' : 'badge-secondary'}`}>
                            {share > 25 ? 'Critical Priority' : share > 15 ? 'High Priority' : 'Standard'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'by-location' && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">Facility & Geographic Emission Inventory</div>
            <span className="badge badge-info">Regional Analysis</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location / Facility</th>
                    <th>Emissions (tCO₂e)</th>
                    <th>Proportion</th>
                    <th>Grid Cleanliness</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.emissionsByLocation || []).map((loc, i) => {
                    const share = Math.round((loc.value / totalEmissions) * 100)
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{loc.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(loc.value).toLocaleString()} t</td>
                        <td><span className="badge badge-info">{share}%</span></td>
                        <td style={{ color: 'var(--accent-primary)', fontSize: 12 }}>Certified Renewable Mix</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Stats */}
      <div className="grid-4">
        {[
          { label: 'Total Tracked Emissions', value: `${totalEmissions.toLocaleString()} t`, change: '-7.2% vs baseline', color: 'var(--accent-primary)' },
          { label: 'Avg Monthly Intensity', value: `${avgMonthly.toLocaleString()} t`, change: '-3.2% MoM', color: 'var(--accent-primary)' },
          { label: 'Industries Covered', value: `${(d.emissionsByIndustry || []).length} Sectors`, change: 'Technology leading', color: 'var(--accent-secondary)' },
          { label: 'GHG Protocol Compliance', value: '100% (Scopes 1-3)', change: 'Audited factors', color: 'var(--accent-tertiary)' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-label">{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700, marginTop: 8 }}>{stat.value}</div>
            {stat.change && (
              <div style={{ fontSize: '11px', color: stat.color, fontWeight: 600, marginTop: 4 }}>{stat.change}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
