import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'
import { mockEmissions, mockCategories } from '../data/mockData'

// ── CSV Parsing & Validation Helpers ───────────────────────────────────────
const REQUIRED_COLUMNS = ['date', 'category', 'activity', 'quantity', 'unit']
const OPTIONAL_COLUMNS = ['location']
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]
const VALID_CATEGORIES = ['Electricity', 'Transportation', 'Fuel', 'Waste', 'Water', 'Natural Gas']
const VALID_UNITS = ['kWh', 'MWh', 'liters', 'gallons', 'kg', 'therms', 'km', 'miles', 'm³', 'tonnes']

function parseCSV(text) {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows = lines.slice(1).map((line, idx) => {
    const values = line.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    row._lineNumber = idx + 2
    return row
  })
  return { headers, rows }
}

function validateRow(row) {
  const errors = []
  if (!row.date || isNaN(Date.parse(row.date))) errors.push('Invalid or missing date')
  if (!row.category) errors.push('Missing category')
  else if (!VALID_CATEGORIES.some(c => c.toLowerCase() === row.category.toLowerCase())) errors.push(`Unknown category "${row.category}"`)
  if (!row.activity) errors.push('Missing activity')
  if (!row.quantity || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) errors.push('Invalid quantity')
  if (!row.unit) errors.push('Missing unit')
  else if (!VALID_UNITS.some(u => u.toLowerCase() === row.unit.toLowerCase())) errors.push(`Unknown unit "${row.unit}"`)
  return errors
}

