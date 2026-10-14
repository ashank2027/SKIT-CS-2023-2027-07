/**
 * EcoInsight CSV Utilities
 * Parsing, validation, and template generation for CSV import/export.
 */

export const REQUIRED_COLUMNS = ['date', 'category', 'activity', 'quantity', 'unit']
export const OPTIONAL_COLUMNS = ['location']
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

export const VALID_CATEGORIES = [
  'Electricity', 'Transportation', 'Fuel', 'Waste', 'Water', 'Natural Gas',
]

export const VALID_UNITS = [
  'kWh', 'MWh', 'liters', 'gallons', 'kg', 'therms', 'km', 'miles', 'm³', 'tonnes',
]

/**
 * Parse raw CSV text into headers and row objects.
 * @param {string} text - raw CSV content
 * @returns {{ headers: string[], rows: object[] }}
 */
export function parseCSV(text) {
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

/**
 * Validate a single parsed CSV row.
 * @param {object} row - parsed row object
 * @returns {string[]} array of error messages (empty = valid)
 */
export function validateRow(row) {
  const errors = []
  if (!row.date || isNaN(Date.parse(row.date))) errors.push('Invalid or missing date')
  if (!row.category) errors.push('Missing category')
  else if (!VALID_CATEGORIES.some(c => c.toLowerCase() === row.category.toLowerCase())) {
    errors.push(`Unknown category "${row.category}"`)
  }
  if (!row.activity) errors.push('Missing activity')
  if (!row.quantity || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
    errors.push('Invalid quantity')
  }
  if (!row.unit) errors.push('Missing unit')
  else if (!VALID_UNITS.some(u => u.toLowerCase() === row.unit.toLowerCase())) {
    errors.push(`Unknown unit "${row.unit}"`)
  }
  return errors
}

/**
 * Generate a sample CSV template string.
 * @returns {string}
 */
export function generateSampleCSV() {
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
