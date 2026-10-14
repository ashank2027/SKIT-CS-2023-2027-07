/**
 * EcoInsight Type Definitions (JSDoc)
 *
 * Since the project uses plain JavaScript (not TypeScript), these JSDoc
 * typedefs provide IDE autocompletion and serve as documentation for the
 * shared data contract between frontend, backend, and database.
 *
 * These mirror the Shared Database Contract from the Task Specification.
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} [organization]
 * @property {string} [industry]
 * @property {string} [location]
 * @property {string} [role]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} EmissionCategory
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} EmissionFactor
 * @property {number} id
 * @property {number} category_id
 * @property {string} [category]
 * @property {string} activity
 * @property {string} unit
 * @property {number} factor
 * @property {string} [source]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} EmissionRecord
 * @property {number} id
 * @property {number} [user_id]
 * @property {number} [category_id]
 * @property {string} category
 * @property {string} activity
 * @property {number} quantity
 * @property {string} unit
 * @property {number} [emission_factor]
 * @property {number} co2e
 * @property {string} [location]
 * @property {string} date
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} Task
 * @property {number} id
 * @property {number} [user_id]
 * @property {string} task_type - CSV_PROCESSING | ANALYTICS | FORECAST | REPORT_GENERATION
 * @property {string} [priority]
 * @property {string} status - QUEUED | RUNNING | COMPLETED | FAILED | RETRYING
 * @property {number} [retry_count]
 * @property {string} [created_at]
 * @property {string} [started_at]
 * @property {string} [completed_at]
 * @property {string} [result_reference]
 * @property {string} [error_message]
 */

/**
 * @typedef {Object} Report
 * @property {number} id
 * @property {number} [user_id]
 * @property {string} report_type - Monthly | Quarterly | Annual | Custom
 * @property {string} period_start
 * @property {string} period_end
 * @property {string} status - QUEUED | RUNNING | COMPLETED | FAILED
 * @property {string} [file_reference]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} ForecastPoint
 * @property {string} period
 * @property {number} [actual]
 * @property {number} [predicted]
 * @property {number} [lower]
 * @property {number} [upper]
 */

/**
 * @typedef {Object} ForecastData
 * @property {ForecastPoint[]} historical
 * @property {ForecastPoint[]} forecast
 */

/**
 * @typedef {Object} DashboardData
 * @property {number} totalEmissions
 * @property {number} currentPeriod
 * @property {number} previousPeriod
 * @property {number} percentageChange
 * @property {{ name: string, scope: string, value: number, facility: string }} highestCategory
 * @property {number} kernelEfficiency
 * @property {{ total: number, priority: number, roundRobin: number }} kernelWorkers
 * @property {number} ingestedCSVs
 * @property {number} netZeroCap
 * @property {number} factorConfidence
 * @property {Array} recentRecords
 * @property {Array} trend
 * @property {Array} categoryBreakdown
 * @property {{ scope1: number, scope2: number, scope3: number }} ghgAllocation
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {Array<{ period: string, value: number, prevYear: number }>} emissionsByTime
 * @property {Array<{ name: string, value: number, fill: string }>} emissionsByCategory
 * @property {Array<{ name: string, value: number }>} emissionsByLocation
 * @property {Array<{ name: string, value: number, percentage: number }>} emissionsByIndustry
 * @property {Array<{ name: string, value: number, fill: string, description: string }>} emissionsBySector
 */

/**
 * @typedef {Object} AuthResponse
 * @property {User} user
 * @property {string} token
 */

/**
 * @typedef {Object} CalculatorResult
 * @property {number|string} co2e
 * @property {number} [emissionFactor]
 * @property {string} [category]
 * @property {string} [unit]
 * @property {string} [source]
 */

// Export empty object so this file can be imported as a module
export default {}
