const db = require('../config/database');

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
      // We will need a join with emission_categories for this filter if it's based on category name
      // but for simplicity let's assume it's category_id or we join it in the query.
      baseFilters += ` AND ec.name = $${paramCount}`;
      filterValues.push(category);
    }
    if (location) {
      paramCount++;
      baseFilters += ` AND er.location ILIKE $${paramCount}`;
      filterValues.push(`%${location}%`);
    }

    // 1. Emissions Over Time (monthly)
    const timeQuery = `
      SELECT
          TO_CHAR(DATE_TRUNC('month', er.date), 'YYYY-MM') AS period,
          COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_records er
      LEFT JOIN emission_categories ec ON er.category_id = ec.id
      WHERE ${baseFilters}
      GROUP BY DATE_TRUNC('month', er.date)
      ORDER BY DATE_TRUNC('month', er.date);
    `;
    const timeRes = await db.query(timeQuery, filterValues);
    const emissionsByTime = timeRes.rows.map(r => ({ period: r.period, value: parseFloat(r.value) }));

    // 2. Emissions By Category
    const catQuery = `
      SELECT
          ec_main.name,
          COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_records er
      LEFT JOIN emission_categories ec ON er.category_id = ec.id
      LEFT JOIN emission_categories ec_main ON er.category_id = ec_main.id
      WHERE ${baseFilters}
      GROUP BY ec_main.id, ec_main.name
      HAVING COALESCE(SUM(er.co2e), 0) > 0
      ORDER BY value DESC;
    `;
    const catRes = await db.query(catQuery, filterValues);
    const colors = ['#00bcd4', '#7c4dff', '#ff7043', '#ffab00', '#4fc3f7'];
    const emissionsByCategory = catRes.rows.map((row, idx) => ({
      name: row.name,
      value: parseFloat(row.value),
      fill: colors[idx % colors.length]
    }));

    // 3. Emissions By Location
    const locQuery = `
      SELECT
          er.location AS name,
          COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_records er
      LEFT JOIN emission_categories ec ON er.category_id = ec.id
      WHERE ${baseFilters} AND er.location IS NOT NULL
      GROUP BY er.location
      ORDER BY value DESC;
    `;
    const locRes = await db.query(locQuery, filterValues);
    const emissionsByLocation = locRes.rows.map(r => ({ name: r.name, value: parseFloat(r.value) }));

    const response = {
      emissionsByTime,
      emissionsByCategory,
      emissionsByLocation
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
