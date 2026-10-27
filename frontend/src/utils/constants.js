/**
 * EcoInsight Application Constants
 * Centralized configuration values used across multiple components.
 */

/** Category → available measurement units mapping */
export const CATEGORY_UNITS = {
  Electricity: ['kWh', 'MWh'],
  Transportation: ['km', 'miles', 'liters'],
  Fuel: ['liters', 'gallons', 'therms'],
  Waste: ['kg', 'tonnes'],
  Water: ['liters', 'm³'],
  'Natural Gas': ['therms', 'm³'],
}

/** Default units when no category is selected */
export const DEFAULT_UNITS = [
  'kWh', 'MWh', 'liters', 'gallons', 'kg', 'tonnes', 'km', 'miles', 'therms', 'm³',
]

/** Standard chart colors for category breakdowns */
export const CHART_COLORS = [
  '#00bcd4', '#7c4dff', '#ff7043', '#ffab00', '#4fc3f7', '#00e5a0',
]

/** GHG Protocol scope colors */
export const SCOPE_COLORS = {
  'Scope 1 (Direct)': '#ff7043',
  'Scope 2 (Indirect Energy)': '#00e5a0',
  'Scope 3 (Value Chain)': '#7c4dff',
}

/** Helper to resolve GHG Scope from category and optional record override */
export const getCategoryScope = (category, recordScope) => {
  if (recordScope) {
    if (recordScope.includes('1')) return { code: 'Scope 1', label: 'Scope 1 (Direct)', badge: 'badge-warning', color: '#ff7043' }
    if (recordScope.includes('2')) return { code: 'Scope 2', label: 'Scope 2 (Indirect Energy)', badge: 'badge-success', color: '#00e5a0' }
    return { code: 'Scope 3', label: 'Scope 3 (Value Chain)', badge: 'badge-purple', color: '#7c4dff' }
  }
  const c = (category || '').toLowerCase()
  if (c.includes('fuel') || c.includes('gas') || c.includes('diesel') || c.includes('petrol') || c.includes('combustion')) {
    return { code: 'Scope 1', label: 'Scope 1 (Direct)', badge: 'badge-warning', color: '#ff7043' }
  }
  if (c.includes('electr') || c.includes('power') || c.includes('grid') || c.includes('heat') || c.includes('steam')) {
    return { code: 'Scope 2', label: 'Scope 2 (Indirect Energy)', badge: 'badge-success', color: '#00e5a0' }
  }
  return { code: 'Scope 3', label: 'Scope 3 (Value Chain)', badge: 'badge-purple', color: '#7c4dff' }
}

/** Task processing statuses */
export const TASK_STATUS = {
  IDLE: 'IDLE',
  UPLOADING: 'UPLOADING',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

/** Local storage keys */
export const STORAGE_KEYS = {
  USER: 'ecoinsight_user',
  TOKEN: 'ecoinsight_token',
  REGISTERED_USERS: 'ecoinsight_registered_users',
  CALC_HISTORY: 'ecoinsight_calc_history',
}
