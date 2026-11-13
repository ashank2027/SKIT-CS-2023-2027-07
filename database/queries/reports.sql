-- ============================================================================
-- ECOINSIGHT — Report Queries & PDF Export Engine
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Phase:   Phase 11 — Reports & PDF Export Metadata (19 Dec – 30 Dec 2026)
--
-- Supports:
--   - POST   /api/reports             (Request new PDF report generation)
--   - GET    /api/reports             (List user reports with pagination & status)
--   - GET    /api/reports/:id         (Fetch report details & download file link)
--   - GET    /api/reports/:id/download(Track PDF download and increment counter)
--   - DELETE /api/reports/:id         (Delete report entry and file reference)
--   - GET    /api/reports/metrics     (System audit of report generation performance)
--
-- Integration:
--   - Connects with Ashank's C++ Scheduler via `task_id`.
--   - Single-query comprehensive period extraction (`get-comprehensive-period-report`)
--     assembles all data needed for the PDF rendering pipeline:
--     total emissions, category percentages, peak month, and top 5 emitting activities.
--
-- All user queries are strictly scoped by user_id to enforce data isolation.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE REPORT RECORD (Metadata Entry)
-- ---------------------------------------------------------
-- Used by: POST /api/reports (backend creates this before launching scheduler task)
-- Parameters:
--   $1 = user_id
--   $2 = report_type (SUSTAINABILITY, MONTHLY, QUARTERLY, ANNUAL, CUSTOM)
--   $3 = period_start (DATE)
--   $4 = period_end (DATE)
--   $5 = task_id (optional, foreign key to tasks table)
--   $6 = initial_status (optional, defaults to 'QUEUED')

-- name: create-report-record
INSERT INTO reports (
    user_id,
    report_type,
    period_start,
    period_end,
    task_id,
    status
)
VALUES (
    $1,
    COALESCE($2, 'SUSTAINABILITY'),
    $3,
    $4,
    $5,
    COALESCE($6, 'QUEUED')
)
RETURNING
    id,
    user_id,
    report_type,
    period_start,
    period_end,
    task_id,
    status,
    download_count,
    created_at;


-- ---------------------------------------------------------
-- 2. GET REPORT BY ID (Full Metadata & Download Link)
-- ---------------------------------------------------------
-- Used by: GET /api/reports/:id
-- Parameters: $1 = report_id, $2 = user_id

-- name: get-report-by-id
SELECT
    r.id,
    r.user_id,
    r.task_id,
    r.report_type,
    r.period_start,
    r.period_end,
    r.status,
    r.file_reference,
    r.file_size_bytes,
    r.download_count,
    r.generated_at,
    r.error_message,
    r.summary_json,
    r.created_at,
    r.updated_at,
    t.status AS task_status,
    t.retry_count AS task_retries
FROM reports r
LEFT JOIN tasks t ON r.task_id = t.id
WHERE r.id = $1 AND r.user_id = $2;


-- ---------------------------------------------------------
-- 3. LIST ALL REPORTS FOR USER (History & Download Table)
-- ---------------------------------------------------------
-- Used by: GET /api/reports
-- Parameters:
--   $1 = user_id
--   $2 = optional status filter ('COMPLETED', 'QUEUED', 'RUNNING', 'FAILED')
--   $3 = limit (defaults to 50)
--   $4 = offset (defaults to 0)

-- name: list-user-reports
SELECT
    r.id,
    r.report_type,
    r.period_start,
    r.period_end,
    r.status,
    r.file_reference,
    r.file_size_bytes,
    r.download_count,
    r.generated_at,
    r.created_at,
    r.task_id,
    r.summary_json->>'total_co2e' AS summary_total_co2e
FROM reports r
WHERE r.user_id = $1
  AND ($2::VARCHAR IS NULL OR r.status = $2)
ORDER BY r.created_at DESC
LIMIT COALESCE($3, 50)
OFFSET COALESCE($4, 0);


-- ---------------------------------------------------------
-- 4. UPDATE REPORT STATUS & COMPLETED ARTIFACT
-- ---------------------------------------------------------
-- Used by: C++ Scheduler callback when PDF rendering finishes successfully
-- Parameters:
--   $1 = report_id
--   $2 = user_id
--   $3 = status ('COMPLETED')
--   $4 = file_reference (PDF URI or file system path)
--   $5 = file_size_bytes
--   $6 = summary_json (JSONB summary object)

-- name: update-report-status
UPDATE reports
SET
    status = $3,
    file_reference = COALESCE($4, file_reference),
    file_size_bytes = COALESCE($5, file_size_bytes),
    summary_json = COALESCE($6, summary_json),
    generated_at = CASE WHEN $3 = 'COMPLETED' THEN NOW() ELSE generated_at END,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING
    id,
    status,
    file_reference,
    file_size_bytes,
    generated_at,
    updated_at;


-- ---------------------------------------------------------
-- 5. MARK REPORT FAILED (Diagnostic Logging)
-- ---------------------------------------------------------
-- Used by: C++ Scheduler callback when PDF rendering fails or times out
-- Parameters:
--   $1 = report_id
--   $2 = user_id
--   $3 = error_message

-- name: mark-report-failed
UPDATE reports
SET
    status = 'FAILED',
    error_message = $3,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, status, error_message, updated_at;


