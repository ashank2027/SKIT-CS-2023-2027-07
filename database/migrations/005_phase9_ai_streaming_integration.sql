-- ============================================================================
-- ECOINSIGHT — Phase 9: AI Copilot Streaming & Multi-Turn Integration
-- ============================================================================
-- Migration: 005_phase9_ai_streaming_integration.sql
-- Author:    Bhavya Chautharamani (Lead Database Engineer)
-- Date:      20 November 2026
--
-- Objectives:
--   1. Enhance `ai_messages` table to support real-time SSE / WebSocket streaming:
--      - `status`: Lifecycle state ('streaming', 'completed', 'failed')
--      - `latency_ms`: Generation latency in milliseconds for SLA monitoring
--      - `chunk_count`: Number of streamed response chunks
--      - `model_version`: AI model identity ('gemini-1.5-pro', 'gemini-1.5-flash')
--   2. Enhance `ai_conversations` table to track multi-turn context budgeting:
--      - `system_prompt_tokens`: Token size of injected system prompt + emission context
--      - `context_window_tokens`: Running total of active multi-turn context tokens
--   3. Add high-performance indexes for streaming recovery, latency benchmarking,
--      and multi-turn chronological context retrieval.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADD STREAMING & LATENCY COLUMNS TO ai_messages
-- ----------------------------------------------------------------------------

-- Add status column with check constraint for streaming lifecycle
ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('streaming', 'completed', 'failed'));

-- Add latency_ms column for response time and SLA tracking
ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT NULL
        CHECK (latency_ms IS NULL OR latency_ms >= 0);

-- Add chunk_count column to record streamed token chunks
ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 1
        CHECK (chunk_count >= 1);

-- Add model_version column to identify the underlying Gemini model
ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-pro';


-- ----------------------------------------------------------------------------
-- 2. ADD CONTEXT BUDGETING COLUMNS TO ai_conversations
-- ----------------------------------------------------------------------------

-- Add system_prompt_tokens to store token footprint of user emission context
ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS system_prompt_tokens INTEGER NOT NULL DEFAULT 0
        CHECK (system_prompt_tokens >= 0);

-- Add context_window_tokens to cache active conversation token footprint
ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS context_window_tokens INTEGER NOT NULL DEFAULT 0
        CHECK (context_window_tokens >= 0);


-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR STREAMING RECOVERY, LATENCY SLA & MULTI-TURN AUDITING
-- ----------------------------------------------------------------------------

-- Fast identification of active/stalled streams for cleanup and heartbeat recovery
CREATE INDEX IF NOT EXISTS idx_ai_messages_status_created
    ON ai_messages (status, created_at)
    WHERE status = 'streaming';

-- Performance index for latency SLA monitoring and percentile ranking
CREATE INDEX IF NOT EXISTS idx_ai_messages_latency
    ON ai_messages (conversation_id, latency_ms)
    WHERE latency_ms IS NOT NULL;

-- Composite index for rapid multi-turn conversational alternation and context windowing
CREATE INDEX IF NOT EXISTS idx_ai_messages_convo_role_created
    ON ai_messages (conversation_id, role, created_at ASC);

COMMIT;
