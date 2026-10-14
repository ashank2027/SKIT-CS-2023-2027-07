-- ============================================================================
-- ECOINSIGHT — Migration 003 Down: Rollback Phase 9 AI Copilot
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    24 October 2026
-- Phase:   Phase 9 Rollback
-- ============================================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON ai_conversations;

-- Drop tables with cascade (drops dependent indexes and foreign keys)
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 003 DOWN
-- ============================================================================
