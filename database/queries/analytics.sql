-- ============================================================================
-- ECOINSIGHT — Analytics Queries
-- ============================================================================
-- Supports: GET /api/analytics
--
-- Query parameters: from, to, category, location, industry, sector
-- Example: GET /api/analytics?from=2026-03-01&to=2026-09-30&category=Electricity
--
-- All queries are user-scoped ($1 = user_id).
-- Optional filters: $2-$5 are passed as NULL to skip.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. EMISSIONS OVER TIME (daily)
-- ---------------------------------------------------------
-- Used by: line chart / area chart
-- Parameters: $1=user_id, $2=date_from, $3=date_to,
--             $4=category_id, $5=location

-- name: analytics-emissions-over-time-daily
SELECT
    er.date,
    COALESCE(SUM(er.co2e), 0) AS daily_co2e
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3)
  AND ($4::INTEGER IS NULL OR er.category_id = $4)
  AND ($5::VARCHAR IS NULL OR er.location ILIKE '%' || $5 || '%')
GROUP BY er.date
ORDER BY er.date;


-- ---------------------------------------------------------
-- 2. EMISSIONS OVER TIME (monthly)
-- ---------------------------------------------------------

-- name: analytics-emissions-over-time-monthly
SELECT
    TO_CHAR(DATE_TRUNC('month', er.date), 'YYYY-MM') AS month,
    COALESCE(SUM(er.co2e), 0) AS monthly_co2e
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3)
  AND ($4::INTEGER IS NULL OR er.category_id = $4)
  AND ($5::VARCHAR IS NULL OR er.location ILIKE '%' || $5 || '%')
GROUP BY DATE_TRUNC('month', er.date)
ORDER BY DATE_TRUNC('month', er.date);


-- ---------------------------------------------------------
-- 3. EMISSIONS OVER TIME (weekly)
-- ---------------------------------------------------------

-- name: analytics-emissions-over-time-weekly
SELECT
    TO_CHAR(DATE_TRUNC('week', er.date), 'YYYY-MM-DD') AS week_start,
    COALESCE(SUM(er.co2e), 0) AS weekly_co2e
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3)
  AND ($4::INTEGER IS NULL OR er.category_id = $4)
  AND ($5::VARCHAR IS NULL OR er.location ILIKE '%' || $5 || '%')
GROUP BY DATE_TRUNC('week', er.date)
ORDER BY DATE_TRUNC('week', er.date);


-- ---------------------------------------------------------
-- 4. EMISSIONS BY CATEGORY
-- ---------------------------------------------------------
-- Used by: donut/pie chart, bar chart

-- name: analytics-by-category
SELECT
    ec.id   AS category_id,
    ec.name AS category_name,
    COALESCE(SUM(er.co2e), 0) AS total_co2e,
    COUNT(er.id)               AS record_count,
    ROUND(
        COALESCE(SUM(er.co2e), 0) * 100.0 /
        NULLIF((SELECT SUM(co2e) FROM emission_records WHERE user_id = $1
                AND ($2::DATE IS NULL OR date >= $2)
                AND ($3::DATE IS NULL OR date <= $3)), 0),
        2
    ) AS percentage
FROM emission_categories ec
LEFT JOIN emission_records er
    ON ec.id = er.category_id
    AND er.user_id = $1
    AND ($2::DATE IS NULL OR er.date >= $2)
    AND ($3::DATE IS NULL OR er.date <= $3)
GROUP BY ec.id, ec.name
HAVING COALESCE(SUM(er.co2e), 0) > 0
ORDER BY total_co2e DESC;


-- ---------------------------------------------------------
-- 5. EMISSIONS BY LOCATION
-- ---------------------------------------------------------
-- Used by: geographic visualization / bar chart

-- name: analytics-by-location
SELECT
    er.location,
    COALESCE(SUM(er.co2e), 0) AS total_co2e,
    COUNT(er.id)               AS record_count
FROM emission_records er
WHERE er.user_id = $1
  AND er.location IS NOT NULL
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3)
  AND ($4::INTEGER IS NULL OR er.category_id = $4)
