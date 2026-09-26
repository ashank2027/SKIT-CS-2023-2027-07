-- ============================================================================
-- ECOINSIGHT — Dashboard Aggregation Queries
-- ============================================================================
-- Supports: GET /api/dashboard
--
-- Response contract:
-- {
--   "totalEmissions":    <number>,
--   "currentPeriod":     <number>,
--   "previousPeriod":    <number>,
--   "percentageChange":  <number>,
--   "highestCategory":   <string>,
--   "recentRecords":     [],
--   "trend":             [],
--   "categoryBreakdown": []
-- }
--
-- All queries are user-scoped ($1 = user_id).
-- ============================================================================


-- ---------------------------------------------------------
-- 1. TOTAL EMISSIONS (all time)
-- ---------------------------------------------------------

-- name: dashboard-total-emissions
SELECT COALESCE(SUM(co2e), 0) AS total_emissions
FROM emission_records
WHERE user_id = $1;


-- ---------------------------------------------------------
-- 2. CURRENT PERIOD EMISSIONS (current month)
-- ---------------------------------------------------------

-- name: dashboard-current-period
SELECT COALESCE(SUM(co2e), 0) AS current_period
FROM emission_records
WHERE user_id = $1
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
  AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';


-- ---------------------------------------------------------
-- 3. PREVIOUS PERIOD EMISSIONS (previous month)
-- ---------------------------------------------------------

-- name: dashboard-previous-period
SELECT COALESCE(SUM(co2e), 0) AS previous_period
FROM emission_records
WHERE user_id = $1
  AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
  AND date < DATE_TRUNC('month', CURRENT_DATE);


-- ---------------------------------------------------------
-- 4. PERCENTAGE CHANGE (current vs previous month)
-- ---------------------------------------------------------
-- Returns percentage change. Handles division-by-zero.

-- name: dashboard-percentage-change
SELECT
    CASE
        WHEN prev.total = 0 THEN
            CASE WHEN curr.total > 0 THEN 100.0 ELSE 0.0 END
        ELSE
            ROUND(((curr.total - prev.total) / prev.total) * 100, 2)
    END AS percentage_change
FROM (
    SELECT COALESCE(SUM(co2e), 0) AS total
    FROM emission_records
    WHERE user_id = $1
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
      AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
) curr,
(
    SELECT COALESCE(SUM(co2e), 0) AS total
    FROM emission_records
    WHERE user_id = $1
      AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND date < DATE_TRUNC('month', CURRENT_DATE)
) prev;


-- ---------------------------------------------------------
-- 5. HIGHEST EMISSION CATEGORY
-- ---------------------------------------------------------
-- Returns the category with the highest total co2e for the user.

-- name: dashboard-highest-category
SELECT ec.name AS category_name,
       COALESCE(SUM(er.co2e), 0) AS total_co2e
FROM emission_records er
JOIN emission_categories ec ON er.category_id = ec.id
WHERE er.user_id = $1
GROUP BY ec.name
ORDER BY total_co2e DESC
LIMIT 1;


-- ---------------------------------------------------------
-- 6. RECENT EMISSION RECORDS (last 10)
-- ---------------------------------------------------------

-- name: dashboard-recent-records
SELECT er.id, er.activity, er.quantity, er.unit, er.co2e,
       er.location, er.date, ec.name AS category_name
FROM emission_records er
JOIN emission_categories ec ON er.category_id = ec.id
WHERE er.user_id = $1
ORDER BY er.date DESC, er.created_at DESC
LIMIT 10;


-- ---------------------------------------------------------
-- 7. EMISSION TREND (monthly totals for last 12 months)
-- ---------------------------------------------------------
-- Returns one row per month with total co2e.

-- name: dashboard-trend
SELECT
    TO_CHAR(DATE_TRUNC('month', er.date), 'YYYY-MM') AS month,
    COALESCE(SUM(er.co2e), 0) AS total_co2e
FROM emission_records er
WHERE er.user_id = $1
  AND er.date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', er.date)
ORDER BY DATE_TRUNC('month', er.date);


-- ---------------------------------------------------------
-- 8. CATEGORY BREAKDOWN (total co2e per category)
-- ---------------------------------------------------------

-- name: dashboard-category-breakdown
SELECT ec.id   AS category_id,
       ec.name AS category_name,
       COALESCE(SUM(er.co2e), 0) AS total_co2e,
       COUNT(er.id) AS record_count
FROM emission_categories ec
LEFT JOIN emission_records er
    ON ec.id = er.category_id AND er.user_id = $1
GROUP BY ec.id, ec.name
ORDER BY total_co2e DESC;


-- ---------------------------------------------------------
-- 9. FULL DASHBOARD (single combined query)
-- ---------------------------------------------------------
-- This CTE-based query returns the dashboard summary in one call.
-- Backend can use this instead of multiple individual queries.

-- name: dashboard-summary
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
    SELECT ec.name AS category_name
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
    COALESCE(h.category_name, 'None') AS highest_category
FROM totals t, current_month cm, previous_month pm,
     (SELECT category_name FROM highest UNION ALL SELECT 'None' LIMIT 1) h;
