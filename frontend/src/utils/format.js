/**
 * EcoInsight Formatting Utilities
 * Shared formatters used across Dashboard, Emissions, Calculator, Analytics, etc.
 */

/**
 * Format a number with locale-aware separators and fixed decimal places.
 * @param {number} value
 * @param {number} decimals - number of decimal places (default 2)
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0'
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a CO2e value with unit suffix.
 * @param {number} value - tonnes of CO2e
 * @param {number} decimals
 * @returns {string}
 */
export function formatCO2e(value, decimals = 2) {
  return `${formatNumber(value, decimals)} tCO₂e`
}

/**
 * Format file size in bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format a date string to locale-friendly display.
 * @param {string|Date} date
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return '—'
  const defaults = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(date).toLocaleDateString('en-US', { ...defaults, ...options })
}

/**
 * Calculate percentage change between two values.
 * @param {number} current
 * @param {number} previous
 * @returns {string} e.g. "+8.3%" or "-5.2%"
 */
export function formatPercentChange(current, previous) {
  if (!previous || previous === 0) return 'N/A'
  const change = ((current - previous) / previous) * 100
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}