-- ---------------------------------------------------------
-- 6. INCREMENT REPORT DOWNLOAD COUNT
-- ---------------------------------------------------------
-- Used by: GET /api/reports/:id/download
-- Parameters: $1 = report_id, $2 = user_id

-- name: increment-report-download-count
UPDATE reports
SET
    download_count = download_count + 1,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, download_count, file_reference;


-- ---------------------------------------------------------
-- 7. DELETE REPORT
-- ---------------------------------------------------------
-- Used by: DELETE /api/reports/:id
-- Parameters: $1 = report_id, $2 = user_id

-- name: delete-report
DELETE FROM reports
WHERE id = $1 AND user_id = $2
RETURNING id, file_reference;


-- ---------------------------------------------------------
-- 8. COMPREHENSIVE PERIOD REPORT AGGREGATION
-- ---------------------------------------------------------
-- Used by: C++ PDF generation engine and backend report compiler.
-- Assembles all statistics for the reporting period in a single SQL query:
--   - Overall total CO2e and record count
--   - Sectoral breakdown with percentages formatted as JSON
--   - Peak emitting calendar month
--   - Top 5 emitting activities
-- Parameters:
--   $1 = user_id
--   $2 = period_start (DATE)
--   $3 = period_end (DATE)

-- name: get-comprehensive-period-report
WITH period_records AS (
    SELECT
        r.id,
        r.category_id,
        c.name AS category_name,
        r.activity,
        r.quantity,
        r.unit,
        r.co2e,
        r.location,
        r.date,
        TO_CHAR(r.date, 'YYYY-MM') AS month_period
    FROM emission_records r
    JOIN emission_categories c ON r.category_id = c.id
    WHERE r.user_id = $1
      AND r.date >= $2
      AND r.date <= $3
),
summary_totals AS (
    SELECT
        ROUND(COALESCE(SUM(co2e), 0)::NUMERIC, 2) AS total_co2e,
        COUNT(id) AS total_records,
        COUNT(DISTINCT category_id) AS active_categories,
        COUNT(DISTINCT location) AS active_locations
    FROM period_records
),
category_summary AS (
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'category_name', category_name,
                'total_co2e', cat_total,
                'percentage', CASE 
                    WHEN (SELECT total_co2e FROM summary_totals) > 0 
                    THEN ROUND((cat_total / (SELECT total_co2e FROM summary_totals) * 100)::NUMERIC, 2)
                    ELSE 0.00 
                END
            ) ORDER BY cat_total DESC
        ) AS category_breakdown
    FROM (
        SELECT
            category_name,
            ROUND(SUM(co2e)::NUMERIC, 2) AS cat_total
        FROM period_records
        GROUP BY category_name
    ) cs
),
peak_month_summary AS (
    SELECT
        month_period AS peak_month,
        ROUND(SUM(co2e)::NUMERIC, 2) AS peak_month_co2e
    FROM period_records
    GROUP BY month_period
    ORDER BY peak_month_co2e DESC
    LIMIT 1
),
top_activities_summary AS (
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'activity', activity,
                'category', category_name,
                'total_co2e', act_total,
                'unit', unit
            ) ORDER BY act_total DESC
        ) AS top_activities
    FROM (
        SELECT
            activity,
            category_name,
            unit,
            ROUND(SUM(co2e)::NUMERIC, 2) AS act_total
        FROM period_records
        GROUP BY activity, category_name, unit
        ORDER BY act_total DESC
        LIMIT 5
    ) ta
)
SELECT
    st.total_co2e,
    st.total_records,
    st.active_categories,
    st.active_locations,
    COALESCE(cs.category_breakdown, '[]'::jsonb) AS category_breakdown,
    pm.peak_month,
    pm.peak_month_co2e,
    COALESCE(tas.top_activities, '[]'::jsonb) AS top_activities
FROM summary_totals st
CROSS JOIN category_summary cs
LEFT JOIN peak_month_summary pm ON true
CROSS JOIN top_activities_summary tas;


-- ---------------------------------------------------------
-- 9. GET REPORT GENERATION AUDIT METRICS
-- ---------------------------------------------------------
-- Used by: Admin / audit dashboard to monitor PDF service reliability
-- Parameters: $1 = user_id (optional, NULL returns global system metrics)

-- name: get-report-generation-metrics
SELECT
    COUNT(r.id) AS total_reports,
    COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED') AS completed_reports,
    COUNT(r.id) FILTER (WHERE r.status = 'FAILED') AS failed_reports,
    COUNT(r.id) FILTER (WHERE r.status IN ('QUEUED', 'GENERATING', 'RUNNING')) AS in_flight_reports,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (r.generated_at - r.created_at))) 
        FILTER (WHERE r.status = 'COMPLETED' AND r.generated_at IS NOT NULL)::NUMERIC,
        2
    ) AS avg_generation_duration_seconds,
    COALESCE(SUM(r.download_count), 0) AS total_downloads,
    ROUND(
        (COUNT(r.id) FILTER (WHERE r.status = 'COMPLETED')::NUMERIC / NULLIF(COUNT(r.id), 0) * 100),
        2
    ) AS completion_rate_pct
FROM reports r
WHERE ($1::INTEGER IS NULL OR r.user_id = $1);
