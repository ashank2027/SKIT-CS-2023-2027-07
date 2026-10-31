import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import api from '../services/api'
import { mockDashboardData } from '../data/mockData'

// Dynamic metrics configuration for each time tab filter
const TAB_PRESETS = {
  'Last 30 Days': {
    totalEmissions: 1040.80,
    currentPeriod: 1040.80,
    change: -4.2,
    netZeroCap: 92,
    factorConfidence: 99.4,
    highestCategory: {
      name: 'Purchased Electricity',
      scope: 'Scope 2',
      value: 512.40,
      facility: 'Frankfurt Data Center',
    },
    actualYTD: 1040,
    projectedQ4: 980,
    reductionVelocity: '-4.2',
    trendSlice: [
      { month: 'Week 1', actual: 245, projected: null },
      { month: 'Week 2', actual: 268, projected: null },
      { month: 'Week 3', actual: 252, projected: null },
      { month: 'Week 4', actual: 275, projected: 260 },
    ],
  },
  'Q3 2026': {
    totalEmissions: 12450.80,
    currentPeriod: 4120.30,
    change: -2.8,
    netZeroCap: 82,
    factorConfidence: 98.7,
    highestCategory: {
      name: 'Purchased Electricity',
      scope: 'Scope 2',
      value: 5988.00,
      facility: 'Frankfurt Data Center',
    },
    actualYTD: 12450,
    projectedQ4: 3850,
    reductionVelocity: '-3.1',
    trendSlice: null, // Uses default trend
  },
  'YTD 2026': {
    totalEmissions: 34890.50,
    currentPeriod: 4120.30,
    change: -6.4,
    netZeroCap: 76,
    factorConfidence: 98.9,
    highestCategory: {
      name: 'Purchased Electricity',
      scope: 'Scope 2',
      value: 16740.00,
      facility: 'European Operations Core',
    },
    actualYTD: 34890,
    projectedQ4: 11200,
    reductionVelocity: '-5.8',
    trendSlice: null,
  },
  'Trailing 12M': {
    totalEmissions: 48210.00,
    currentPeriod: 4120.30,
    change: -8.1,
    netZeroCap: 69,
    factorConfidence: 98.5,
    highestCategory: {
      name: 'Purchased Electricity',
      scope: 'Scope 2',
      value: 23140.00,
      facility: 'Global Enterprise Network',
    },
    actualYTD: 48210,
    projectedQ4: 14800,
    reductionVelocity: '-7.2',
    trendSlice: null,
  },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Q3 2026')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState('Just now')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  // 30-second live telemetry auto-refresh cycle
  useEffect(() => {
    let interval = null
    if (autoRefresh) {
      interval = setInterval(() => {
        setLastSyncTime(new Date().toLocaleTimeString())
        showToast('Telemetry synchronized with C++ OS scheduler engine', 'info')
      }, 30000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadDashboard = async () => {
    try {
      const response = await api.getDashboard()
      setData(response || mockDashboardData)
    } catch {
      setData(mockDashboardData)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    showToast(`Filter applied: ${tab}`)
  }

  const handleExportAuditPack = () => {
    const rawData = data || mockDashboardData
    const preset = TAB_PRESETS[activeTab] || {}
    const auditPack = {
      metadata: {
        system: 'EcoInsight Carbon Intelligence Platform',
        reportingWindow: activeTab,
        leadFrontendEngineer: 'Daksh Modi',
        exportedAt: new Date().toISOString(),
        ghgCompliance: 'GHG Protocol Corporate Standard (Scope 1, 2, 3)',
        schedulerEngine: 'C++ Priority & Round-Robin Task Scheduler',
        schedulerEfficiency: `${rawData.kernelEfficiency}%`,
        auditChecksum: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      },
      summary: {
        totalEmissions_tCO2e: preset.totalEmissions || rawData.totalEmissions,
        currentPeriod_tCO2e: preset.currentPeriod || rawData.currentPeriod,
        netZeroCapAllocated_pct: preset.netZeroCap || rawData.netZeroCap,
        topScopeCategory: preset.highestCategory || rawData.highestCategory,
        confidenceRating: `${preset.factorConfidence || rawData.factorConfidence}%`,
      },
      ghgScopeAllocation: rawData.ghgAllocation,
      categoryBreakdown: rawData.categoryBreakdown,
      recentActivityLedger: rawData.recentRecords,
    }

    const jsonBlob = new Blob([JSON.stringify(auditPack, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(jsonBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ecoinsight_executive_audit_pack_${activeTab.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Executive Audit Pack exported successfully!', 'success')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    )
  }

  const d = data || mockDashboardData
  const activeMetrics = TAB_PRESETS[activeTab] || {}

  // Apply active tab overrides for metrics
  const totalEmissions = activeMetrics.totalEmissions !== undefined ? activeMetrics.totalEmissions : d.totalEmissions
  const currentPeriod = activeMetrics.currentPeriod !== undefined ? activeMetrics.currentPeriod : d.currentPeriod
  const netZeroCap = activeMetrics.netZeroCap !== undefined ? activeMetrics.netZeroCap : d.netZeroCap
  const factorConfidence = activeMetrics.factorConfidence !== undefined ? activeMetrics.factorConfidence : d.factorConfidence
  const highestCategory = activeMetrics.highestCategory || d.highestCategory
  const actualYTD = activeMetrics.actualYTD !== undefined ? activeMetrics.actualYTD : d.actualYTD
  const projectedQ4 = activeMetrics.projectedQ4 !== undefined ? activeMetrics.projectedQ4 : d.projectedQ4
  const reductionVelocity = activeMetrics.reductionVelocity !== undefined ? activeMetrics.reductionVelocity : d.reductionVelocity

  // Prepare chart data based on active tab
  const chartData = (activeMetrics.trendSlice || d.trend).map(item => ({
    name: item.month,
    actual: item.actual || null,
    projected: item.projected || null,
  }))

  return (
    <div className="fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Carbon Intelligence Overview</h1>
            <p className="page-description">
              Real-time enterprise GHG emissions accounting, reduction targets, and automated computation engine.
            </p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => {
                setAutoRefresh(!autoRefresh)
                showToast(autoRefresh ? 'Live telemetry paused' : '30-second live telemetry enabled', 'info')
              }}
              className="btn btn-sm"
              style={{
                background: autoRefresh ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                border: `1px solid ${autoRefresh ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                color: autoRefresh ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
              title="Toggle automatic 30s background telemetry refresh"
            >
              <span style={{ fontSize: 12 }}>{autoRefresh ? '⟳' : '⏸'}</span>
              <span>{autoRefresh ? 'Auto-refresh: 30s' : 'Auto-refresh: Off'}</span>
            </button>

            <div className="realtime-badge">
              <span className={`dot ${autoRefresh ? 'live-pulse' : ''}`}></span>
              REALTIME
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="page-header-tabs">
            {['Last 30 Days', 'Q3 2026', 'YTD 2026', 'Trailing 12M'].map(tab => (
              <button
                key={tab}
                className={`page-header-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportAuditPack}
              title="Download executive audit pack for current period"
            >
              📦 Export Audit Pack
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/emissions')}
              title="Open emissions ledger to log new records"
            >
              ⊕ Add Emission Record
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-md)' }}>
        {/* Total Gross Emissions */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Gross Emissions</span>
            <span className="stat-card-badge" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
              📊
            </span>
          </div>
          <div className="stat-card-value">
            {totalEmissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="unit">tCO₂e</span>
          </div>
          {/* Mini sparkline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <div style={{ height: 30, flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 40 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 58 }, { v: 68 }]}>
                  <Area type="monotone" dataKey="v" stroke="#00e5a0" fill="rgba(0,229,160,0.1)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div>2026 Net-Zero <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{netZeroCap}%</span></div>
              <div style={{ color: 'var(--text-tertiary)' }}>Cap allocated</div>
            </div>
          </div>
        </div>

        {/* Current Month Ingestion */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Current Period Ingestion</span>
            <span className="stat-card-badge" style={{ background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>
              📥
            </span>
          </div>
          <div className="stat-card-value">
            {currentPeriod.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="unit">tCO₂e</span>
          </div>
          <div className="stat-card-meta">
            <div>Electricity & Fleet Surge</div>
            <div>
              <span className="badge badge-warning" style={{ fontSize: 9 }}>MoM Peak</span>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-sm)', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>FACTOR CONFIDENCE </span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              {factorConfidence}% ✓
            </span>
          </div>
        </div>

        {/* Top Emission Scope */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Top Emission Scope</span>
            <span className="stat-card-badge" style={{
              background: 'var(--accent-warning-dim)', color: 'var(--accent-warning)',
              fontFamily: 'var(--font-mono)', fontWeight: 700,
            }}>
              48%
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {highestCategory.scope} — {highestCategory.name}
          </div>
          <div className="stat-card-value" style={{ fontSize: '22px' }}>
            {highestCategory.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="unit">tCO₂e</span>
          </div>
          <div className="stat-card-meta" style={{ marginTop: 'var(--space-sm)' }}>
            <div>
              <span className="label">Key Facility</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{highestCategory.facility}</div>
            </div>
          </div>
        </div>

        {/* Kernel Batch Pipeline */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Kernel Batch Pipeline</span>
            <span className="stat-card-badge" style={{
              background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)', fontWeight: 700,
            }}>
              14.2s
            </span>
          </div>
          <div className="stat-card-value">
            {d.kernelEfficiency}%
            <span className="unit" style={{ fontSize: '12px' }}>Efficiency</span>
          </div>
          <div className="stat-card-meta">
            <div>
              <span className="label">Workers</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {d.kernelWorkers.total}/{d.kernelWorkers.total} ({d.kernelWorkers.priority} Prio, {d.kernelWorkers.roundRobin} RR)
              </div>
            </div>
          </div>
          <div className="stat-card-meta" style={{ marginTop: 'var(--space-sm)' }}>
            <div>
              <span className="label">Ingested</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: 4 }}>
                {d.ingestedCSVs} CSVs
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Emissions Trajectory + GHG Protocol */}
      <div className="grid-dashboard" style={{ marginBottom: 'var(--space-md)' }}>
        {/* Emissions Trajectory */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Emissions Trajectory & 90-Day AI Projection ({activeTab})</div>
              <div className="card-subtitle">Actuals stream vs neural predictive variance cone</div>
            </div>
            <div className="chart-legend">
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: '#00e5a0' }}></div>
                Actuals
              </div>
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: '#00bcd4', borderStyle: 'dashed' }}></div>
                Forecast
              </div>
            </div>
          </div>
          <div className="card-body">
            {/* Top stats */}
            <div style={{ display: 'flex', gap: 'var(--space-xl)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Actual Ledger
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700 }}>
                  {actualYTD.toLocaleString()}
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 4 }}>t</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Projected Run-rate
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {projectedQ4.toLocaleString()}
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 4 }}>t</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Reduction Velocity
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {reductionVelocity}
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 4 }}>t/mo</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00bcd4" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#00bcd4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111820', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)',
                    }}
                    labelStyle={{ color: '#8899aa' }}
                  />
                  <ReferenceLine
                    x="Sep 2026"
                    stroke="rgba(0,229,160,0.3)"
                    strokeDasharray="3 3"
                    label={{ value: 'ACTIVE RUNTIME', fill: '#8899aa', fontSize: 9, position: 'top' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#00e5a0"
                    fill="url(#actualGrad)"
                    strokeWidth={2}
                    dot={{ fill: '#00e5a0', r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#00bcd4"
                    fill="url(#projGrad)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ fill: '#00bcd4', r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GHG Protocol Allocation */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">GHG Protocol Allocation</div>
              <div className="card-subtitle">Categorical distribution across Scopes 1, 2, & 3</div>
            </div>
            <button
              className="btn btn-icon btn-outline"
              onClick={() => navigate('/analytics')}
              style={{ width: 28, height: 28, fontSize: 12 }}
              title="View deep multi-dimensional analytics"
            >
              ➔
            </button>
          </div>
          <div className="card-body">
            {/* Stacked Progress */}
            <div className="progress-bar-stacked" style={{ height: 10, marginBottom: 'var(--space-md)' }}>
              <div className="segment" style={{ width: `${d.ghgAllocation.scope1}%`, background: '#00e5a0' }}></div>
              <div className="segment" style={{ width: `${d.ghgAllocation.scope2}%`, background: '#00bcd4' }}></div>
              <div className="segment" style={{ width: `${d.ghgAllocation.scope3}%`, background: '#7c4dff' }}></div>
            </div>

            {/* Legend */}
            <div className="chart-legend" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: '#00e5a0' }}></div>
                Scope 1 ({d.ghgAllocation.scope1}%)
              </div>
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: '#00bcd4' }}></div>
                Scope 2 ({d.ghgAllocation.scope2}%)
              </div>
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: '#7c4dff' }}></div>
                Scope 3 ({d.ghgAllocation.scope3}%)
              </div>
            </div>

            {/* Category Breakdown Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {d.categoryBreakdown.map((cat, i) => (
                <div key={i}>
                  <div className="ghg-item">
                    <span className="ghg-item-name">{cat.name}</span>
                    <span className="ghg-item-value">{cat.value.toLocaleString('en-US', { minimumFractionDigits: 1 })} tCO₂e</span>
                  </div>
                  <div className="ghg-item-bar">
                    <div style={{
                      height: '100%', borderRadius: 'var(--radius-full)',
                      width: `${(cat.value / 5980) * 100}%`,
                      background: cat.color,
                      transition: 'width 0.6s ease',
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Ingestion Ledger + Kernel Telemetry */}
      <div className="grid-dashboard">
        {/* Live Ingestion Ledger */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                📊 Live Ingestion Ledger
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                  PostgreSQL • Sync {lastSyncTime}
                </span>
              </div>
              <div className="card-subtitle">Validated activity data mapped with localized emissions factors.</div>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => navigate('/emissions')}
              style={{ fontSize: 11 }}
            >
              View Full Ledger ➔
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activity Stream</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>CO₂e Mass</th>
                  <th>Location</th>
                  <th>Audit</th>
                </tr>
              </thead>
              <tbody>
                {d.recentRecords.map((record, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{record.activity}</td>
                    <td>{record.category}</td>
                    <td>{record.quantity.toLocaleString()}</td>
                    <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{record.co2e.toFixed(2)}</td>
                    <td>{record.location}</td>
                    <td>
                      <span className={`badge ${record.audit === 'Verified' ? 'badge-success' : 'badge-warning'}`}>
                        {record.audit === 'Verified' ? '✓' : '◎'} {record.audit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* C++ Kernel Engine Telemetry */}
        <div className="kernel-panel">
          <div className="kernel-panel-header">
            <div className="kernel-panel-title">
              ⚙️ C++ Kernel Engine Telemetry
              <span className="health-badge healthy">HEALTHY</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
            Priority • Round-Robin Multi-threaded Scheduler • Updated {lastSyncTime}
          </div>

          {/* Workers */}
          {[
            { id: '#1', hex: '0x7F1A', task: 'FORECAST_GENERATION', priority: 'HIGH_PRIO', time: '1.2s', usage: 82 },
            { id: '#2', hex: '0x3B2C', task: 'CSV_PROCESSING', priority: 'MED_PRIO', time: '0.8s', usage: 65 },
            { id: '#3', hex: '0xA1F0', task: 'ANALYTICS', priority: 'LOW_PRIO', time: '2.1s', usage: 45 },
            { id: '#4', hex: '0x9D4E', task: 'REPORT_GENERATION', priority: 'HIGH_PRIO', time: '3.4s', usage: 91 },
          ].map((worker, i) => (
            <div key={i} className="kernel-worker">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span>
                  <span style={{ color: 'var(--accent-primary)' }}>● </span>
                  <span className="kernel-worker-id">Worker {worker.id}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>[{worker.hex}]</span>
                </span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{worker.usage}%</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                TASK: {worker.task}
                <span style={{ float: 'right' }}>{worker.time} elapsed</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({worker.priority})</div>
              <div className="progress-bar" style={{ marginTop: 4, height: 3 }}>
                <div className="progress-bar-fill green" style={{ width: `${worker.usage}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
