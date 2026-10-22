-- ============================================================================
-- ECOINSIGHT — Migration 004 Down: Rollback Phase 9 AI Search & Token Indexes
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    05 November 2026
-- Phase:   Phase 9 Rollback
--
-- Description:
--   Safely drops full-text search GIN indexes and token performance indexes
--   added in Migration 004.
-- ============================================================================

BEGIN;

-- Drop GIN full-text search indexes
DROP INDEX IF EXISTS idx_ai_messages_content_tsv;
DROP INDEX IF EXISTS idx_ai_conversations_title_tsv;

-- Drop token rate-limiting composite indexes
DROP INDEX IF EXISTS idx_ai_messages_tokens_convo_created;
DROP INDEX IF EXISTS idx_ai_conversations_user_id;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 004 DOWN
-- ============================================================================
