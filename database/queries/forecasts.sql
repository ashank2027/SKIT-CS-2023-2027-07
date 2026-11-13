-- ============================================================================
-- ECOINSIGHT — Forecasting & Predictive Data Queries
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Phase:   Phase 10 — Forecasting Data Layer & Historical Feeds (21 Nov – 18 Dec 2026)
--
-- Supports:
--   - GET  /api/forecast              (Fetch user's historical and predicted emissions)
--   - POST /api/forecast/generate     (Trigger historical data extraction & forecast generation)
--   - GET  /api/forecast/accuracy     (Calculate model accuracy metrics vs actuals)
--   - GET  /api/forecast/compare      (Direct actual vs predicted monthly comparison)
--
-- Strict Contract Adherence:
--   - Actual historical data is sourced from `emission_records`.
--   - Projections are persisted in `forecasts` (strictly separated from actuals).
--   - Chart-ready output format matches frontend Recharts specification:
--     { historical: [{ period, actual }], forecast: [{ period, predicted, lower, upper }] }
--
-- All queries enforce user isolation via parameterized user_id filtering.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. GET HISTORICAL TRAINING SERIES (Model Feature Feed)
-- ---------------------------------------------------------
-- Used by: POST /api/forecast/generate (extract clean monthly historical data
--          to feed the linear/polynomial/neural forecasting engine)
-- Parameters: $1 = user_id, $2 = limit_months (optional, defaults to 24)

-- name: get-historical-training-series
SELECT
    TO_CHAR(date, 'YYYY-MM') AS period,
    ROUND(SUM(co2e)::NUMERIC, 4) AS actual,
    COUNT(id) AS record_count,
    MIN(date) AS period_start,
    MAX(date) AS period_end
FROM emission_records
WHERE user_id = $1
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY period ASC
LIMIT COALESCE($2, 24);


-- ---------------------------------------------------------
-- 2. GET HISTORICAL TRAINING SERIES BY CATEGORY
-- ---------------------------------------------------------
-- Used by: Multi-variable forecasting models requiring sectoral breakdowns
-- Parameters: $1 = user_id, $2 = category_id (optional)

-- name: get-historical-training-series-by-category
SELECT
    TO_CHAR(r.date, 'YYYY-MM') AS period,
    c.id AS category_id,
    c.name AS category_name,
    ROUND(SUM(r.co2e)::NUMERIC, 4) AS actual,
    COUNT(r.id) AS record_count
FROM emission_records r
JOIN emission_categories c ON r.category_id = c.id
WHERE r.user_id = $1
  AND ($2::INTEGER IS NULL OR r.category_id = $2)
GROUP BY TO_CHAR(r.date, 'YYYY-MM'), c.id, c.name
ORDER BY period ASC, c.name ASC;


-- ---------------------------------------------------------
-- 3. INSERT / UPSERT SINGLE FORECAST POINT
-- ---------------------------------------------------------
-- Used by: Asynchronous scheduler worker or forecasting engine saving predictions
-- Parameters:
--   $1 = user_id
--   $2 = task_id (optional)
--   $3 = period ('YYYY-MM')
--   $4 = predicted_co2e
--   $5 = confidence_lower (optional)
--   $6 = confidence_upper (optional)
--   $7 = model_version (defaults to 'linear-regression-v1')

-- name: insert-forecast-point
INSERT INTO forecasts (
    user_id,
    task_id,
    period,
    predicted_co2e,
    confidence_lower,
    confidence_upper,
    model_version
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    COALESCE($7, 'linear-regression-v1')
)
ON CONFLICT (user_id, period, model_version)
DO UPDATE SET
    task_id = EXCLUDED.task_id,
    predicted_co2e = EXCLUDED.predicted_co2e,
    confidence_lower = EXCLUDED.confidence_lower,
    confidence_upper = EXCLUDED.confidence_upper,
    updated_at = NOW()
RETURNING
    id,
    user_id,
    task_id,
    period,
    predicted_co2e,
    confidence_lower,
    confidence_upper,
    model_version,
    created_at,
    updated_at;


-- ---------------------------------------------------------
-- 4. GET LATEST USER FORECAST (Chart Projections)
-- ---------------------------------------------------------
-- Used by: GET /api/forecast (retrieves the active future projection series)
-- Parameters: $1 = user_id, $2 = model_version (optional)

-- name: get-latest-user-forecast
SELECT
    f.id,
    f.period,
    ROUND(f.predicted_co2e::NUMERIC, 2) AS predicted,
    ROUND(f.confidence_lower::NUMERIC, 2) AS lower,
    ROUND(f.confidence_upper::NUMERIC, 2) AS upper,
    f.model_version,
    f.task_id,
    f.created_at,
    f.updated_at
FROM forecasts f
WHERE f.user_id = $1
  AND ($2::VARCHAR IS NULL OR f.model_version = $2)
ORDER BY f.period ASC;


-- ---------------------------------------------------------
-- 5. GET FORECAST BY PERIOD RANGE
-- ---------------------------------------------------------
-- Used by: Custom date-filtered forecast viewers
-- Parameters: $1 = user_id, $2 = start_period, $3 = end_period, $4 = model_version (optional)

-- name: get-forecast-by-period-range
SELECT
    f.id,
    f.period,
    ROUND(f.predicted_co2e::NUMERIC, 2) AS predicted,
    ROUND(f.confidence_lower::NUMERIC, 2) AS lower,
    ROUND(f.confidence_upper::NUMERIC, 2) AS upper,
    f.model_version,
    f.created_at
FROM forecasts f
WHERE f.user_id = $1
  AND f.period >= $2
  AND f.period <= $3
  AND ($4::VARCHAR IS NULL OR f.model_version = $4)
ORDER BY f.period ASC;


-- ---------------------------------------------------------
-- 6. GET FORECAST VS ACTUAL (Comparative Analysis)
-- ---------------------------------------------------------
-- Used by: Actual vs Predicted comparison chart on /forecast page
-- Parameters: $1 = user_id, $2 = model_version (optional)

-- name: get-forecast-vs-actual
WITH actual_monthly AS (
    SELECT
        TO_CHAR(date, 'YYYY-MM') AS period,
        ROUND(SUM(co2e)::NUMERIC, 2) AS actual_co2e
    FROM emission_records
    WHERE user_id = $1
    GROUP BY TO_CHAR(date, 'YYYY-MM')
),
predicted_monthly AS (
    SELECT
        period,
        ROUND(predicted_co2e::NUMERIC, 2) AS predicted_co2e,
        ROUND(confidence_lower::NUMERIC, 2) AS confidence_lower,
        ROUND(confidence_upper::NUMERIC, 2) AS confidence_upper,
        model_version
    FROM forecasts
    WHERE user_id = $1
      AND ($2::VARCHAR IS NULL OR model_version = $2)
)
SELECT
    COALESCE(a.period, p.period) AS period,
    a.actual_co2e,
    p.predicted_co2e,
    p.confidence_lower,
    p.confidence_upper,
    CASE 
        WHEN a.actual_co2e IS NOT NULL AND p.predicted_co2e IS NOT NULL 
        THEN ROUND((a.actual_co2e - p.predicted_co2e)::NUMERIC, 2)
        ELSE NULL 
    END AS variance,
    CASE 
        WHEN a.actual_co2e IS NOT NULL AND p.predicted_co2e IS NOT NULL AND a.actual_co2e > 0
        THEN ROUND((ABS(a.actual_co2e - p.predicted_co2e) / a.actual_co2e * 100)::NUMERIC, 2)
        ELSE NULL 
    END AS error_percentage,
    p.model_version
FROM actual_monthly a
FULL OUTER JOIN predicted_monthly p ON a.period = p.period
ORDER BY period ASC;


-- ---------------------------------------------------------
-- 7. GET FORECAST ACCURACY METRICS (Model Benchmarking)
-- ---------------------------------------------------------
-- Used by: GET /api/forecast/accuracy (evaluates model performance metrics)
-- Parameters: $1 = user_id, $2 = model_version (optional)

-- name: get-forecast-accuracy-metrics
WITH comparative_points AS (
    SELECT
        a.actual_co2e,
        p.predicted_co2e,
        ABS(a.actual_co2e - p.predicted_co2e) AS abs_error,
        POWER(a.actual_co2e - p.predicted_co2e, 2) AS squared_error,
        CASE 
            WHEN a.actual_co2e > 0 THEN (ABS(a.actual_co2e - p.predicted_co2e) / a.actual_co2e) * 100 
            ELSE NULL 
        END AS pct_error
    FROM (
        SELECT
            TO_CHAR(date, 'YYYY-MM') AS period,
            SUM(co2e) AS actual_co2e
        FROM emission_records
        WHERE user_id = $1
        GROUP BY TO_CHAR(date, 'YYYY-MM')
    ) a
    JOIN (
        SELECT
            period,
            predicted_co2e
        FROM forecasts
        WHERE user_id = $1
          AND ($2::VARCHAR IS NULL OR model_version = $2)
    ) p ON a.period = p.period
)
SELECT
    COUNT(*) AS evaluated_periods,
    ROUND(AVG(abs_error)::NUMERIC, 2) AS mae,               -- Mean Absolute Error
    ROUND(SQRT(AVG(squared_error))::NUMERIC, 2) AS rmse,    -- Root Mean Square Error
    ROUND(AVG(pct_error)::NUMERIC, 2) AS mape,              -- Mean Absolute Percentage Error (%)
    ROUND((100.0 - COALESCE(AVG(pct_error), 0))::NUMERIC, 2) AS accuracy_score -- Accuracy Percentage
FROM comparative_points;


-- ---------------------------------------------------------
-- 8. GET FORECAST SUMMARY KPI METRICS
-- ---------------------------------------------------------
-- Used by: Forecast page KPI summary cards (Projected Q1, Reduction Velocity, Trajectory)
-- Parameters: $1 = user_id, $2 = model_version (optional)

-- name: get-forecast-summary-metrics
WITH recent_actual AS (
    SELECT
        ROUND(SUM(co2e)::NUMERIC, 2) AS actual_last_3_months
    FROM emission_records
    WHERE user_id = $1
      AND date >= (CURRENT_DATE - INTERVAL '3 months')
),
projected_next AS (
    SELECT
        ROUND(SUM(predicted_co2e)::NUMERIC, 2) AS projected_next_3_months,
        COUNT(id) AS projection_count,
        MIN(predicted_co2e) AS min_projected,
        MAX(predicted_co2e) AS max_projected
    FROM (
        SELECT id, predicted_co2e
        FROM forecasts
        WHERE user_id = $1
          AND ($2::VARCHAR IS NULL OR model_version = $2)
        ORDER BY period ASC
        LIMIT 3
    ) next_pts
)
SELECT
    ra.actual_last_3_months,
    pn.projected_next_3_months,
    pn.projection_count,
    CASE
        WHEN ra.actual_last_3_months > 0 AND pn.projected_next_3_months IS NOT NULL
        THEN ROUND(((pn.projected_next_3_months - ra.actual_last_3_months) / ra.actual_last_3_months * 100)::NUMERIC, 2)
        ELSE NULL
    END AS projected_change_pct,
    CASE
        WHEN ra.actual_last_3_months > 0 AND pn.projected_next_3_months IS NOT NULL
        THEN ROUND(((pn.projected_next_3_months - ra.actual_last_3_months) / 3.0)::NUMERIC, 2)
        ELSE NULL
    END AS monthly_reduction_velocity
FROM recent_actual ra
CROSS JOIN projected_next pn;


-- ---------------------------------------------------------
-- 9. DELETE USER FORECASTS
-- ---------------------------------------------------------
-- Used by: Regenerating forecast runs or clearing obsolete model outputs
-- Parameters: $1 = user_id, $2 = model_version (optional)

-- name: delete-user-forecasts
DELETE FROM forecasts
WHERE user_id = $1
  AND ($2::VARCHAR IS NULL OR model_version = $2)
RETURNING id, period, model_version;


-- ---------------------------------------------------------
-- 10. DELETE FORECAST BY TASK ID
-- ---------------------------------------------------------
-- Used by: Scheduler rollback when a task fails or is aborted
-- Parameters: $1 = task_id, $2 = user_id

-- name: delete-forecast-by-task-id
DELETE FROM forecasts
WHERE task_id = $1 AND user_id = $2
RETURNING id, period;
