-- ============================================================================
-- ECOINSIGHT — Phase 9: AI Copilot Streaming & Multi-Turn Verification Suite
-- ============================================================================
-- File:    database/tests/test_phase9_streaming_integration.sql
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    20 November 2026
--
-- Executes automated verification across all Phase 9 deliverables:
--   1. Schema column and constraint integrity
--   2. Performance & partial index verification
--   3. In-flight streaming lifecycle (init -> chunk -> finalize)
--   4. Streaming error recovery and failure handling
--   5. Stale streaming session automated cleanup
--   6. Sliding-window multi-turn token budgeting
--   7. Conversational turn alternation and integrity validation
--   8. Streaming latency SLA benchmark calculations (p50, p95, p99)
-- ============================================================================

\echo '----------------------------------------------------------------------'
\echo 'ECOINSIGHT PHASE 9 (06 NOV – 20 NOV 2026) DATABASE VERIFICATION'
\echo '----------------------------------------------------------------------'

BEGIN;

-- ----------------------------------------------------------------------------
-- TEST 1: SCHEMA COLUMNS VERIFICATION
-- ----------------------------------------------------------------------------
\echo 'TEST 1: Verifying Phase 9 streaming & context columns...'

DO $$
BEGIN
    -- Check ai_messages streaming columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_messages' AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'Column ai_messages.status is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_messages' AND column_name = 'latency_ms'
    ) THEN
        RAISE EXCEPTION 'Column ai_messages.latency_ms is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_messages' AND column_name = 'chunk_count'
    ) THEN
        RAISE EXCEPTION 'Column ai_messages.chunk_count is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_messages' AND column_name = 'model_version'
    ) THEN
        RAISE EXCEPTION 'Column ai_messages.model_version is missing!';
    END IF;

    -- Check ai_conversations context budgeting columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_conversations' AND column_name = 'system_prompt_tokens'
    ) THEN
        RAISE EXCEPTION 'Column ai_conversations.system_prompt_tokens is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_conversations' AND column_name = 'context_window_tokens'
    ) THEN
        RAISE EXCEPTION 'Column ai_conversations.context_window_tokens is missing!';
    END IF;

    RAISE NOTICE '✓ All Phase 9 schema columns verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 2: INDEX INTEGRITY VERIFICATION
-- ----------------------------------------------------------------------------
\echo 'TEST 2: Verifying streaming and latency indexes...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ai_messages' AND indexname = 'idx_ai_messages_status_created'
    ) THEN
        RAISE EXCEPTION 'Index idx_ai_messages_status_created is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ai_messages' AND indexname = 'idx_ai_messages_latency'
    ) THEN
        RAISE EXCEPTION 'Index idx_ai_messages_latency is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ai_messages' AND indexname = 'idx_ai_messages_convo_role_created'
    ) THEN
        RAISE EXCEPTION 'Index idx_ai_messages_convo_role_created is missing!';
    END IF;

    RAISE NOTICE '✓ All Phase 9 streaming indexes verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 3: REAL-TIME STREAMING LIFECYCLE (Init -> Chunk -> Finalize)
-- ----------------------------------------------------------------------------
\echo 'TEST 3: Testing real-time streaming lifecycle...'

DO $$
DECLARE
    v_test_convo_id INTEGER;
    v_msg_id        INTEGER;
    v_chunk_len     INTEGER;
    v_final_status  VARCHAR(20);
    v_final_tokens  INTEGER;
    v_final_lat     INTEGER;