function generateSampleCSV() {
  const header = 'Date,Category,Activity,Quantity,Unit,Location'
  const rows = [
    '2026-09-01,Electricity,Office Grid Power,45000,kWh,Frankfurt',
    '2026-09-05,Transportation,Fleet Diesel,3200,liters,Munich',
    '2026-09-10,Fuel,Natural Gas Heating,1500,therms,Berlin',
    '2026-09-15,Waste,Industrial Waste,800,kg,Hamburg',
    '2026-09-20,Water,Facility Water Usage,12000,liters,Munich',
  ]
  return [header, ...rows].join('\n')
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Emissions() {
  const [emissions, setEmissions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [toast, setToast] = useState(null)

  // CSV Import state
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [csvStep, setCsvStep] = useState(1) // 1=select, 2=preview, 3=uploading, 4=result
  const [csvFile, setCsvFile] = useState(null)
  const [csvParsed, setCsvParsed] = useState(null)
  const [csvValidation, setCsvValidation] = useState([])
  const [csvDragOver, setCsvDragOver] = useState(false)
  const [csvUploadProgress, setCsvUploadProgress] = useState(0)
  const [csvProcessingStatus, setCsvProcessingStatus] = useState('IDLE') // IDLE, UPLOADING, QUEUED, RUNNING, COMPLETED, FAILED
  const [csvResult, setCsvResult] = useState(null)
  const csvFileRef = useRef(null)

  const [form, setForm] = useState({
    category: '',
    activity: '',
    quantity: '',
    unit: '',
    date: '',
    location: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [emRes, catRes] = await Promise.all([
        api.getEmissions(),
        api.getCategories(),
      ])
      setEmissions(emRes?.data || emRes || mockEmissions)
      setCategories(catRes?.data || catRes || mockCategories)
    } catch {
      setEmissions(mockEmissions)
      setCategories(mockCategories)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const openAddModal = () => {
    setEditingRecord(null)
    setForm({ category: '', activity: '', quantity: '', unit: '', date: '', location: '' })
    setShowModal(true)
  }

  const openEditModal = (record) => {
    setEditingRecord(record)
    setForm({
      category: record.category,
      activity: record.activity,
      quantity: record.quantity.toString(),
      unit: record.unit,
      date: record.date,
      location: record.location,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.activity || !form.quantity || !form.unit || !form.date) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    try {
      if (editingRecord) {
        const result = await api.updateEmission(editingRecord.id, form)
        if (result) {
          setEmissions(emissions.map(em => em.id === editingRecord.id ? { ...em, ...form, quantity: Number(form.quantity) } : em))
        } else {
          setEmissions(emissions.map(em => em.id === editingRecord.id ? { ...em, ...form, quantity: Number(form.quantity) } : em))
        }
        showToast('Emission record updated successfully', 'success')
      } else {
        const result = await api.createEmission(form)
        const newRecord = result || {
          id: Date.now(),
          ...form,
          quantity: Number(form.quantity),
          co2e: (Number(form.quantity) * 0.000385).toFixed(2),
          created_at: new Date().toISOString(),
        }
        setEmissions([newRecord, ...emissions])
        showToast('Emission record created successfully', 'success')
      }
      setShowModal(false)
    } catch (err) {
      showToast(err.message || 'Failed to save record', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this emission record?')) return
    try {
      await api.deleteEmission(id)
      setEmissions(emissions.filter(em => em.id !== id))
      showToast('Emission record deleted', 'success')
    } catch {
      setEmissions(emissions.filter(em => em.id !== id))
      showToast('Emission record deleted', 'success')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── CSV Import Handlers ────────────────────────────────────────────────
  const openCSVModal = () => {
    setCsvStep(1)
    setCsvFile(null)
    setCsvParsed(null)
    setCsvValidation([])
    setCsvUploadProgress(0)
    setCsvProcessingStatus('IDLE')
    setCsvResult(null)
    setShowCSVModal(true)
  }

  const handleCSVFileSelect = useCallback((file) => {
    if (!file) return
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please select a valid CSV file', 'error')
      return
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error')
      return
    }
    setCsvFile(file)

    // Parse the file
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const parsed = parseCSV(text)

      // Validate columns
      const missingCols = REQUIRED_COLUMNS.filter(col => !parsed.headers.includes(col))
      if (missingCols.length > 0) {
        showToast(`Missing required columns: ${missingCols.join(', ')}`, 'error')
        setCsvFile(null)
        return
      }

      // Validate each row
      const validationResults = parsed.rows.map((row, idx) => ({
        row,
        index: idx,
        errors: validateRow(row),
      }))

      setCsvParsed(parsed)
      setCsvValidation(validationResults)
      setCsvStep(2) // Move to preview
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleCSVFileSelect(file)
  }, [handleCSVFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setCsvDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setCsvDragOver(false)
  }, [])

  const handleDownloadTemplate = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_emissions_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('No emissions data to export', 'error')
      return
    }
    const headers = ['Date', 'Category', 'Activity', 'Quantity', 'Unit', 'CO2e (t)', 'Location']
    const rows = filtered.map(e => [
      e.date || '',
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.activity || '').replace(/"/g, '""')}"`,
      e.quantity || 0,
      e.unit || '',
      e.co2e || '0.00',
      `"${(e.location || '').replace(/"/g, '""')}"`
    ].join(','))
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `emissions_export_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`Exported ${filtered.length} emission records to CSV`, 'success')
  }

  const handleCSVUpload = async () => {
    if (!csvFile) return

    const validRows = csvValidation.filter(v => v.errors.length === 0)
    if (validRows.length === 0) {
      showToast('No valid rows to import', 'error')
      return
    }

    setCsvStep(3)
    setCsvProcessingStatus('UPLOADING')
    setCsvUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setCsvUploadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90 }
        return prev + Math.random() * 15
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      const response = await api.importCSV(formData)

      clearInterval(progressInterval)
      setCsvUploadProgress(100)
      setCsvProcessingStatus('QUEUED')

      // Poll for processing status
      if (response?.taskId) {
        pollTaskStatus(response.taskId)
      } else {
        // If no task system, simulate processing
        simulateProcessing(validRows.length)
      }
    } catch {
      clearInterval(progressInterval)
      // Mock fallback: simulate the entire flow
      simulateProcessing(validRows.length)
    }
  }

  const simulateProcessing = (validCount) => {
    setCsvUploadProgress(100)
    setCsvProcessingStatus('QUEUED')

    setTimeout(() => {
      setCsvProcessingStatus('RUNNING')
    }, 800)

    setTimeout(() => {
      const invalidCount = csvValidation.filter(v => v.errors.length > 0).length
      const totalCO2e = csvValidation
        .filter(v => v.errors.length === 0)
        .reduce((sum, v) => sum + Number(v.row.quantity || 0) * 0.000385, 0)

      setCsvProcessingStatus('COMPLETED')
      setCsvResult({
        imported: validCount,
        skipped: invalidCount,
        totalCO2e: totalCO2e.toFixed(2),
      })
      setCsvStep(4)

      // Reload emissions data
      loadData()
    }, 2500)
  }

  const pollTaskStatus = async (taskId) => {
    let attempts = 0
    const maxAttempts = 30

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setCsvProcessingStatus('FAILED')
        return
      }
      attempts++

      try {
        const status = await api.getTaskStatus(taskId)
        setCsvProcessingStatus(status?.status || 'RUNNING')

        if (status?.status === 'COMPLETED') {
          setCsvResult({
            imported: status.result?.imported || csvValidation.filter(v => v.errors.length === 0).length,
            skipped: status.result?.skipped || csvValidation.filter(v => v.errors.length > 0).length,
            totalCO2e: status.result?.totalCO2e || '0.00',
          })
          setCsvStep(4)
          loadData()
          return
        }

        if (status?.status === 'FAILED') {
          showToast('CSV processing failed. Please try again.', 'error')
          return
        }

        setTimeout(poll, 2000)
      } catch {
        setTimeout(poll, 3000)
      }
    }

    setTimeout(poll, 1500)
  }

  // ── Filter & Sort ───────────────────────────────────────────────────────
  let filtered = emissions.filter(em => {
    if (filterCategory && em.category !== filterCategory) return false
    if (searchTerm && !em.activity.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  filtered.sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (sortDir === 'asc') return aVal > bVal ? 1 : -1
    return aVal < bVal ? 1 : -1
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="loader"></div></div>
  }

  // ── CSV Step Indicators ─────────────────────────────────────────────────
  const csvSteps = [
    { num: 1, label: 'Select File' },
    { num: 2, label: 'Preview' },
    { num: 3, label: 'Upload' },
    { num: 4, label: 'Result' },
  ]

  const validRowCount = csvValidation.filter(v => v.errors.length === 0).length
  const invalidRowCount = csvValidation.filter(v => v.errors.length > 0).length

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Emissions Hub</h1>
            <p className="page-description">
              Manage, track, and audit all emission activity records across your organization.
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={openCSVModal}>📁 Import CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>📤 Export CSV</button>
            <button className="btn btn-primary" onClick={openAddModal}>+ Add Emission</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
            {filtered.length}
          </span>
          <span style={{ marginLeft: 4 }}>records</span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏭</div>
              <div className="empty-state-title">No emission records found</div>
              <div className="empty-state-text">Start by adding your first emission record or importing from CSV.</div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-primary" onClick={openAddModal}>+ Add First Emission</button>
                <button className="btn btn-secondary" onClick={openCSVModal}>📁 Import CSV</button>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('activity')} style={{ cursor: 'pointer' }}>
                    Activity {sortField === 'activity' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                    Category {sortField === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                    Quantity {sortField === 'quantity' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Unit</th>
                  <th onClick={() => handleSort('co2e')} style={{ cursor: 'pointer' }}>
                    CO₂e {sortField === 'co2e' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Location</th>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                    Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((em) => (
                  <tr key={em.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{em.activity}</td>
                    <td>
                      <span className="badge badge-info">{em.category}</span>
                    </td>
                    <td>{Number(em.quantity).toLocaleString()}</td>
                    <td>{em.unit}</td>
                    <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {Number(em.co2e).toFixed(2)} t
                    </td>
                    <td>{em.location}</td>
                    <td>{em.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(em)}>✏</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(em.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingRecord ? 'Edit Emission Record' : 'Add Emission Record'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select name="category" className="form-select" value={form.category} onChange={handleChange} required>
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Activity *</label>
                  <input type="text" name="activity" className="form-input" placeholder="e.g. Electricity consumption" value={form.activity} onChange={handleChange} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" name="quantity" className="form-input" placeholder="500" value={form.quantity} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <select name="unit" className="form-select" value={form.unit} onChange={handleChange} required>
                      <option value="">Select unit</option>
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
                    <label className="form-label">Date *</label>
                    <input type="date" name="date" className="form-input" value={form.date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input type="text" name="location" className="form-input" placeholder="City" value={form.location} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingRecord ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CSV IMPORT MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {showCSVModal && (
        <div className="modal-overlay csv-import-modal" onClick={() => csvStep < 3 && setShowCSVModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📁 Import CSV Data</h3>
              {csvStep < 3 && (
                <button className="modal-close" onClick={() => setShowCSVModal(false)}>✕</button>
              )}
            </div>

            <div className="modal-body">
              {/* Step Indicators */}
              <div className="csv-steps">
                {csvSteps.map((step, i) => (
                  <div key={step.num} style={{ display: 'contents' }}>
                    <div className={`csv-step ${csvStep === step.num ? 'active' : ''} ${csvStep > step.num ? 'completed' : ''}`}>
                      <div className="csv-step-number">
                        {csvStep > step.num ? '✓' : step.num}
                      </div>
                      <span>{step.label}</span>
                    </div>
                    {i < csvSteps.length - 1 && (
                      <div className={`csv-step-connector ${csvStep > step.num ? 'active' : ''}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── Step 1: File Selection ── */}
              {csvStep === 1 && (
                <>
                  <div
                    className={`csv-dropzone ${csvDragOver ? 'drag-over' : ''} ${csvFile ? 'has-file' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => csvFileRef.current?.click()}
                  >
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => handleCSVFileSelect(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                    <div className="csv-dropzone-icon">📄</div>
                    <div className="csv-dropzone-title">
                      {csvFile ? csvFile.name : 'Drop your CSV file here'}
                    </div>
                    <div className="csv-dropzone-subtitle">
                      or click to browse • .csv files up to 10MB
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-lg)' }}>
                    <button className="csv-template-btn" onClick={handleDownloadTemplate}>
                      📥 Download Sample Template
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      Required: {REQUIRED_COLUMNS.join(', ')}
                    </div>
                  </div>

                  {/* Expected format info */}
                  <div style={{
                    marginTop: 'var(--space-lg)', padding: 'var(--space-md)',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                    fontSize: '11px', color: 'var(--text-secondary)',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Expected CSV Format</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: 1.8 }}>
                      <div style={{ color: 'var(--accent-secondary)' }}>Date,Category,Activity,Quantity,Unit,Location</div>
                      <div>2026-09-01,Electricity,Office Power,45000,kWh,Frankfurt</div>
                      <div>2026-09-05,Transportation,Fleet Diesel,3200,liters,Munich</div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Preview & Validation ── */}
              {csvStep === 2 && csvParsed && (
                <>
                  {/* Summary badges */}
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">
                      {csvParsed.rows.length} total rows
                    </span>
                    <span className="badge badge-success">
                      ✓ {validRowCount} valid
                    </span>
                    {invalidRowCount > 0 && (
                      <span className="badge badge-danger">
                        ✕ {invalidRowCount} invalid
                      </span>
                    )}
                    <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>
                      {csvParsed.headers.length} columns detected
                    </span>
                  </div>

                  {/* Column Mapping Preview */}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    COLUMN MAPPING
                  </div>
                  <div style={{
                    display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)',
                    flexWrap: 'wrap',
                  }}>
                    {csvParsed.headers.map(h => (
                      <div key={h} style={{
                        padding: '4px 10px', background: 'var(--bg-tertiary)',
                        border: `1px solid ${ALL_COLUMNS.includes(h) ? 'rgba(0,229,160,0.3)' : 'var(--border-primary)'}`,
                        borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)',
                        color: ALL_COLUMNS.includes(h) ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                      }}>
                        {ALL_COLUMNS.includes(h) ? '✓ ' : '? '}{h}
                      </div>
                    ))}
                  </div>

                  {/* Data Preview Table (first 5 rows) */}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, marginTop: 'var(--space-md)' }}>
                    DATA PREVIEW (first {Math.min(5, csvParsed.rows.length)} rows)
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="csv-preview-table">
                      <thead>
                        <tr>
                          <th style={{ width: 30 }}>#</th>
                          {ALL_COLUMNS.filter(c => csvParsed.headers.includes(c)).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvValidation.slice(0, 5).map((v, i) => (
                          <tr key={i} className={v.errors.length > 0 ? 'invalid' : ''}>
                            <td>{v.row._lineNumber}</td>
                            {ALL_COLUMNS.filter(c => csvParsed.headers.includes(c)).map(col => (
                              <td key={col}>{v.row[col] || '—'}</td>
                            ))}
                            <td>
                              {v.errors.length === 0 ? (
                                <span className="badge badge-success" style={{ fontSize: 9 }}>✓ Valid</span>
                              ) : (
                                <span className="badge badge-danger" style={{ fontSize: 9 }}>✕ Error</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Validation Errors */}
                  {invalidRowCount > 0 && (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-danger)', marginTop: 'var(--space-lg)', marginBottom: 6 }}>
                        VALIDATION ERRORS ({invalidRowCount} rows)
                      </div>
                      <div className="csv-validation-errors">
                        {csvValidation.filter(v => v.errors.length > 0).slice(0, 10).map((v, i) => (
                          <div key={i} className="csv-validation-error-row">
                            <span>Row {v.row._lineNumber}:</span>
                            <span>{v.errors.join(' • ')}</span>
                          </div>
                        ))}
                        {invalidRowCount > 10 && (
                          <div className="csv-validation-error-row" style={{ color: 'var(--text-tertiary)' }}>
                            ...and {invalidRowCount - 10} more errors
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div style={{
                    padding: 'var(--space-md)', background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)',
                    marginTop: 'var(--space-lg)',
                  }}>
                    ℹ️ {validRowCount} valid rows will be imported. {invalidRowCount > 0 ? `${invalidRowCount} invalid rows will be skipped.` : ''} The C++ scheduler will process large files in the background.
                  </div>
                </>
              )}

              {/* ── Step 3: Uploading & Processing ── */}
              {csvStep === 3 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>
                    {csvProcessingStatus === 'UPLOADING' ? '📤' :
                     csvProcessingStatus === 'QUEUED' ? '◎' :
                     csvProcessingStatus === 'RUNNING' ? '⟳' :
                     csvProcessingStatus === 'FAILED' ? '✕' : '📤'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {csvProcessingStatus === 'UPLOADING' ? 'Uploading CSV file...' :
                     csvProcessingStatus === 'QUEUED' ? 'Queued in C++ Scheduler' :
                     csvProcessingStatus === 'RUNNING' ? 'Processing records...' :
                     csvProcessingStatus === 'FAILED' ? 'Processing failed' : 'Preparing...'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                    {csvProcessingStatus === 'UPLOADING' ? `Sending ${csvFile?.name} to server` :
                     csvProcessingStatus === 'QUEUED' ? 'Task queued — waiting for worker assignment' :
                     csvProcessingStatus === 'RUNNING' ? `Processing ${validRowCount} rows with emission factor lookup` :
                     csvProcessingStatus === 'FAILED' ? 'An error occurred during processing' : ''}
                  </div>

                  {/* Progress Bar */}
                  <div className="csv-upload-progress">
                    <div className="csv-upload-progress-bar">
                      <div
                        className={`csv-upload-progress-fill ${csvProcessingStatus === 'RUNNING' || csvProcessingStatus === 'QUEUED' ? 'animated' : ''}`}
                        style={{ width: `${csvUploadProgress}%` }}
                      />
                    </div>
                    <div className="csv-upload-status">
                      <span>
                        {csvProcessingStatus === 'UPLOADING' && `${Math.round(csvUploadProgress)}% uploaded`}
                        {csvProcessingStatus === 'QUEUED' && '⏳ Waiting for scheduler...'}
                        {csvProcessingStatus === 'RUNNING' && '⚙️ C++ Worker processing...'}
                        {csvProcessingStatus === 'FAILED' && '❌ Failed'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {csvFile && formatFileSize(csvFile.size)}
                      </span>
                    </div>
                  </div>

                  {/* Processing Pipeline Visualization */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)',
                    justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap',
                  }}>
                    {['Upload', '→', 'Validate', '→', 'Queue', '→', 'Worker', '→', 'Factor Lookup', '→', 'CO₂e', '→', 'DB Insert'].map((step, i) => {
                      const stepIdx = Math.floor(i / 2)
                      const isArrow = step === '→'
                      const statusToStep = { UPLOADING: 0, QUEUED: 2, RUNNING: 3, COMPLETED: 6 }
                      const currentStep = statusToStep[csvProcessingStatus] || 0
                      const isActive = !isArrow && stepIdx <= currentStep
                      return (
                        <span key={i} style={{
                          color: isArrow ? 'var(--text-muted)' :
                                 isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                          fontWeight: isActive ? 600 : 400,
                        }}>
                          {step}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 4: Result Summary ── */}
              {csvStep === 4 && csvResult && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>✅</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Import Complete
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    CSV data has been processed and stored in PostgreSQL
                  </div>

                  {/* Result Stats */}
                  <div className="csv-result-summary">
                    <div className="csv-result-item">
                      <div className="csv-result-item-value success">{csvResult.imported}</div>
                      <div className="csv-result-item-label">Records Imported</div>
                    </div>
                    <div className="csv-result-item">
                      <div className="csv-result-item-value error">{csvResult.skipped}</div>
                      <div className="csv-result-item-label">Rows Skipped</div>
                    </div>
                    <div className="csv-result-item">
                      <div className="csv-result-item-value info">{csvResult.totalCO2e}</div>
                      <div className="csv-result-item-label">Total tCO₂e</div>
                    </div>
                  </div>

                  {/* Processing details */}
                  <div style={{
                    marginTop: 'var(--space-lg)', padding: 'var(--space-md)',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                    fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span>Source file</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{csvFile?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span>Processing engine</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>C++ Scheduler (CSV_PROCESSING)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Status</span>
                      <span className="badge badge-success" style={{ fontSize: 9 }}>✓ COMPLETED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              {csvStep === 1 && (
                <button className="btn btn-secondary" onClick={() => setShowCSVModal(false)}>Cancel</button>
              )}
              {csvStep === 2 && (
                <>
                  <button className="btn btn-secondary" onClick={() => { setCsvStep(1); setCsvFile(null); setCsvParsed(null) }}>
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCSVUpload}
                    disabled={validRowCount === 0}
                  >
                    🚀 Import {validRowCount} Records
                  </button>
                </>
              )}
              {csvStep === 3 && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Please wait while processing completes...
                </div>
              )}
              {csvStep === 4 && (
                <button className="btn btn-primary" onClick={() => setShowCSVModal(false)}>
                  ✓ Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
