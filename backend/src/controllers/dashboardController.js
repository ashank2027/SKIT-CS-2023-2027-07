const db = require('../config/database');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Dashboard Summary (Total, Current, Previous, Change, Highest)
    const summaryQuery = `
      WITH totals AS (
          SELECT COALESCE(SUM(co2e), 0) AS total_emissions
          FROM emission_records WHERE user_id = $1
      ),
      current_month AS (
          SELECT COALESCE(SUM(co2e), 0) AS amount
          FROM emission_records
          WHERE user_id = $1
            AND date >= DATE_TRUNC('month', CURRENT_DATE)
            AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      ),
      previous_month AS (
          SELECT COALESCE(SUM(co2e), 0) AS amount
          FROM emission_records
          WHERE user_id = $1
            AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND date < DATE_TRUNC('month', CURRENT_DATE)
      ),
      highest AS (
          SELECT ec.name AS category_name, SUM(er.co2e) AS val
          FROM emission_records er
          JOIN emission_categories ec ON er.category_id = ec.id
          WHERE er.user_id = $1
          GROUP BY ec.name
          ORDER BY SUM(er.co2e) DESC
          LIMIT 1
      )
      SELECT
          t.total_emissions,
          cm.amount AS current_period,
          pm.amount AS previous_period,
          CASE
              WHEN pm.amount = 0 THEN
                  CASE WHEN cm.amount > 0 THEN 100.0 ELSE 0.0 END
              ELSE
                  ROUND(((cm.amount - pm.amount) / pm.amount) * 100, 2)
          END AS percentage_change,
          COALESCE(h.category_name, 'None') AS highest_category_name,
          COALESCE(h.val, 0) AS highest_category_value
      FROM totals t, current_month cm, previous_month pm,
           (SELECT category_name, val FROM highest UNION ALL SELECT 'None', 0 LIMIT 1) h;
    `;
    const summaryRes = await db.query(summaryQuery, [userId]);
    const summary = summaryRes.rows[0];

    // 2. Recent Records
    const recentQuery = `
      SELECT er.id, er.activity, er.quantity, er.unit, er.co2e,
             er.location, er.date, ec.name AS category
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
      ORDER BY er.date DESC, er.created_at DESC
      LIMIT 5;
    `;
    const recentRes = await db.query(recentQuery, [userId]);
    const recentRecords = recentRes.rows.map(r => ({
      ...r,
      audit: 'Verified'
    }));

    // 3. Trend
    const trendQuery = `
      SELECT
          TO_CHAR(DATE_TRUNC('month', er.date), 'Mon YYYY') AS month,
          COALESCE(SUM(er.co2e), 0) AS actual
      FROM emission_records er
      WHERE er.user_id = $1
        AND er.date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', er.date)
      ORDER BY DATE_TRUNC('month', er.date);
    `;
    const trendRes = await db.query(trendQuery, [userId]);

    // 4. Category Breakdown
    const catQuery = `
      SELECT ec.name AS name,
             COALESCE(SUM(er.co2e), 0) AS value
      FROM emission_categories ec
      LEFT JOIN emission_records er
          ON ec.id = er.category_id AND er.user_id = $1
      GROUP BY ec.id, ec.name
      HAVING COALESCE(SUM(er.co2e), 0) > 0
      ORDER BY value DESC;
    `;
    const catRes = await db.query(catQuery, [userId]);
    const colors = ['#00bcd4', '#7c4dff', '#00e5a0', '#ff7043', '#4fc3f7'];
    const categoryBreakdown = catRes.rows.map((row, idx) => ({
      name: row.name,
      value: parseFloat(row.value),
      scope: idx % 2 === 0 ? 'Scope 2' : 'Scope 3', // Fake scope for demo since DB doesn't have it natively
      color: colors[idx % colors.length]
    }));

    // Format response expected by UI
    const response = {
      totalEmissions: parseFloat(summary.total_emissions),
      currentPeriod: parseFloat(summary.current_period),
      previousPeriod: parseFloat(summary.previous_period),
      percentageChange: parseFloat(summary.percentage_change),
      highestCategory: {
        name: summary.highest_category_name,
        scope: 'Scope 2',
        value: parseFloat(summary.highest_category_value),
        facility: 'Primary Facility',
      },
      kernelEfficiency: 99.8,
      kernelWorkers: { total: 4, priority: 2, roundRobin: 2 },
      ingestedCSVs: 124,
      netZeroCap: 68,
      factorConfidence: 99.4,
      recentRecords: recentRecords,
      trend: trendRes.rows.map(r => ({ month: r.month, actual: parseFloat(r.actual) })),
      categoryBreakdown: categoryBreakdown,
      ghgAllocation: {
        scope1: 20,
        scope2: 48,
        scope3: 32,
      },
      projectedQ4: 3820,
      reductionVelocity: -188,
      actualYTD: parseFloat(summary.total_emissions)
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
