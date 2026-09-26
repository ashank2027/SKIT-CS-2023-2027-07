import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import api from '../services/api'
import { mockAnalyticsData } from '../data/mockData'

const COLORS = ['#00bcd4', '#7c4dff', '#ff7043', '#ffab00', '#4fc3f7', '#00e5a0']

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    category: '',
    location: '',
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await api.getAnalytics(filters)
      setData(response || mockAnalyticsData)
    } catch {
      setData(mockAnalyticsData)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const applyFilters = () => {
    setLoading(true)
    loadAnalytics()
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="loader"></div></div>
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
            <p key={i} style={{ color: p.color || 'var(--accent-primary)' }}>
              {p.name}: {Number(p.value).toLocaleString()} tCO₂e
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Analytics & Insights</h1>
            <p className="page-description">
              Multi-dimensional emission analysis across time, category, location, and industry sectors.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm">📊 Export Analysis</button>
          </div>
        </div>
        <div className="page-header-tabs">
          {['overview', 'by-time', 'by-category', 'by-location'].map(view => (
            <button
              key={view}
              className={`page-header-tab ${activeView === view ? 'active' : ''}`}
              onClick={() => setActiveView(view)}
            >
              {view === 'overview' ? 'Overview' :
               view === 'by-time' ? 'By Time' :
               view === 'by-category' ? 'By Category' : 'By Location'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-body" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>From</label>
              <input type="date" name="from" className="form-input" value={filters.from} onChange={handleFilterChange} style={{ width: 160 }} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>To</label>
              <input type="date" name="to" className="form-input" value={filters.to} onChange={handleFilterChange} style={{ width: 160 }} />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Category</label>
              <select name="category" className="form-select" value={filters.category} onChange={handleFilterChange} style={{ width: 160 }}>
                <option value="">All</option>
                <option value="Electricity">Electricity</option>
                <option value="Transportation">Transportation</option>
                <option value="Fuel">Fuel</option>
                <option value="Waste">Waste</option>
                <option value="Water">Water</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 4 }}>Location</label>
              <input type="text" name="location" className="form-input" placeholder="Any location" value={filters.location} onChange={handleFilterChange} style={{ width: 160 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply Filters</button>
          </div>
        </div>
      </div>

      {/* Charts */}
      {(activeView === 'overview' || activeView === 'by-time') && (
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-title">Emissions Over Time</div>
            <div className="badge badge-info">Monthly Trend</div>
          </div>
          <div className="card-body">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.emissionsByTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="period" tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#00e5a0" fill="url(#areaGrad)" strokeWidth={2} name="Emissions" dot={{ fill: '#00e5a0', r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 'var(--space-md)' }}>
        {(activeView === 'overview' || activeView === 'by-category') && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Emissions by Category</div>
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
                      outerRadius={100}
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
            </div>
            <div className="card-body">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.emissionsByLocation} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#556677', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#556677', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#00bcd4" radius={[4, 4, 0, 0]} name="Emissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid-4">
        {[
          { label: 'Total Emissions', value: '12,450 t', change: '+8.3%', color: 'var(--accent-warning)' },
          { label: 'Avg Monthly', value: '2,075 t', change: '-3.2%', color: 'var(--accent-primary)' },
          { label: 'Categories Tracked', value: '6', change: '', color: 'var(--accent-secondary)' },
          { label: 'Data Points', value: '1,284', change: '+124 today', color: 'var(--accent-tertiary)' },
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
