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
