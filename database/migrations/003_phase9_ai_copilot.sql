-- ============================================================================
-- ECOINSIGHT — Migration 003: Phase 9 AI Copilot
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    24 October 2026
-- Phase:   Phase 9 — AI Copilot (24 Oct – 20 Nov)
--
-- Description:
--   1. Creates `ai_conversations` table for storing user chat sessions
--      with title and audit timestamps.
--   2. Creates `ai_messages` table for persisting role-based chat history
--      (user, assistant, system) with token consumption tracking.
--   3. Configures cascade deletion rules so deleting a user or conversation
--      cleans up all related messages cleanly.
--   4. Creates high-performance indexes for conversation listing and message
--      history context construction for Gemini AI prompts.
--   5. Attaches automated `updated_at` trigger to `ai_conversations`.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. AI_CONVERSATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL
                        REFERENCES users (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    title           VARCHAR(255)    NOT NULL DEFAULT 'New Conversation',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index: user-scoped conversation history ordered by last interaction
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated 
    ON ai_conversations (user_id, updated_at DESC);

-- Index: fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user 
    ON ai_conversations (user_id);


-- ----------------------------------------------------------------------------
-- 2. AI_MESSAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER         NOT NULL
                        REFERENCES ai_conversations (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    role            VARCHAR(20)     NOT NULL
                        CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT            NOT NULL,
    tokens_used     INTEGER         DEFAULT 0
                        CHECK (tokens_used >= 0),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index: ordered message history retrieval for conversation context
CREATE INDEX IF NOT EXISTS idx_ai_messages_convo_created 
    ON ai_messages (conversation_id, created_at ASC);

-- Index: fast message lookup by conversation ID
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation 
    ON ai_messages (conversation_id);


-- ----------------------------------------------------------------------------
-- 3. TRIGGER FOR UPDATED_AT
-- ----------------------------------------------------------------------------
-- Ensure update_updated_at_column trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================
