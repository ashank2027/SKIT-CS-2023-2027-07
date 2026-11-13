-- ============================================================================
-- ECOINSIGHT — Migration 007 Down: Rollback Phase 11 Reports Expansion
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    30 December 2026
-- Phase:   Phase 11 Rollback
-- ============================================================================

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_reports_period_range;
DROP INDEX IF EXISTS idx_reports_status_created;
DROP INDEX IF EXISTS idx_reports_task_id;
DROP INDEX IF EXISTS idx_reports_user_created;

-- Drop check constraint and restore original
ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_status;

ALTER TABLE reports
    ADD CONSTRAINT chk_reports_status
        CHECK (status IN (
            'PENDING',
            'GENERATING',
            'COMPLETED',
            'FAILED'
        ));

-- Drop added columns
ALTER TABLE reports DROP COLUMN IF EXISTS summary_json;
ALTER TABLE reports DROP COLUMN IF EXISTS error_message;
ALTER TABLE reports DROP COLUMN IF EXISTS generated_at;
ALTER TABLE reports DROP COLUMN IF EXISTS download_count;
ALTER TABLE reports DROP COLUMN IF EXISTS file_size_bytes;
ALTER TABLE reports DROP COLUMN IF EXISTS task_id;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 007 DOWN
-- ============================================================================
