import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import api from '../services/api'
import { mockForecastData } from '../data/mockData'

export default function Forecast() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadForecast()
  }, [])

  const loadForecast = async () => {
    try {
      const response = await api.getForecast()
      setData(response || mockForecastData)
    } catch {
      setData(mockForecastData)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await api.generateForecast()
      await loadForecast()
    } catch {
      // Already using mock data
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="loader"></div></div>
  }

  const d = data || mockForecastData

  // Combine historical and forecast into one chart dataset
  const chartData = [
    ...d.historical.map(h => ({
      period: h.period,
      actual: h.actual,
      predicted: null,
      upper: null,
      lower: null,
    })),
    // Bridge point
    {
      period: d.historical[d.historical.length - 1]?.period,
      actual: d.historical[d.historical.length - 1]?.actual,
      predicted: d.historical[d.historical.length - 1]?.actual,
      upper: d.historical[d.historical.length - 1]?.actual,
      lower: d.historical[d.historical.length - 1]?.actual,
    },
    ...d.forecast.map(f => ({
      period: f.period,
      actual: null,
      predicted: f.predicted,
      upper: f.upper,
      lower: f.lower,
    })),
  ]

  // Remove duplicate bridge point
  const uniqueChart = chartData.filter((item, index, self) =>
    index === self.findIndex(t => t.period === item.period && t.predicted === item.predicted)
  )

  const latestActual = d.historical[d.historical.length - 1]
  const lastForecast = d.forecast[d.forecast.length - 1]
  const reductionPct = latestActual ? ((latestActual.actual - lastForecast.predicted) / latestActual.actual * 100).toFixed(1) : 0

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Predictive AI & Forecast</h1>
            <p className="page-description">
              90-day AI-driven emission trajectory projection with neural predictive variance analysis. Historical actuals vs predicted future values.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Generating...</>
              ) : (
                '🔮 Generate New Forecast'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card">
          <div className="stat-card-label">Current Monthly</div>
          <div className="stat-card-value" style={{ fontSize: '22px' }}>
            {latestActual?.actual.toLocaleString()}<span className="unit">t</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Latest actual data point</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">6-Month Forecast</div>
          <div className="stat-card-value" style={{ fontSize: '22px', color: 'var(--accent-primary)' }}>
            {lastForecast?.predicted.toLocaleString()}<span className="unit">t</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>↓ {reductionPct}% projected reduction</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Confidence Interval</div>
          <div className="stat-card-value" style={{ fontSize: '22px' }}>
            95%<span className="unit">CI</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Upper/lower bounds shown</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Model Version</div>
          <div className="stat-card-value" style={{ fontSize: '22px' }}>
            v2.1<span className="unit">NP</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Neural Predictive model</div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Emission Forecast — Actual vs Predicted</div>
            <div className="card-subtitle">Historical data with 6-month forward projection and 95% confidence intervals</div>
          </div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: '#00e5a0' }}></div>
              Actual
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: '#00bcd4' }}></div>
              Predicted
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: 'rgba(0,188,212,0.2)', width: 16, borderRadius: 2, height: 8 }}></div>
              95% CI Band
            </div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uniqueChart} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="forecastActualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00e5a0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastPredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00bcd4" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#00bcd4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#556677', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111820', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)',
                  }}
                />
                {/* Confidence band */}
                <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(0,188,212,0.08)" connectNulls={false} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="var(--bg-card)" connectNulls={false} />
                {/* Actual */}
                <Area
                  type="monotone" dataKey="actual" stroke="#00e5a0" fill="url(#forecastActualGrad)"
                  strokeWidth={2.5} dot={{ fill: '#00e5a0', r: 4, strokeWidth: 0 }} name="Actual"
                  connectNulls={false}
                />
                {/* Predicted */}
                <Area
                  type="monotone" dataKey="predicted" stroke="#00bcd4" fill="url(#forecastPredGrad)"
                  strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill: '#00bcd4', r: 4, strokeWidth: 0 }}
                  name="Predicted" connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Forecast Data Points</div>
          <span className="badge badge-info">6-month projection</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Predicted CO₂e</th>
                <th>Lower Bound (95% CI)</th>
                <th>Upper Bound (95% CI)</th>
                <th>Variance Range</th>
              </tr>
            </thead>
            <tbody>
              {d.forecast.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.period}</td>
                  <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                    {f.predicted.toLocaleString()} t
                  </td>
                  <td>{f.lower.toLocaleString()} t</td>
                  <td>{f.upper.toLocaleString()} t</td>
                  <td>
                    <span style={{ color: 'var(--accent-warning)' }}>
                      ±{((f.upper - f.lower) / 2).toLocaleString()} t
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