GROUP BY er.location
ORDER BY total_co2e DESC;


-- ---------------------------------------------------------
-- 6. EMISSIONS BY INDUSTRY (across all users — admin/global view)
-- ---------------------------------------------------------
-- Note: For a user-specific view, this shows the user's own industry.
-- For a global analytics view, it aggregates across users by industry.

-- name: analytics-by-industry
SELECT
    u.industry,
    COALESCE(SUM(er.co2e), 0) AS total_co2e,
    COUNT(DISTINCT u.id)       AS user_count,
    COUNT(er.id)               AS record_count
FROM users u
JOIN emission_records er ON u.id = er.user_id
WHERE u.industry IS NOT NULL
  AND ($1::DATE IS NULL OR er.date >= $1)
  AND ($2::DATE IS NULL OR er.date <= $2)
GROUP BY u.industry
ORDER BY total_co2e DESC;


-- ---------------------------------------------------------
-- 7. EMISSIONS BY ACTIVITY (within a category)
-- ---------------------------------------------------------
-- Used by: drill-down analytics

-- name: analytics-by-activity
SELECT
    er.activity,
    er.unit,
    COALESCE(SUM(er.quantity), 0) AS total_quantity,
    COALESCE(SUM(er.co2e), 0)    AS total_co2e,
    COUNT(er.id)                   AS record_count
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::INTEGER IS NULL OR er.category_id = $2)
  AND ($3::DATE IS NULL OR er.date >= $3)
  AND ($4::DATE IS NULL OR er.date <= $4)
GROUP BY er.activity, er.unit
ORDER BY total_co2e DESC;


-- ---------------------------------------------------------
-- 8. YEAR-OVER-YEAR COMPARISON
-- ---------------------------------------------------------
-- Compares current year vs previous year by month.

-- name: analytics-year-over-year
SELECT
    EXTRACT(MONTH FROM er.date)::INTEGER AS month_number,
    TO_CHAR(DATE_TRUNC('month', er.date), 'Mon') AS month_name,
    SUM(CASE WHEN EXTRACT(YEAR FROM er.date) = EXTRACT(YEAR FROM CURRENT_DATE)
             THEN er.co2e ELSE 0 END) AS current_year,
    SUM(CASE WHEN EXTRACT(YEAR FROM er.date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
             THEN er.co2e ELSE 0 END) AS previous_year
FROM emission_records er
WHERE er.user_id = $1
  AND er.date >= (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year')
GROUP BY EXTRACT(MONTH FROM er.date), TO_CHAR(DATE_TRUNC('month', er.date), 'Mon')
ORDER BY month_number;


-- ---------------------------------------------------------
-- 9. TOP EMISSION SOURCES (activities ranked by co2e)
-- ---------------------------------------------------------

-- name: analytics-top-sources
SELECT
    ec.name  AS category_name,
    er.activity,
    COALESCE(SUM(er.co2e), 0) AS total_co2e,
    COALESCE(SUM(er.quantity), 0) AS total_quantity,
    er.unit
FROM emission_records er
JOIN emission_categories ec ON er.category_id = ec.id
WHERE er.user_id = $1
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3)
GROUP BY ec.name, er.activity, er.unit
ORDER BY total_co2e DESC
LIMIT 10;


-- ---------------------------------------------------------
-- 10. SUMMARY STATISTICS (min, max, avg, total)
-- ---------------------------------------------------------

-- name: analytics-summary
SELECT
    COALESCE(SUM(er.co2e), 0)   AS total_co2e,
    COALESCE(AVG(er.co2e), 0)   AS avg_co2e,
    COALESCE(MIN(er.co2e), 0)   AS min_co2e,
    COALESCE(MAX(er.co2e), 0)   AS max_co2e,
    COUNT(er.id)                 AS total_records,
    MIN(er.date)                 AS earliest_date,
    MAX(er.date)                 AS latest_date
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::DATE IS NULL OR er.date >= $2)
  AND ($3::DATE IS NULL OR er.date <= $3);
