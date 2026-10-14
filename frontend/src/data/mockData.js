/**
 * Mock data for development when backend is unavailable.
 * This will be replaced by real API data once Chetan's backend is connected.
 * RULE: No permanent hardcoded data — these mocks are development-only.
 */

export const mockDashboardData = {
  totalEmissions: 12450.80,
  currentPeriod: 2340.50,
  previousPeriod: 2160.30,
  percentageChange: 8.33,
  highestCategory: {
    name: 'Electricity',
    scope: 'Scope 2',
    value: 5988.00,
    facility: 'Frankfurt DC (F...)',
  },
  kernelEfficiency: 99.8,
  kernelWorkers: { total: 4, priority: 2, roundRobin: 2 },
  ingestedCSVs: 124,
  netZeroCap: 68,
  factorConfidence: 99.4,
  recentRecords: [
    { id: 1, activity: 'Facility Grid', category: 'Electricity', quantity: 500000, co2e: 192.50, location: 'Frankfurt', audit: 'Verified' },
    { id: 2, activity: 'Fleet Diesel', category: 'Transportation', quantity: 12000, co2e: 31.44, location: 'Munich', audit: 'Verified' },
    { id: 3, activity: 'Natural Gas', category: 'Fuel', quantity: 8500, co2e: 17.08, location: 'Berlin', audit: 'Pending' },
    { id: 4, activity: 'Waste Disposal', category: 'Waste', quantity: 2200, co2e: 4.84, location: 'Hamburg', audit: 'Verified' },
    { id: 5, activity: 'Water Treatment', category: 'Water', quantity: 45000, co2e: 13.50, location: 'Munich', audit: 'Pending' },
  ],
  trend: [
    { month: 'May 2026', actual: 2100 },
    { month: 'Jun 2026', actual: 2050 },
    { month: 'Jul 2026', actual: 1980 },
    { month: 'Aug 2026', actual: 1920 },
    { month: 'Sep 2026', actual: 2340.50 },
    { month: 'Oct (Proj)', projected: 2100 },
    { month: 'Nov (Proj)', projected: 1950 },
    { month: 'Dec (Proj)', projected: 1770 },
  ],
  categoryBreakdown: [
    { name: 'Purchased Electricity (Grid)', value: 5980.0, scope: 'Scope 2', color: '#00bcd4' },
    { name: 'Supply Chain & Logistics', value: 2840.4, scope: 'Scope 3', color: '#7c4dff' },
    { name: 'Commercial Vehicle Fleet', value: 1620.0, scope: 'Scope 1', color: '#00e5a0' },
    { name: 'Facility Natural Gas Heating', value: 870.0, scope: 'Scope 1', color: '#ff7043' },
    { name: 'Waste & Municipal Water Systems', value: 1140.4, scope: 'Scope 3', color: '#4fc3f7' },
  ],
  ghgAllocation: {
    scope1: 20,
    scope2: 48,
    scope3: 32,
  },
  projectedQ4: 3820,
  reductionVelocity: -188,
  actualYTD: 12450,
}

