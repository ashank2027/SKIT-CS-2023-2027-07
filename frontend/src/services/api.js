/**
 * EcoInsight API Service
 * Centralized API communication layer
 * All requests go through the backend — frontend never connects to DB or AI directly.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  getToken() {
    return localStorage.getItem('ecoinsight_token')
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const token = this.getToken()

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem('ecoinsight_token')
        localStorage.removeItem('ecoinsight_user')
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`)
      }

      return data
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        console.warn('API unavailable — using mock data')
        return null
      }
      throw error
    }
  }

  // Auth
  async register(userData) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) })
  }

  async login(credentials) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' })
  }

  // Users
  async getProfile() {
    return this.request('/users/me')
  }

  async updateProfile(data) {
    return this.request('/users/me', { method: 'PUT', body: JSON.stringify(data) })
  }

  // Categories
  async getCategories() {
    return this.request('/categories')
  }

  // Emission Factors
  async getEmissionFactors() {
    return this.request('/emission-factors')
  }

  // Emissions CRUD
  async getEmissions(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/emissions${query ? `?${query}` : ''}`)
  }

  async getEmission(id) {
    return this.request(`/emissions/${id}`)
  }

  async createEmission(data) {
    return this.request('/emissions', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateEmission(id, data) {
    return this.request(`/emissions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteEmission(id) {
    return this.request(`/emissions/${id}`, { method: 'DELETE' })
  }

  // Calculator
  async calculate(data) {
    return this.request('/calculator', { method: 'POST', body: JSON.stringify(data) })
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard')
  }

  // Analytics
  async getAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/analytics${query ? `?${query}` : ''}`)
  }

  // CSV Import
  async importCSV(formData) {
    const token = this.getToken()
    return fetch(`${this.baseUrl}/emissions/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    }).then(res => res.json())
  }

  // AI
  async aiChat(message, conversationId = null) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    })
  }

  async getConversations() {
    return this.request('/ai/conversations')
  }

  async getConversation(id) {
    return this.request(`/ai/conversations/${id}`)
  }

  // Forecast
  async getForecast() {
    return this.request('/forecast')
  }

  async generateForecast() {
    return this.request('/forecast/generate', { method: 'POST' })
  }

  // Reports
  async getReports() {
    return this.request('/reports')
  }

  async getReport(id) {
    return this.request(`/reports/${id}`)
  }

  async createReport(data) {
    return this.request('/reports', { method: 'POST', body: JSON.stringify(data) })
  }

  async deleteReport(id) {
    return this.request(`/reports/${id}`, { method: 'DELETE' })
  }

  // Tasks
  async getTasks() {
    return this.request('/tasks')
  }

  async getTaskStatus(id) {
    return this.request(`/tasks/${id}/status`)
  }

  // Health
  async getHealth() {
    return this.request('/health')
  }
}

export const api = new ApiService()
export default api
