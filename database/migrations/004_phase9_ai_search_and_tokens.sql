-- ============================================================================
-- ECOINSIGHT — Migration 004: Phase 9 AI Search & Token Rate-Limiting
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    05 November 2026
-- Phase:   Phase 9 — AI Copilot (28 Oct – 05 Nov)
--
-- Description:
--   1. Adds GIN full-text search indexes on `ai_messages.content` and
--      `ai_conversations.title` using PostgreSQL's English text-search configuration.
--   2. Enables sub-millisecond full-text message and topic keyword search
--      using `to_tsvector()` and `plainto_tsquery()` / `websearch_to_tsquery()`.
--   3. Adds composite indexing on `ai_messages (conversation_id, created_at, tokens_used)`
--      and `ai_conversations (user_id, id)` to optimize token consumption
--      aggregation queries used for daily and hourly LLM rate-limiting.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FULL-TEXT SEARCH GIN INDEXES FOR AI COPILOT
-- ----------------------------------------------------------------------------

-- GIN full-text search index on message content for fast conversational search
CREATE INDEX IF NOT EXISTS idx_ai_messages_content_tsv 
    ON ai_messages USING gin (to_tsvector('english', content));

-- GIN full-text search index on conversation titles
CREATE INDEX IF NOT EXISTS idx_ai_conversations_title_tsv 
    ON ai_conversations USING gin (to_tsvector('english', title));


-- ----------------------------------------------------------------------------
-- 2. PERFORMANCE INDEXES FOR TOKEN AGGREGATION & RATE-LIMITING
-- ----------------------------------------------------------------------------

-- Composite index: conversation + timestamp + token metric
-- Accelerates date-window token aggregations (daily, sliding-window, monthly)
CREATE INDEX IF NOT EXISTS idx_ai_messages_tokens_convo_created 
    ON ai_messages (conversation_id, created_at, tokens_used);

-- Fast lookup for user-to-conversation joins during token rate-limit audits
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id 
    ON ai_conversations (user_id, id);

COMMIT;

-- ============================================================================
-- END OF MIGRATION 004
-- ============================================================================