export const mockEmissions = [
  { id: 1, category: 'Electricity', activity: 'Facility Grid Power', quantity: 500000, unit: 'kWh', co2e: 192.50, location: 'Frankfurt', date: '2026-09-20', created_at: '2026-09-20T10:00:00Z' },
  { id: 2, category: 'Transportation', activity: 'Fleet Diesel Vehicles', quantity: 12000, unit: 'liters', co2e: 31.44, location: 'Munich', date: '2026-09-19', created_at: '2026-09-19T14:30:00Z' },
  { id: 3, category: 'Fuel', activity: 'Natural Gas Heating', quantity: 8500, unit: 'therms', co2e: 17.08, location: 'Berlin', date: '2026-09-18', created_at: '2026-09-18T09:15:00Z' },
  { id: 4, category: 'Waste', activity: 'Municipal Waste Disposal', quantity: 2200, unit: 'kg', co2e: 4.84, location: 'Hamburg', date: '2026-09-17', created_at: '2026-09-17T16:45:00Z' },
  { id: 5, category: 'Water', activity: 'Water Treatment Process', quantity: 45000, unit: 'liters', co2e: 13.50, location: 'Munich', date: '2026-09-16', created_at: '2026-09-16T11:20:00Z' },
  { id: 6, category: 'Electricity', activity: 'Office Building Power', quantity: 280000, unit: 'kWh', co2e: 107.80, location: 'Berlin', date: '2026-09-15', created_at: '2026-09-15T08:00:00Z' },
  { id: 7, category: 'Transportation', activity: 'Business Air Travel', quantity: 5600, unit: 'km', co2e: 0.98, location: 'Global', date: '2026-09-14', created_at: '2026-09-14T12:00:00Z' },
  { id: 8, category: 'Natural Gas', activity: 'Industrial Boiler', quantity: 12000, unit: 'therms', co2e: 24.12, location: 'Frankfurt', date: '2026-09-13', created_at: '2026-09-13T07:30:00Z' },
]

export const mockCategories = [
  { id: 1, name: 'Electricity', description: 'Grid and renewable electricity consumption' },
  { id: 2, name: 'Transportation', description: 'Vehicle fleet, air travel, logistics' },
  { id: 3, name: 'Fuel', description: 'Natural gas, diesel, petroleum products' },
  { id: 4, name: 'Waste', description: 'Solid waste, recycling, disposal' },
  { id: 5, name: 'Water', description: 'Water consumption and treatment' },
  { id: 6, name: 'Natural Gas', description: 'Natural gas for heating and processes' },
]

export const mockForecastData = {
  historical: [
    { period: '2026-04', actual: 2200 },
    { period: '2026-05', actual: 2100 },
    { period: '2026-06', actual: 2050 },
    { period: '2026-07', actual: 1980 },
    { period: '2026-08', actual: 1920 },
    { period: '2026-09', actual: 2340 },
  ],
  forecast: [
    { period: '2026-10', predicted: 2100, lower: 1900, upper: 2300 },
    { period: '2026-11', predicted: 1950, lower: 1700, upper: 2200 },
    { period: '2026-12', predicted: 1770, lower: 1500, upper: 2040 },
    { period: '2027-01', predicted: 1650, lower: 1400, upper: 1900 },
    { period: '2027-02', predicted: 1550, lower: 1300, upper: 1800 },
    { period: '2027-03', predicted: 1480, lower: 1200, upper: 1760 },
  ],
}

export const mockReports = [
  { id: 1, report_type: 'Quarterly', period_start: '2026-07-01', period_end: '2026-09-30', status: 'COMPLETED', created_at: '2026-09-22T10:00:00Z' },
  { id: 2, report_type: 'Monthly', period_start: '2026-09-01', period_end: '2026-09-30', status: 'RUNNING', created_at: '2026-09-24T14:30:00Z' },
  { id: 3, report_type: 'Annual', period_start: '2026-01-01', period_end: '2026-12-31', status: 'QUEUED', created_at: '2026-09-25T08:00:00Z' },
]

