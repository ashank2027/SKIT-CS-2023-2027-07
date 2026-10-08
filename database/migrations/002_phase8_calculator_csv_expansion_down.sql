-- ============================================================================
-- ECOINSIGHT — Migration 002 Down: Rollback Phase 8 Expansion
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    08 October 2026
-- Phase:   Phase 8 Rollback
-- ============================================================================

BEGIN;

-- Drop newly added indexes
DROP INDEX IF EXISTS idx_emission_factors_lower_activity_unit;
DROP INDEX IF EXISTS idx_emission_records_user_date_category;

-- Note: We preserve original MVP emission factors and do not delete rows
-- to avoid breaking foreign key constraints on existing user records.

COMMIT;
