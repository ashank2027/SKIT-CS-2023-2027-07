-- ============================================================================
-- ECOINSIGHT — Report Queries
-- ============================================================================
-- Supports: POST /api/reports, GET /api/reports, GET /api/reports/:id,
--           DELETE /api/reports/:id
-- All queries are user-scoped.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE REPORT (Metadata)
-- ---------------------------------------------------------
-- Used by: POST /api/reports (backend creates this before launching scheduler task)

-- name: create-report
INSERT INTO reports
    (user_id, report_type, period_start, period_end, status)
VALUES ($1, COALESCE($2, 'SUSTAINABILITY'), $3, $4, 'PENDING')
RETURNING id, report_type, period_start, period_end, status, created_at;


-- ---------------------------------------------------------
-- 2. GET REPORT BY ID
-- ---------------------------------------------------------
-- Used by: GET /api/reports/:id

-- name: get-report-by-id
SELECT id, report_type, period_start, period_end, status,
       file_reference, created_at, updated_at
FROM reports
WHERE id = $1 AND user_id = $2;


-- ---------------------------------------------------------
-- 3. LIST ALL REPORTS FOR USER
-- ---------------------------------------------------------
-- Used by: GET /api/reports

-- name: list-user-reports
SELECT id, report_type, period_start, period_end, status, created_at
FROM reports
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT COALESCE($2, 50)
OFFSET COALESCE($3, 0);


-- ---------------------------------------------------------
-- 4. UPDATE REPORT STATUS & FILE REFERENCE
-- ---------------------------------------------------------
-- Used by: Scheduler integration when PDF generation completes or fails

-- name: update-report-status
UPDATE reports
SET status = $3,
    file_reference = COALESCE($4, file_reference)
WHERE id = $1 AND user_id = $2
RETURNING id, status, file_reference, updated_at;


-- ---------------------------------------------------------
-- 5. DELETE REPORT
-- ---------------------------------------------------------
-- Used by: DELETE /api/reports/:id

-- name: delete-report
DELETE FROM reports
WHERE id = $1 AND user_id = $2
RETURNING id, file_reference;