export const mockAnalyticsData = {
  emissionsByTime: [
    { period: '2026-04', value: 2200, prevYear: 2450 },
    { period: '2026-05', value: 2100, prevYear: 2310 },
    { period: '2026-06', value: 2050, prevYear: 2200 },
    { period: '2026-07', value: 1980, prevYear: 2150 },
    { period: '2026-08', value: 1920, prevYear: 2080 },
    { period: '2026-09', value: 2340, prevYear: 2520 },
  ],
  emissionsByCategory: [
    { name: 'Electricity', value: 5980, fill: '#00bcd4' },
    { name: 'Transportation', value: 2840, fill: '#7c4dff' },
    { name: 'Fuel', value: 1620, fill: '#ff7043' },
    { name: 'Waste', value: 870, fill: '#ffab00' },
    { name: 'Water', value: 1140, fill: '#4fc3f7' },
  ],
  emissionsByLocation: [
    { name: 'Frankfurt', value: 4200 },
    { name: 'Munich', value: 3100 },
    { name: 'Berlin', value: 2800 },
    { name: 'Hamburg', value: 1500 },
    { name: 'Other', value: 850 },
  ],
  emissionsByIndustry: [
    { name: 'Technology', value: 3850, percentage: 31 },
    { name: 'Manufacturing', value: 3420, percentage: 27 },
    { name: 'Energy', value: 2280, percentage: 18 },
    { name: 'Transportation', value: 1650, percentage: 13 },
    { name: 'Healthcare', value: 820, percentage: 7 },
    { name: 'Finance', value: 430, percentage: 4 },
  ],
  emissionsBySector: [
    { name: 'Scope 1 (Direct)', value: 3940, fill: '#ff7043', description: 'Fuel combustion, company fleet, on-site facilities' },
    { name: 'Scope 2 (Indirect Energy)', value: 5980, fill: '#00e5a0', description: 'Purchased electricity, steam, heating & cooling' },
    { name: 'Scope 3 (Value Chain)', value: 2530, fill: '#7c4dff', description: 'Business travel, waste disposal, purchased goods & logistics' },
  ],
}

export const mockEmissionFactors = [
  { id: 1, category_id: 1, category: 'Electricity', activity: 'Grid Electricity', unit: 'kWh', factor: 0.000385, source: 'IEA / European Grid Average 2026' },
  { id: 2, category_id: 1, category: 'Electricity', activity: 'Renewable Hydro/Solar Grid', unit: 'kWh', factor: 0.000045, source: 'GHG Protocol Scope 2' },
  { id: 3, category_id: 1, category: 'Electricity', activity: 'High-Voltage Industrial', unit: 'MWh', factor: 0.385000, source: 'IEA Industrial Benchmarks' },
  { id: 4, category_id: 2, category: 'Transportation', activity: 'Diesel Fleet Van / Truck', unit: 'liters', factor: 0.002680, source: 'DEFRA 2026 Standards' },
  { id: 5, category_id: 2, category: 'Transportation', activity: 'Passenger Petrol Car', unit: 'km', factor: 0.000171, source: 'EPA Emission Standards' },
  { id: 6, category_id: 2, category: 'Transportation', activity: 'Air Travel (Short Haul)', unit: 'km', factor: 0.000255, source: 'ICAO Carbon Calculator' },
  { id: 7, category_id: 3, category: 'Fuel', activity: 'Stationary Diesel Heating', unit: 'liters', factor: 0.002680, source: 'IPCC Guidelines' },
  { id: 8, category_id: 3, category: 'Fuel', activity: 'Natural Gas Heating', unit: 'therms', factor: 0.005300, source: 'EPA GHG Factors' },
  { id: 9, category_id: 3, category: 'Fuel', activity: 'LPG / Bottled Gas', unit: 'gallons', factor: 0.005720, source: 'DEFRA 2026' },
  { id: 10, category_id: 4, category: 'Waste', activity: 'Municipal Solid Waste (Landfill)', unit: 'kg', factor: 0.000450, source: 'EPA WARM Model' },
  { id: 11, category_id: 4, category: 'Waste', activity: 'Commercial Waste Diverted', unit: 'tonnes', factor: 0.450000, source: 'DEFRA Waste Factors' },
  { id: 12, category_id: 5, category: 'Water', activity: 'Municipal Water Supply', unit: 'liters', factor: 0.000298, source: 'UK Water Industry Research' },
  { id: 13, category_id: 5, category: 'Water', activity: 'Wastewater Treatment', unit: 'm³', factor: 0.298000, source: 'Water UK Carbon Accounting' },
  { id: 14, category_id: 6, category: 'Natural Gas', activity: 'Pipeline Gas Combustion', unit: 'therms', factor: 0.005300, source: 'IPCC Stationary Fuel' },
]

