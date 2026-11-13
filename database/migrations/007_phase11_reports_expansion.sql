-- ============================================================================
-- ECOINSIGHT — Migration 007: Phase 11 Reports & PDF Export Metadata Expansion
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    30 December 2026
-- Phase:   Phase 11 — Reports & PDF Export Metadata (19 Dec – 30 Dec 2026)
--
-- Description:
--   1. Enhances `reports` table to support background PDF compilation via
--      Ashank's C++ scheduler and rich audit downloads:
--      - `task_id`: Links report record directly to the background scheduler task.
--      - `file_size_bytes`: Stores PDF file payload size in bytes.
--      - `download_count`: Tracks audit download activity by compliance officers.
--      - `generated_at`: Timestamp when C++ scheduler finished PDF rendering.
--      - `error_message`: Captures error diagnostic if PDF generation fails.
--      - `summary_json`: Structured JSON snapshot of key period KPIs
--        (total_co2e, category breakdown, top contributor, net zero progress).
--   2. Broadens `status` check constraint to encompass full lifecycle:
--      'PENDING', 'QUEUED', 'GENERATING', 'RUNNING', 'COMPLETED', 'FAILED'.
--   3. Adds high-performance indexes for report history pagination, scheduler
--      task linkage, status filtering, and period-range queries.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADD EXPANDED METADATA COLUMNS TO reports
-- ----------------------------------------------------------------------------

-- Link report record to scheduler task
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS task_id INTEGER DEFAULT NULL
        REFERENCES tasks (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

-- File size in bytes of the generated PDF artifact
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT NULL
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0);

-- Number of times this report has been downloaded
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0
        CHECK (download_count >= 0);

-- Exact completion timestamp of the PDF compilation
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Diagnostic error explanation if status = 'FAILED'
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL;

-- Structured summary snapshot of reporting period emissions
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS summary_json JSONB DEFAULT NULL;


-- ----------------------------------------------------------------------------
-- 2. EXPAND STATUS CHECK CONSTRAINT
-- ----------------------------------------------------------------------------

-- Drop old check constraint on status (if exists) and re-create with expanded set
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'reports'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE reports DROP CONSTRAINT ' || quote_ident(v_constraint_name);
    END IF;
END $$;

ALTER TABLE reports
    ADD CONSTRAINT chk_reports_status
        CHECK (status IN (
            'PENDING',
            'QUEUED',
            'GENERATING',
            'RUNNING',
            'COMPLETED',
            'FAILED'
        ));


-- ----------------------------------------------------------------------------
-- 3. HIGH-PERFORMANCE REPORT INDEXES
-- ----------------------------------------------------------------------------

-- Chronological user reports history for sidebar and pagination
CREATE INDEX IF NOT EXISTS idx_reports_user_created
    ON reports (user_id, created_at DESC);

-- Fast lookup by scheduler task ID for worker callbacks
CREATE INDEX IF NOT EXISTS idx_reports_task_id
    ON reports (task_id)
    WHERE task_id IS NOT NULL;

-- Report status filtering (e.g., active queued/running jobs vs completed)
CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON reports (status, created_at DESC);

-- Period-range lookup to prevent redundant overlapping report requests
CREATE INDEX IF NOT EXISTS idx_reports_period_range
    ON reports (user_id, period_start, period_end);

COMMIT;

-- ============================================================================
-- END OF MIGRATION 007
-- ============================================================================