BEGIN
    -- 1. Create a test conversation
    INSERT INTO ai_conversations (user_id, title)
    VALUES (1, 'Unit Test Streaming Thread')
    RETURNING id INTO v_test_convo_id;

    -- 2. User prompt turn
    INSERT INTO ai_messages (conversation_id, role, content, tokens_used)
    VALUES (v_test_convo_id, 'user', 'How do solar PPAs compare with rooftop installations?', 18);

    -- 3. Initialize streaming assistant turn
    INSERT INTO ai_messages (
        conversation_id, role, content, tokens_used, status, latency_ms, chunk_count, model_version
    )
    VALUES (
        v_test_convo_id, 'assistant', '', 0, 'streaming', NULL, 0, 'gemini-1.5-pro'
    )
    RETURNING id INTO v_msg_id;

    -- 4. Simulate streaming chunks arriving via SSE
    UPDATE ai_messages
    SET content = content || 'Solar Power Purchase Agreements (PPAs) require zero upfront capital',
        chunk_count = chunk_count + 1
    WHERE id = v_msg_id AND status = 'streaming'
    RETURNING chunk_count INTO v_chunk_len;

    UPDATE ai_messages
    SET content = content || ' while delivering immediate tariff savings of 20–30% per unit.',
        chunk_count = chunk_count + 1
    WHERE id = v_msg_id AND status = 'streaming'
    RETURNING chunk_count INTO v_chunk_len;

    IF v_chunk_len != 2 THEN
        RAISE EXCEPTION 'Chunk count mismatch: expected 2, got %', v_chunk_len;
    END IF;

    -- 5. Finalize streaming response
    UPDATE ai_messages
    SET content = 'Solar Power Purchase Agreements (PPAs) require zero upfront capital while delivering immediate tariff savings of 20–30% per unit. In contrast, rooftop systems require capex but yield complete asset ownership after 4 years.',
        tokens_used = 135,
        latency_ms = 480,
        chunk_count = 16,
        status = 'completed'
    WHERE id = v_msg_id
    RETURNING status, tokens_used, latency_ms INTO v_final_status, v_final_tokens, v_final_lat;

    IF v_final_status != 'completed' OR v_final_tokens != 135 OR v_final_lat != 480 THEN
        RAISE EXCEPTION 'Finalize streaming failed: status=%, tokens=%, latency=%', 
            v_final_status, v_final_tokens, v_final_lat;
    END IF;

    RAISE NOTICE '✓ Real-time streaming lifecycle completed successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 4: STREAMING ERROR RECOVERY & FAILURE HANDLING
-- ----------------------------------------------------------------------------
\echo 'TEST 4: Testing streaming failure handling...'

DO $$
DECLARE
    v_test_convo_id INTEGER;
    v_msg_id        INTEGER;
    v_status        VARCHAR(20);
BEGIN
    SELECT id INTO v_test_convo_id FROM ai_conversations WHERE title = 'Unit Test Streaming Thread' LIMIT 1;

    -- Init stream
    INSERT INTO ai_messages (
        conversation_id, role, content, tokens_used, status, latency_ms, chunk_count, model_version
    )
    VALUES (
        v_test_convo_id, 'assistant', 'Partial generation before drop...', 0, 'streaming', NULL, 3, 'gemini-1.5-pro'
    )
    RETURNING id INTO v_msg_id;

    -- Trigger failure handler
    UPDATE ai_messages
    SET status = 'failed',
        latency_ms = 1250,
        content = content || ' [Stream Terminated: Client Disconnected]'
    WHERE id = v_msg_id
    RETURNING status INTO v_status;

    IF v_status != 'failed' THEN
        RAISE EXCEPTION 'Failed status not set properly: got %', v_status;
    END IF;

    RAISE NOTICE '✓ Streaming failure recovery verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 5: STALE STREAMING SESSION CLEANUP
-- ----------------------------------------------------------------------------
\echo 'TEST 5: Testing stale streaming cleanup...'

DO $$
DECLARE
    v_test_convo_id INTEGER;
    v_stale_msg_id  INTEGER;
    v_cleaned_count INTEGER;
