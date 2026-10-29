-- ============================================================================
-- ECOINSIGHT — Phase 9: AI Copilot Streaming & Multi-Turn Integration Rollback
-- ============================================================================
-- Migration: 005_phase9_ai_streaming_integration_down.sql
-- Author:    Bhavya Chautharamani (Lead Database Engineer)
-- Date:      20 November 2026
--
-- Reverses all changes introduced in 005_phase9_ai_streaming_integration.sql:
--   - Drops streaming, latency, and context budget indexes
--   - Drops streaming columns from ai_messages
--   - Drops context budgeting columns from ai_conversations
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP INDEXES
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_ai_messages_convo_role_created;
DROP INDEX IF EXISTS idx_ai_messages_latency;
DROP INDEX IF EXISTS idx_ai_messages_status_created;

-- ----------------------------------------------------------------------------
-- 2. DROP COLUMNS FROM ai_conversations
-- ----------------------------------------------------------------------------
ALTER TABLE ai_conversations
    DROP COLUMN IF EXISTS context_window_tokens,
    DROP COLUMN IF EXISTS system_prompt_tokens;

-- ----------------------------------------------------------------------------
-- 3. DROP COLUMNS FROM ai_messages
-- ----------------------------------------------------------------------------
ALTER TABLE ai_messages
    DROP COLUMN IF EXISTS model_version,
    DROP COLUMN IF EXISTS chunk_count,
    DROP COLUMN IF EXISTS latency_ms,
    DROP COLUMN IF EXISTS status;

COMMIT;
