/**
 * ============================================================
 * FILE: src/controllers/analyticsController.js
 * ROLE: Advanced Multi-Dimensional Analytics Controller
 * ============================================================
 *
 * This controller powers the dedicated Analytics page in the EcoInsight
 * frontend. Unlike the dashboard (which returns a fixed summary snapshot),
 * this controller accepts flexible query filters and returns multiple datasets
 * needed to render a variety of charts and tables simultaneously. All data is
 * scoped to the authenticated user. Mounted on /api/analytics via
 * analyticsRoutes.js, protected by the `protect` middleware.
 *
 * ──────────────────────────────────────────────────────────────
 * PRIVATE CONSTANTS
 * ──────────────────────────────────────────────────────────────
 *
 * PALETTE_COLORS (array)
 *   Six hex color values matching the EcoInsight frontend design system.
 *   Assigned in round-robin order to category/sector chart segments.
 *
 * SCOPE_DEFINITIONS (array of objects)
 *   Defines the three GHG Protocol scopes used by this application:
 *     Scope 1 (Direct)         — Fuel, Natural Gas → fill: #ff7043 (orange)
 *     Scope 2 (Indirect Energy)— Electricity       → fill: #00e5a0 (green)
 *     Scope 3 (Value Chain)    — Transportation, Waste, Water → fill: #7c4dff (purple)
 *   Each scope object also carries a human-readable description shown in the
 *   scope breakdown table on the analytics page.
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLER
 * ──────────────────────────────────────────────────────────────
 *
 * exports.getAnalytics  — GET /api/analytics
 *   The single handler for this controller. Accepts the following optional
 *   query parameters to filter all returned datasets simultaneously:
 *     from     : ISO date string — only include records on or after this date.
 *     to       : ISO date string — only include records on or before this date.
 *     category : Category name or numeric ID to filter to a single category.
 *     location : Partial text match on the emission record's location field.
 *     sector   : Filter by GHG scope — accepts "Scope 1"/"direct",
 *                "Scope 2"/"indirect", or "Scope 3"/"value".
 *     industry : Filter by the user account's industry field (partial match).
 *
 *   A dynamic WHERE clause (baseFilters / filterValues) is built from the
 *   provided params and reused across most queries to keep filtering consistent.
 *
 *   ── 5 Datasets Returned ──
 *
 *   1. emissionsByTime  (array of { period, value, prevYear })
 *      Monthly totals using a CTE that also computes the previous year's value
 *      for the same month (by shifting dates forward 1 year and LEFT JOINing).
 *      Enables a dual-line "actual vs. previous year" trend chart.
 *      Sorted chronologically by month.
 *
 *   2. emissionsByCategory  (array of { name, value, recordCount, fill })
 *      Total co2e per emission category. Only includes categories with co2e > 0
 *      (HAVING clause). Each entry includes the number of emission records for
 *      that category (useful for tooltips) and a chart fill color.
 *      Sorted descending by total value. Powers the category bar/pie chart.
 *
 *   3. emissionsByLocation  (array of { name, value })
 *      Total co2e per location string, sorted descending. Enables a location-
 *      based breakdown chart showing which facilities/sites emit the most.
 *      Null locations are excluded (WHERE er.location IS NOT NULL).
 *
 *   4. emissionsByIndustry  (array of { name, value, percentage })
 *      Cross-user aggregation: groups ALL users' emission records by the
 *      industry field of their user accounts. This gives a benchmark view
 *      showing how the current user's industry stacks up against others.
 *      Each entry includes the percentage share of the total across all industries.
 *      NOTE: This query uses its own simpler filter (only from/to date range,
 *      no user scoping) because it is intentionally cross-user for benchmarking.
 *
 *   5. emissionsBySector  (array of { name, value, fill, description })
 *      Aggregates emissionsByCategory results into the 3 GHG scopes defined in
 *      SCOPE_DEFINITIONS. Computed in JavaScript (no extra DB query) by summing
 *      the matching category values already retrieved in dataset #2. Powers the
 *      Scope 1/2/3 comparison chart on the analytics page.
 *
 *   FULL RESPONSE (HTTP 200):
 *     {
 *       status: 'success',
 *       emissionsByTime, emissionsByCategory, emissionsByLocation,
 *       emissionsByIndustry, emissionsBySector,
 *       data: { ...same five datasets }   (duplicated for frontend compatibility)
 *     }
 *
 * DATABASE TABLES:
 *   emission_records (primary), emission_categories (joined), users (joined).
 *
 * DEPENDENCIES: database (pg pool).
 * ============================================================
 */