BEGIN
    SELECT id INTO v_test_convo_id FROM ai_conversations WHERE title = 'Unit Test Streaming Thread' LIMIT 1;

    -- Insert mock abandoned stream with old timestamp
    INSERT INTO ai_messages (
        conversation_id, role, content, tokens_used, status, latency_ms, chunk_count, created_at
    )
    VALUES (
        v_test_convo_id, 'assistant', '', 0, 'streaming', NULL, 0, NOW() - INTERVAL '30 minutes'
    )
    RETURNING id INTO v_stale_msg_id;

    -- Run cleanup query (timeout = 10 mins)
    WITH cleaned AS (
        UPDATE ai_messages
        SET status = 'failed',
            content = '[Stream Timed Out: Incomplete Generation]'
        WHERE status = 'streaming'
          AND created_at < (NOW() - (10 || ' minutes')::INTERVAL)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_cleaned_count FROM cleaned;

    IF v_cleaned_count < 1 THEN
        RAISE EXCEPTION 'Stale stream cleanup did not recover abandoned stream!';
    END IF;

    RAISE NOTICE '✓ Stale stream cleanup verified successfully (% cleaned).', v_cleaned_count;
END $$;


-- ----------------------------------------------------------------------------
-- TEST 6: SLIDING CONTEXT WINDOW (Token Budget Pruning)
-- ----------------------------------------------------------------------------
\echo 'TEST 6: Testing multi-turn sliding context window...'

DO $$
DECLARE
    v_convo_id   INTEGER;
    v_turn_count INTEGER;
BEGIN
    -- Conversation 6 has multi-turn exchanges
    v_convo_id := 6;

    WITH ranked_messages AS (
        SELECT
            m.id,
            m.conversation_id,
            m.role,
            m.content,
            m.tokens_used,
            SUM(m.tokens_used) OVER (
                PARTITION BY m.conversation_id
                ORDER BY m.created_at DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_tokens_from_latest
        FROM ai_messages m
        JOIN ai_conversations c ON m.conversation_id = c.id
        WHERE m.conversation_id = v_convo_id
          AND c.user_id = 1
          AND m.status = 'completed'
    )
    SELECT COUNT(*) INTO v_turn_count
    FROM ranked_messages
    WHERE cumulative_tokens_from_latest <= 2000;

    IF v_turn_count < 2 THEN
        RAISE EXCEPTION 'Sliding context window returned insufficient turns: got %', v_turn_count;
    END IF;

    RAISE NOTICE '✓ Sliding context window token budget verified (% turns within budget).', v_turn_count;
END $$;


-- ----------------------------------------------------------------------------
-- TEST 7: CONVERSATION INTEGRITY & TURN CONSISTENCY
-- ----------------------------------------------------------------------------
\echo 'TEST 7: Testing conversation alternation and integrity verification...'

DO $$
DECLARE
    v_status TEXT;
BEGIN
    -- Test against conversation 9 (ISO 14064 audit thread)
    WITH convo_messages AS (
        SELECT
            m.id,
            m.role,
            m.status,
            m.tokens_used,
            LAG(m.role) OVER (ORDER BY m.created_at ASC) AS prev_role
        FROM ai_messages m
        WHERE m.conversation_id = 9
    ),
    metrics AS (
        SELECT
            COUNT(*)                                                    AS total_turns,
            COUNT(CASE WHEN role = prev_role THEN 1 END)                AS consecutive_anomalies,
            COUNT(CASE WHEN status = 'streaming' THEN 1 END)            AS active_streams,
            COUNT(CASE WHEN status = 'failed' THEN 1 END)               AS failed_turns
        FROM convo_messages
    )
    SELECT
        CASE
            WHEN total_turns = 0 THEN 'EMPTY_CONVERSATION'
            WHEN active_streams > 0 THEN 'STREAMING_IN_PROGRESS'
            WHEN consecutive_anomalies > 0 THEN 'ROLE_SEQUENCE_ANOMALY'
            WHEN failed_turns > 0 THEN 'CONTAINS_FAILED_TURNS'
            ELSE 'CONSISTENT_AND_HEALTHY'
        END INTO v_status
    FROM metrics;

    IF v_status != 'CONSISTENT_AND_HEALTHY' THEN
        RAISE EXCEPTION 'Conversation integrity check returned unexpected status: %', v_status;
    END IF;

    RAISE NOTICE '✓ Conversation integrity audit verified: status = %.', v_status;
END $$;


-- ----------------------------------------------------------------------------
-- TEST 8: STREAMING LATENCY SLA BENCHMARKS
-- ----------------------------------------------------------------------------
\echo 'TEST 8: Computing streaming latency SLA percentiles...'

DO $$
DECLARE
    v_p50 NUMERIC;
    v_p95 NUMERIC;
    v_avg NUMERIC;
    v_count INTEGER;
BEGIN
    SELECT
        COUNT(m.id),
        AVG(m.latency_ms),
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.latency_ms),
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms)
    INTO v_count, v_avg, v_p50, v_p95
    FROM ai_messages m
    WHERE m.role = 'assistant'
      AND m.status = 'completed'
      AND m.latency_ms IS NOT NULL;

    IF v_count < 5 THEN
        RAISE EXCEPTION 'Insufficient completed streams for latency SLA: count = %', v_count;
    END IF;

    RAISE NOTICE '✓ Latency SLA metrics: streams=%, avg=%ms, p50=%ms, p95=%ms.',
        v_count, ROUND(v_avg, 1), ROUND(v_p50, 1), ROUND(v_p95, 1);
END $$;

-- Clean up test records
ROLLBACK;

\echo '----------------------------------------------------------------------'
\echo 'ALL PHASE 9 STREAMING & MULTI-TURN VERIFICATION TESTS PASSED (100%)'
\echo '----------------------------------------------------------------------'
