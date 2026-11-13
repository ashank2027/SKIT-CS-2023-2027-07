-- ============================================================================
-- ECOINSIGHT — Migration 006 Down: Rollback Phase 10 Forecasting Data Layer
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    18 December 2026
-- Phase:   Phase 10 Rollback
-- ============================================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trg_forecasts_updated_at ON forecasts;

-- Drop table with cascade (drops dependent indexes and foreign keys)
DROP TABLE IF EXISTS forecasts CASCADE;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 006 DOWN
-- ============================================================================
