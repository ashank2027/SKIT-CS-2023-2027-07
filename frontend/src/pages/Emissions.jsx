import { useState, useEffect } from 'react'
import api from '../services/api'
import { mockEmissions, mockCategories } from '../data/mockData'

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

  // Filter and sort
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
            <button className="btn btn-secondary btn-sm">📤 Export CSV</button>
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
              <button className="btn btn-primary" onClick={openAddModal}>+ Add First Emission</button>
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
    </div>
  )
}
