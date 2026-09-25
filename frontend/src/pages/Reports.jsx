import { useState, useEffect } from 'react'
import api from '../services/api'
import { mockReports } from '../data/mockData'

export default function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    report_type: 'Monthly',
    period_start: '',
    period_end: '',
  })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const response = await api.getReports()
      setReports(response?.data || response || mockReports)
    } catch {
      setReports(mockReports)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!form.period_start || !form.period_end) {
      showToastMsg('Please select a date range', 'error')
      return
    }
    setGenerating(true)
    try {
      const result = await api.createReport(form)
      const newReport = result || {
        id: Date.now(),
        ...form,
        status: 'QUEUED',
        created_at: new Date().toISOString(),
      }
      setReports([newReport, ...reports])
      setShowModal(false)
      showToastMsg('Report generation requested. The C++ scheduler will process it.', 'success')
    } catch (err) {
      showToastMsg(err.message || 'Failed to generate report', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    try {
      await api.deleteReport(id)
    } catch {}
    setReports(reports.filter(r => r.id !== id))
    showToastMsg('Report deleted', 'success')
  }

  const showToastMsg = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="badge badge-success">✓ Completed</span>
      case 'RUNNING': return <span className="badge badge-info">⟳ Running</span>
      case 'QUEUED': return <span className="badge badge-warning">◎ Queued</span>
      case 'FAILED': return <span className="badge badge-danger">✕ Failed</span>
      default: return <span className="badge">{status}</span>
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="loader"></div></div>
  }

  return (
    <div className="fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}

      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Reports & Audit</h1>
            <p className="page-description">
              Generate comprehensive emission reports with analytics, forecasts, and AI recommendations. Reports are processed through the C++ scheduling engine.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate Report</button>
          </div>
        </div>
      </div>

      {/* Report Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-lg)' }}>
        {[
          { label: 'Total Reports', value: reports.length, icon: '📋' },
          { label: 'Completed', value: reports.filter(r => r.status === 'COMPLETED').length, icon: '✓' },
          { label: 'Processing', value: reports.filter(r => r.status === 'RUNNING').length, icon: '⟳' },
          { label: 'Queued', value: reports.filter(r => r.status === 'QUEUED').length, icon: '◎' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-label">{stat.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700 }}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reports Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Report History</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Reports generated via C++ Scheduler → Worker → PDF Pipeline
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No reports generated yet</div>
              <div className="empty-state-text">Generate your first emission report to get started.</div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate First Report</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Type</th>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                      {report.report_type}
                    </td>
                    <td>{report.period_start}</td>
                    <td>{report.period_end}</td>
                    <td>{getStatusBadge(report.status)}</td>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {report.status === 'COMPLETED' && (
                          <button className="btn btn-sm btn-primary">📥 Download</button>
                        )}
                        <button className="btn btn-sm btn-outline">👁 View</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(report.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Task Pipeline */}
      <div className="card" style={{ marginTop: 'var(--space-md)' }}>
        <div className="card-header">
          <div className="card-title">Report Generation Pipeline</div>
          <span className="health-badge healthy">HEALTHY</span>
        </div>
        <div className="card-body">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
            flexWrap: 'wrap',
          }}>
            {['User Request', '→', 'Backend API', '→', 'Task Created', '→', 'C++ Scheduler', '→', 'Priority/RR', '→', 'Worker', '→', 'PDF Generator', '→', 'Database', '→', 'Download'].map((step, i) => (
              <span key={i} style={{ color: step === '→' ? 'var(--text-muted)' : 'var(--accent-primary)' }}>
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generate New Report</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Report Type</label>
                  <select name="report_type" className="form-select" value={form.report_type} onChange={handleChange}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Period Start *</label>
                    <input type="date" name="period_start" className="form-input" value={form.period_start} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period End *</label>
                    <input type="date" name="period_end" className="form-input" value={form.period_end} onChange={handleChange} required />
                  </div>
                </div>
                <div style={{
                  padding: 'var(--space-md)', background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)',
                }}>
                  ℹ️ Report will be queued in the C++ scheduler. Processing time depends on data volume and scheduler priority.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? 'Queuing...' : '🚀 Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
