const db = require('../config/database');

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Emissions Over Time (monthly)
    const timeQuery = `
      SELECT
          TO_CHAR(DATE_TRUNC('month', er.date), 'YYYY-MM') AS period,
          COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_records er
      WHERE er.user_id = $1
      GROUP BY DATE_TRUNC('month', er.date)
      ORDER BY DATE_TRUNC('month', er.date);
    `;
    const timeRes = await db.query(timeQuery, [userId]);
    const emissionsByTime = timeRes.rows.map(r => ({ period: r.period, value: parseFloat(r.value) }));

    // 2. Emissions By Category
    const catQuery = `
      SELECT
          ec.name,
          COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_categories ec
      LEFT JOIN emission_records er
          ON ec.id = er.category_id
          AND er.user_id = $1
      GROUP BY ec.id, ec.name
      HAVING COALESCE(SUM(er.co2e), 0) > 0
      ORDER BY value DESC;
    `;
    const catRes = await db.query(catQuery, [userId]);
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
      WHERE er.user_id = $1
        AND er.location IS NOT NULL
      GROUP BY er.location
      ORDER BY value DESC;
    `;
    const locRes = await db.query(locQuery, [userId]);
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