const db = require('../config/database');

// Colors matching frontend theme
const PALETTE_COLORS = ['#00bcd4', '#7c4dff', '#ff7043', '#ffab00', '#4fc3f7', '#00e5a0'];

const SCOPE_DEFINITIONS = [
  {
    name: 'Scope 1 (Direct)',
    fill: '#ff7043',
    description: 'Fuel combustion, company fleet, on-site facilities',
    categories: ['Fuel', 'Natural Gas'],
  },
  {
    name: 'Scope 2 (Indirect Energy)',
    fill: '#00e5a0',
    description: 'Purchased electricity, steam, heating & cooling',
    categories: ['Electricity'],
  },
  {
    name: 'Scope 3 (Value Chain)',
    fill: '#7c4dff',
    description: 'Business travel, waste disposal, purchased goods & logistics',
    categories: ['Transportation', 'Waste', 'Water'],
  },
];

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to, category, location, industry, sector } = req.query;

    let baseFilters = `er.user_id = $1`;
    const filterValues = [userId];
    let paramCount = 1;

    if (from) {
      paramCount++;
      baseFilters += ` AND er.date >= $${paramCount}`;
      filterValues.push(from);
    }
    if (to) {
      paramCount++;
      baseFilters += ` AND er.date <= $${paramCount}`;
      filterValues.push(to);
    }
    if (category) {
      paramCount++;
      if (!isNaN(category)) {
        baseFilters += ` AND er.category_id = $${paramCount}`;
        filterValues.push(parseInt(category, 10));
      } else {
        baseFilters += ` AND ec.name ILIKE $${paramCount}`;
        filterValues.push(category);
      }
    }
    if (location) {
      paramCount++;
      baseFilters += ` AND er.location ILIKE $${paramCount}`;
      filterValues.push(`%${location}%`);
    }

    // Filter by sector if provided (Scope 1, Scope 2, Scope 3)
    if (sector) {
      const sectorLower = sector.toLowerCase();
      if (sectorLower.includes('scope 1') || sectorLower.includes('direct')) {
        baseFilters += ` AND ec.name IN ('Fuel', 'Natural Gas')`;
      } else if (sectorLower.includes('scope 2') || sectorLower.includes('indirect')) {
        baseFilters += ` AND ec.name IN ('Electricity')`;
      } else if (sectorLower.includes('scope 3') || sectorLower.includes('value')) {
        baseFilters += ` AND ec.name IN ('Transportation', 'Waste', 'Water')`;
      }
    }

    // Filter by industry if provided
    if (industry) {
      paramCount++;
      baseFilters += ` AND u.industry ILIKE $${paramCount}`;
      filterValues.push(`%${industry}%`);
    }

    // 1. Emissions Over Time (monthly) with Previous Year comparison
    const timeQuery = `
      WITH current_periods AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', er.date), 'YYYY-MM') AS period,
          DATE_TRUNC('month', er.date) AS month_date,
          COALESCE(SUM(er.co2e), 0) AS value
        FROM emission_records er
        JOIN emission_categories ec ON er.category_id = ec.id
        JOIN users u ON er.user_id = u.id
        WHERE ${baseFilters}
        GROUP BY DATE_TRUNC('month', er.date)
      ),
      prev_periods AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', er.date) + INTERVAL '1 year', 'YYYY-MM') AS match_period,
          COALESCE(SUM(er.co2e), 0) AS prev_value
        FROM emission_records er
        JOIN emission_categories ec ON er.category_id = ec.id
        JOIN users u ON er.user_id = u.id
        WHERE er.user_id = $1
        GROUP BY DATE_TRUNC('month', er.date)
      )
      SELECT
        cp.period,
        cp.value,
        COALESCE(pp.prev_value, 0) AS prev_year
      FROM current_periods cp
      LEFT JOIN prev_periods pp ON cp.period = pp.match_period
      ORDER BY cp.month_date ASC;
    `;
    const timeRes = await db.query(timeQuery, filterValues);
    const emissionsByTime = timeRes.rows.map(r => ({
      period: r.period,
      value: parseFloat(r.value),
      prevYear: parseFloat(r.prev_year) > 0 ? parseFloat(r.prev_year) : null,
    }));

    // 2. Emissions By Category
    const catQuery = `
      SELECT
        ec.name,
        COALESCE(SUM(er.co2e), 0) AS value,
        COUNT(er.id) AS record_count
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      JOIN users u ON er.user_id = u.id
      WHERE ${baseFilters}
      GROUP BY ec.id, ec.name
      HAVING COALESCE(SUM(er.co2e), 0) > 0
      ORDER BY value DESC;
    `;
    const catRes = await db.query(catQuery, filterValues);
    const emissionsByCategory = catRes.rows.map((row, idx) => ({
      name: row.name,
      value: parseFloat(row.value),
      recordCount: parseInt(row.record_count, 10),
      fill: PALETTE_COLORS[idx % PALETTE_COLORS.length],
    }));

    // 3. Emissions By Location
    const locQuery = `
      SELECT
        er.location AS name,
        COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      JOIN users u ON er.user_id = u.id
      WHERE ${baseFilters} AND er.location IS NOT NULL
      GROUP BY er.location
      ORDER BY value DESC;
    `;
    const locRes = await db.query(locQuery, filterValues);
    const emissionsByLocation = locRes.rows.map(r => ({
      name: r.name,
      value: parseFloat(r.value),
    }));

    // 4. Emissions By Industry (aggregated across users for benchmark and industry distribution)
    let indParamCount = 0;
    let indFilter = '';
    const indValues = [];

    if (from) {
      indParamCount++;
      indFilter += ` AND er.date >= $${indParamCount}`;
      indValues.push(from);
    }
    if (to) {
      indParamCount++;
      indFilter += ` AND er.date <= $${indParamCount}`;
      indValues.push(to);
    }

    const indQuery = `
      SELECT
        u.industry AS name,
        COALESCE(SUM(er.co2e), 0) AS value
      FROM users u
      JOIN emission_records er ON u.id = er.user_id
      WHERE u.industry IS NOT NULL ${indFilter}
      GROUP BY u.industry
      ORDER BY value DESC;
    `;
    const indRes = await db.query(indQuery, indValues);
    const totalIndValue = indRes.rows.reduce((sum, r) => sum + parseFloat(r.value), 0);

    const emissionsByIndustry = indRes.rows.map(row => {
      const val = parseFloat(row.value);
      const percentage = totalIndValue > 0 ? Math.round((val / totalIndValue) * 100) : 0;
      return {
        name: row.name,
        value: val,
        percentage,
      };
    });

    // 5. Emissions By Sector (Scope 1, Scope 2, Scope 3)
    const emissionsBySector = SCOPE_DEFINITIONS.map(scope => {
      const matchingCats = catRes.rows.filter(c =>
        scope.categories.some(catName => catName.toLowerCase() === c.name.toLowerCase())
      );
      const scopeValue = matchingCats.reduce((sum, c) => sum + parseFloat(c.value), 0);

      return {
        name: scope.name,
        value: parseFloat(scopeValue.toFixed(2)),
        fill: scope.fill,
        description: scope.description,
      };
    });

    const payload = {
      emissionsByTime,
      emissionsByCategory,
      emissionsByLocation,
      emissionsByIndustry,
      emissionsBySector,
    };

    res.status(200).json({
      status: 'success',
      ...payload,
      data: payload,
    });
  } catch (err) {
    next(err);
  }
};
