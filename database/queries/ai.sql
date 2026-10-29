-- ============================================================================
-- ECOINSIGHT — AI Copilot Queries
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Phase:   Phase 9 — AI Copilot (24 October – 20 November 2026)
--
-- Supports:
--   - POST /api/ai/chat               (Start or continue chat session)
--   - GET  /api/ai/conversations      (List conversation history for user)
--   - GET  /api/ai/conversations/:id  (Fetch messages in a conversation)
--   - PUT  /api/ai/conversations/:id  (Update conversation title)
--   - DELETE /api/ai/conversations/:id(Delete conversation thread)
--   - GET  /api/ai/search             (Full-text search across message history)
--   - GET  /api/ai/rate-limit         (Check token quota and consumption)
--   - GET  /api/ai/token-usage        (Token analytics and audit breakdown)
--
-- All user queries are strictly scoped by user_id to enforce data isolation.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE NEW CONVERSATION
-- ---------------------------------------------------------
-- Used by: POST /api/ai/chat (when no conversation_id is provided)
-- Parameters: $1 = user_id, $2 = title (optional, defaults to 'New Conversation')

-- name: ai-create-conversation
INSERT INTO ai_conversations (user_id, title)
VALUES ($1, COALESCE($2, 'New Conversation'))
RETURNING id, user_id, title, created_at, updated_at;


-- ---------------------------------------------------------
-- 2. LIST USER CONVERSATIONS (History Sidebar)
-- ---------------------------------------------------------
-- Used by: GET /api/ai/conversations
-- Parameters: $1 = user_id, $2 = limit, $3 = offset

-- name: ai-list-conversations
SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at,
    COUNT(m.id) AS message_count,
    MAX(m.created_at) AS last_message_at
FROM ai_conversations c
LEFT JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.user_id = $1
GROUP BY c.id, c.title, c.created_at, c.updated_at
ORDER BY c.updated_at DESC
LIMIT COALESCE($2, 50) OFFSET COALESCE($3, 0);


-- ---------------------------------------------------------
-- 3. GET CONVERSATION BY ID (Metadata & Ownership Verification)
-- ---------------------------------------------------------
-- Used by: GET /api/ai/conversations/:id, PUT /api/ai/conversations/:id
-- Parameters: $1 = conversation_id, $2 = user_id

-- name: ai-get-conversation-by-id
SELECT
    id,
    user_id,
    title,
    created_at,
    updated_at
FROM ai_conversations
WHERE id = $1 AND user_id = $2;


-- ---------------------------------------------------------
-- 4. UPDATE CONVERSATION TITLE
-- ---------------------------------------------------------
-- Used by: PUT /api/ai/conversations/:id (or auto-title generation)
-- Parameters: $1 = conversation_id, $2 = user_id, $3 = new_title

-- name: ai-update-conversation-title
UPDATE ai_conversations
SET title = $3,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, title, created_at, updated_at;


-- ---------------------------------------------------------
-- 5. DELETE CONVERSATION
-- ---------------------------------------------------------
-- Used by: DELETE /api/ai/conversations/:id
-- Note: Cascades automatically to ai_messages due to ON DELETE CASCADE.
-- Parameters: $1 = conversation_id, $2 = user_id

-- name: ai-delete-conversation
DELETE FROM ai_conversations
WHERE id = $1 AND user_id = $2
RETURNING id;


-- ---------------------------------------------------------
-- ---------------------------------------------------------
-- 6. INSERT AI MESSAGE (User Query or Assistant Response)
-- ---------------------------------------------------------
-- Used by: POST /api/ai/chat
-- Parameters: $1 = conversation_id, $2 = role ('user', 'assistant', 'system'),
--             $3 = content, $4 = tokens_used, $5 = status ('completed', 'streaming', 'failed'),
--             $6 = latency_ms, $7 = chunk_count, $8 = model_version

-- name: ai-insert-message
INSERT INTO ai_messages (
    conversation_id,
    role,
    content,
    tokens_used,
    status,
    latency_ms,
    chunk_count,
    model_version
)
VALUES (
    $1,
    $2,
    $3,
    COALESCE($4, 0),
    COALESCE($5, 'completed'),
    $6,
    COALESCE($7, 1),
    COALESCE($8, 'gemini-1.5-pro')
)
RETURNING id, conversation_id, role, content, tokens_used, status, latency_ms, chunk_count, model_version, created_at;


-- ---------------------------------------------------------
-- 7. TOUCH CONVERSATION TIMESTAMP
-- ---------------------------------------------------------
-- Bumps updated_at on ai_conversations when a new message arrives.
-- Parameters: $1 = conversation_id

-- name: ai-touch-conversation
UPDATE ai_conversations
SET updated_at = NOW()
WHERE id = $1;


-- ---------------------------------------------------------
-- 8. GET CONVERSATION MESSAGES (Chat Context)
-- ---------------------------------------------------------
-- Used by: GET /api/ai/conversations/:id (and backend Gemini context assembler)
-- Enforces user ownership via JOIN with ai_conversations.
-- Parameters: $1 = conversation_id, $2 = user_id, $3 = limit

-- name: ai-get-conversation-messages
SELECT
    m.id,
    m.conversation_id,
    m.role,
    m.content,
    m.tokens_used,
    m.status,
    m.latency_ms,
    m.chunk_count,
    m.model_version,
    m.created_at
FROM ai_messages m
JOIN ai_conversations c ON m.conversation_id = c.id
WHERE m.conversation_id = $1 AND c.user_id = $2
ORDER BY m.created_at ASC
LIMIT COALESCE($3, 100);


-- ---------------------------------------------------------
-- 9. USER EMISSION CONTEXT SUMMARY FOR GEMINI PROMPT INJECTION
-- ---------------------------------------------------------
-- Used by: Backend AI Service before invoking Google Gemini API.
-- Generates a structured snapshot of the user's recent emission profile
-- so the assistant can give hyper-personalized recommendations without
-- hallucinating numbers.
-- Parameters: $1 = user_id

-- name: ai-get-user-emission-context
WITH user_info AS (
    SELECT id, name, industry, location, organization
    FROM users
    WHERE id = $1
),
lifetime_summary AS (
    SELECT
        COALESCE(SUM(co2e), 0) AS total_co2e,
        COUNT(id) AS total_records,
        MIN(date) AS first_date,
        MAX(date) AS last_date
    FROM emission_records
    WHERE user_id = $1
),
recent_30d AS (
    SELECT
        COALESCE(SUM(co2e), 0) AS recent_co2e,
        COUNT(id) AS recent_records
    FROM emission_records
    WHERE user_id = $1
      AND date >= (CURRENT_DATE - INTERVAL '30 days')
),
top_category AS (
    SELECT
        ec.name AS category_name,
        SUM(er.co2e) AS category_co2e
    FROM emission_records er
    JOIN emission_categories ec ON er.category_id = ec.id
    WHERE er.user_id = $1
    GROUP BY ec.name
    ORDER BY category_co2e DESC
    LIMIT 1
)
SELECT
    u.id               AS user_id,
    u.name             AS user_name,
    u.industry         AS user_industry,
    u.location         AS user_location,
    u.organization     AS user_organization,
    ls.total_co2e      AS lifetime_co2e,
    ls.total_records   AS lifetime_record_count,
    ls.first_date,
    ls.last_date,
    r30.recent_co2e    AS past_30_days_co2e,
    tc.category_name   AS top_emitting_category,
    tc.category_co2e   AS top_category_co2e
FROM user_info u
CROSS JOIN lifetime_summary ls
CROSS JOIN recent_30d r30
LEFT JOIN top_category tc ON TRUE;


-- ============================================================================
-- FULL-TEXT SEARCH QUERIES (Phase 9 — 28 Oct – 05 Nov 2026)
-- ============================================================================

-- ---------------------------------------------------------
-- 10. FULL-TEXT SEARCH ACROSS ALL USER MESSAGES
-- ---------------------------------------------------------
-- Used by: GET /api/ai/search?q=...
-- Performs ranked full-text search across all messages in all conversations
-- owned by the user using the English dictionary GIN index.
-- Generates highlighted snippets (<mark>keywords</mark>) for frontend UI display.
-- Parameters: $1 = user_id, $2 = search_query, $3 = limit, $4 = offset

-- name: ai-search-messages
SELECT
    m.id                    AS message_id,
    m.conversation_id,
    c.title                 AS conversation_title,
    m.role,
    m.content,
    ts_headline(
        'english',
        m.content,
        plainto_tsquery('english', $2),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, HighlightAll=FALSE'
    ) AS headline_snippet,
    ts_rank(
        to_tsvector('english', m.content),
        plainto_tsquery('english', $2)
    ) AS search_rank,
    m.tokens_used,
    m.created_at
FROM ai_messages m
JOIN ai_conversations c ON m.conversation_id = c.id
WHERE c.user_id = $1
  AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
ORDER BY search_rank DESC, m.created_at DESC
LIMIT COALESCE($3, 20) OFFSET COALESCE($4, 0);


-- ---------------------------------------------------------
-- 11. FULL-TEXT SEARCH WITHIN A SINGLE CONVERSATION
-- ---------------------------------------------------------
-- Used by: GET /api/ai/conversations/:id/search?q=...
-- Scoped in-thread search to find specific recommendations or previous facts.
-- Parameters: $1 = conversation_id, $2 = user_id, $3 = search_query

-- name: ai-search-conversation-messages
SELECT
    m.id                    AS message_id,
    m.conversation_id,
    m.role,
    m.content,
    ts_headline(
        'english',
        m.content,
        plainto_tsquery('english', $3),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=10'
    ) AS headline_snippet,
    ts_rank(
        to_tsvector('english', m.content),
        plainto_tsquery('english', $3)
    ) AS search_rank,
    m.tokens_used,
    m.created_at
FROM ai_messages m
JOIN ai_conversations c ON m.conversation_id = c.id
WHERE m.conversation_id = $1
  AND c.user_id = $2
  AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $3)
ORDER BY search_rank DESC, m.created_at ASC;


-- ---------------------------------------------------------
-- 12. SEARCH CONVERSATIONS BY KEYWORD (Title + Content Hybrid)
-- ---------------------------------------------------------
-- Used by: GET /api/ai/conversations?search=...
-- Finds matching threads whether the keyword appears in the title or message content.
-- Parameters: $1 = user_id, $2 = search_query, $3 = limit, $4 = offset

-- name: ai-search-conversations-by-keyword
WITH matching_messages AS (
    SELECT
        m.conversation_id,
        COUNT(m.id) AS matching_message_count,
        MAX(ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2))) AS max_message_rank
    FROM ai_messages m
    JOIN ai_conversations c ON m.conversation_id = c.id
    WHERE c.user_id = $1
      AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
    GROUP BY m.conversation_id
)
SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at,
    COALESCE(mm.matching_message_count, 0) AS match_count,
    GREATEST(
        ts_rank(to_tsvector('english', c.title), plainto_tsquery('english', $2)),
        COALESCE(mm.max_message_rank, 0.0)
    ) AS relevance_rank
FROM ai_conversations c
LEFT JOIN matching_messages mm ON c.id = mm.conversation_id
WHERE c.user_id = $1
  AND (
      to_tsvector('english', c.title) @@ plainto_tsquery('english', $2)
      OR mm.conversation_id IS NOT NULL
  )
ORDER BY relevance_rank DESC, c.updated_at DESC
LIMIT COALESCE($3, 20) OFFSET COALESCE($4, 0);


-- ============================================================================
-- TOKEN AGGREGATION & RATE-LIMITING QUERIES (Phase 9 — 28 Oct – 05 Nov 2026)
-- ============================================================================

-- ---------------------------------------------------------
-- 13. DAILY TOKEN USAGE SUMMARY FOR RATE-LIMITING
-- ---------------------------------------------------------
-- Used by: Backend Rate-Limiter Middleware before calling LLM APIs.
-- Calculates cumulative token consumption for the current calendar day (UTC/Local).
-- Parameters: $1 = user_id

-- name: ai-get-user-token-usage-today
SELECT
    c.user_id,
    CURRENT_DATE AS usage_date,
    COALESCE(SUM(m.tokens_used), 0)                                      AS total_tokens_today,
    COALESCE(SUM(CASE WHEN m.role = 'user' THEN m.tokens_used ELSE 0 END), 0)      AS prompt_tokens_today,
    COALESCE(SUM(CASE WHEN m.role = 'assistant' THEN m.tokens_used ELSE 0 END), 0) AS completion_tokens_today,
    COUNT(m.id)                                                          AS message_count_today
FROM ai_conversations c
JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.user_id = $1
  AND m.created_at >= CURRENT_DATE
GROUP BY c.user_id;


-- ---------------------------------------------------------
-- 14. SLIDING WINDOW TOKEN CONSUMPTION (BURST PROTECTION)
-- ---------------------------------------------------------
-- Used by: Backend Token Bucket / Sliding-window Rate Limiter (e.g., past 1 hour)
-- Prevents rapid request bursts and quota exhaustion.
-- Parameters: $1 = user_id, $2 = window_minutes (e.g., 60 for 1-hour window)

-- name: ai-get-user-token-usage-window
SELECT
    c.user_id,
    COALESCE(SUM(m.tokens_used), 0) AS tokens_in_window,
    COUNT(m.id)                     AS messages_in_window,
    MIN(m.created_at)               AS window_earliest_message,
    MAX(m.created_at)               AS window_latest_message
FROM ai_conversations c
JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.user_id = $1
  AND m.created_at >= (NOW() - ($2 || ' minutes')::INTERVAL)
GROUP BY c.user_id;


-- ---------------------------------------------------------
-- 15. MONTHLY TOKEN CONSUMPTION ROLLUP
-- ---------------------------------------------------------
-- Used by: GET /api/ai/usage/monthly (Billing & Organization Quota Reporting)
-- Aggregates monthly token consumption for enterprise tier tracking.
-- Parameters: $1 = user_id

-- name: ai-get-user-token-usage-monthly
SELECT
    c.user_id,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS current_month_start,
    COALESCE(SUM(m.tokens_used), 0)         AS total_monthly_tokens,
    COALESCE(SUM(CASE WHEN m.role = 'user' THEN m.tokens_used ELSE 0 END), 0)      AS monthly_prompt_tokens,
    COALESCE(SUM(CASE WHEN m.role = 'assistant' THEN m.tokens_used ELSE 0 END), 0) AS monthly_completion_tokens,
    COUNT(DISTINCT c.id)                    AS active_conversations_count,
    COUNT(m.id)                             AS total_messages_count
FROM ai_conversations c
JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.user_id = $1
  AND m.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY c.user_id;


-- ---------------------------------------------------------
-- 16. ATOMIC USER RATE-LIMIT CHECK & QUOTA STATUS
-- ---------------------------------------------------------
-- Used by: Middleware to enforce hard limits and return HTTP 429 Retry-After.
-- Evaluates current daily usage against user's allocated daily quota.
-- Parameters: $1 = user_id, $2 = daily_token_quota (e.g., 50000)

-- name: ai-check-user-rate-limit
WITH today_usage AS (
    SELECT
        COALESCE(SUM(m.tokens_used), 0) AS used_today,
        COUNT(m.id)                     AS calls_today
    FROM ai_conversations c
    JOIN ai_messages m ON c.id = m.conversation_id
    WHERE c.user_id = $1
      AND m.created_at >= CURRENT_DATE
)
SELECT
    $1                                                               AS user_id,
    tu.used_today                                                    AS tokens_used_today,
    $2::INTEGER                                                      AS daily_token_quota,
    GREATEST(0, $2::INTEGER - tu.used_today)                         AS tokens_remaining,
    tu.calls_today                                                   AS calls_today,
    (tu.used_today >= $2::INTEGER)                                   AS is_rate_limited,
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE      AS quota_reset_at
FROM today_usage tu;


-- ---------------------------------------------------------
-- ---------------------------------------------------------
-- 17. TOKEN USAGE BREAKDOWN BY CONVERSATION
-- ---------------------------------------------------------
-- Used by: GET /api/ai/usage/conversations (Token Audit Table)
-- Ranks conversations by token consumption for cost visibility.
-- Parameters: $1 = user_id, $2 = limit, $3 = offset

-- name: ai-get-token-breakdown-by-conversation
SELECT
    c.id                            AS conversation_id,
    c.title                         AS conversation_title,
    c.created_at,
    c.updated_at,
    COUNT(m.id)                     AS total_messages,
    COALESCE(SUM(m.tokens_used), 0) AS total_tokens,
    COALESCE(SUM(CASE WHEN m.role = 'user' THEN m.tokens_used ELSE 0 END), 0)      AS prompt_tokens,
    COALESCE(SUM(CASE WHEN m.role = 'assistant' THEN m.tokens_used ELSE 0 END), 0) AS completion_tokens
FROM ai_conversations c
LEFT JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.user_id = $1
GROUP BY c.id, c.title, c.created_at, c.updated_at
ORDER BY total_tokens DESC, c.updated_at DESC
LIMIT COALESCE($2, 20) OFFSET COALESCE($3, 0);


-- ============================================================================
-- STREAMING & MULTI-TURN INTEGRATION ENGINE (Phase 9 — 06 Nov – 20 Nov 2026)
-- ============================================================================

-- ---------------------------------------------------------
-- 18. INITIALIZE IN-FLIGHT STREAMING MESSAGE
-- ---------------------------------------------------------
-- Used by: POST /api/ai/chat/stream (SSE / WebSocket connection opened)
-- Creates initial assistant message in 'streaming' state.
-- Parameters: $1 = conversation_id, $2 = model_version (default 'gemini-1.5-pro')

-- name: ai-init-streaming-message
INSERT INTO ai_messages (
    conversation_id,
    role,
    content,
    tokens_used,
    status,
    latency_ms,
    chunk_count,
    model_version
)
VALUES (
    $1,
    'assistant',
    '',
    0,
    'streaming',
    NULL,
    0,
    COALESCE($2, 'gemini-1.5-pro')
)
RETURNING id, conversation_id, role, status, model_version, created_at;


-- ---------------------------------------------------------
-- 19. APPEND STREAMING CHUNK
-- ---------------------------------------------------------
-- Used by: Streaming handler as SSE chunks arrive from Gemini API
-- Concurrently appends content chunk and increments chunk counter.
-- Parameters: $1 = message_id, $2 = chunk_text

-- name: ai-append-streaming-chunk
UPDATE ai_messages
SET content = content || $2,
    chunk_count = chunk_count + 1
WHERE id = $1 AND status = 'streaming'
RETURNING id, conversation_id, chunk_count, LENGTH(content) AS current_length;


-- ---------------------------------------------------------
-- 20. FINALIZE STREAMING MESSAGE
-- ---------------------------------------------------------
-- Used by: Streaming handler on stream completion ('data: [DONE]')
-- Atomically commits finalized text, token count, generation latency,
-- sets status to 'completed', and updates conversation updated_at.
-- Parameters: $1 = message_id, $2 = finalized_content, $3 = tokens_used,
--             $4 = latency_ms, $5 = final_chunk_count

-- name: ai-finalize-streaming-message
WITH updated_msg AS (
    UPDATE ai_messages
    SET content = $2,
        tokens_used = $3,
        latency_ms = $4,
        chunk_count = COALESCE($5, chunk_count),
        status = 'completed'
    WHERE id = $1
    RETURNING id, conversation_id, role, content, tokens_used, status, latency_ms, chunk_count, model_version, created_at
),
touch_convo AS (
    UPDATE ai_conversations c
    SET updated_at = NOW()
    FROM updated_msg um
    WHERE c.id = um.conversation_id
)
SELECT * FROM updated_msg;


-- ---------------------------------------------------------
-- 21. FAIL STREAMING MESSAGE
-- ---------------------------------------------------------
-- Used by: Error handler when streaming drops, client disconnects, or upstream errors occur.
-- Parameters: $1 = message_id, $2 = latency_ms, $3 = error_reason

-- name: ai-fail-streaming-message
UPDATE ai_messages
SET status = 'failed',
    latency_ms = COALESCE($2, latency_ms),
    content = CASE 
        WHEN content = '' THEN '[Streaming Failed: ' || COALESCE($3, 'Connection Interrupted') || ']'
        ELSE content || ' [Stream Terminated: ' || COALESCE($3, 'Incomplete Response') || ']'
    END
WHERE id = $1
RETURNING id, conversation_id, status, latency_ms, content;


-- ---------------------------------------------------------
-- 22. CLEANUP STALE / ORPHANED STREAMING SESSIONS
-- ---------------------------------------------------------
-- Used by: Background health worker to clean up abandoned streaming messages
-- Parameters: $1 = timeout_minutes (e.g. 10)

-- name: ai-cleanup-stale-streams
UPDATE ai_messages
SET status = 'failed',
    content = CASE 
        WHEN content = '' THEN '[Stream Timed Out: Incomplete Generation]' 
        ELSE content || ' [Stream Timed Out: Session Expired]' 
    END
WHERE status = 'streaming'
  AND created_at < (NOW() - ($1 || ' minutes')::INTERVAL)
RETURNING id, conversation_id, status, created_at;


-- ---------------------------------------------------------
-- 23. GET SLIDING CONTEXT WINDOW (Token-Budgeted Multi-Turn Context)
-- ---------------------------------------------------------
-- Used by: Backend Gemini prompt assembler before sending chat turns
-- Dynamically walks back message history and selects the most recent turns
-- that cumulatively fit within the specified token budget (e.g. 4000 tokens).
-- Returns messages chronologically ascending (oldest to newest in window).
-- Parameters: $1 = conversation_id, $2 = user_id, $3 = token_budget (default 4000)

-- name: ai-get-sliding-context-window
WITH ranked_messages AS (
    SELECT
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.tokens_used,
        m.status,
        m.latency_ms,
        m.chunk_count,
        m.model_version,
        m.created_at,
        SUM(m.tokens_used) OVER (
            PARTITION BY m.conversation_id
            ORDER BY m.created_at DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_tokens_from_latest
    FROM ai_messages m
    JOIN ai_conversations c ON m.conversation_id = c.id
    WHERE m.conversation_id = $1
      AND c.user_id = $2
      AND m.status = 'completed'
)
SELECT
    id,
    conversation_id,
    role,
    content,
    tokens_used,
    status,
    latency_ms,
    chunk_count,
    model_version,
    created_at,
    cumulative_tokens_from_latest AS cumulative_tokens_used
FROM ranked_messages
WHERE cumulative_tokens_from_latest <= COALESCE($3, 4000)
ORDER BY created_at ASC;


-- ---------------------------------------------------------
-- 24. VERIFY CONVERSATION INTEGRITY & TURN CONSISTENCY
-- ---------------------------------------------------------
-- Used by: Multi-turn consistency audits and test suites
-- Analyzes alternating turn integrity (User -> Assistant), checks for
-- stalled streams, duplicate turns, and computes conversational metrics.
-- Parameters: $1 = conversation_id, $2 = user_id

-- name: ai-verify-conversation-integrity
WITH convo_messages AS (
    SELECT
        m.id,
        m.role,
        m.status,
        m.tokens_used,
        m.created_at,
        LAG(m.role) OVER (ORDER BY m.created_at ASC) AS prev_role,
        LAG(m.status) OVER (ORDER BY m.created_at ASC) AS prev_status
    FROM ai_messages m
    JOIN ai_conversations c ON m.conversation_id = c.id
    WHERE m.conversation_id = $1 AND c.user_id = $2
),
metrics AS (
    SELECT
        COUNT(*)                                                    AS total_turns,
        COUNT(CASE WHEN role = 'user' THEN 1 END)                   AS user_turns,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END)              AS assistant_turns,
        COUNT(CASE WHEN role = 'system' THEN 1 END)                 AS system_turns,
        COUNT(CASE WHEN status = 'streaming' THEN 1 END)            AS active_streaming_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)               AS failed_turns_count,
        COUNT(CASE WHEN role = prev_role THEN 1 END)                AS consecutive_role_anomalies,
        COALESCE(SUM(tokens_used), 0)                               AS total_conversation_tokens,
        ROUND(COALESCE(AVG(tokens_used), 0)::NUMERIC, 1)            AS avg_tokens_per_turn
    FROM convo_messages
)
SELECT
    $1                                                              AS conversation_id,
    $2                                                              AS user_id,
    m.total_turns,
    m.user_turns,
    m.assistant_turns,
    m.system_turns,
    m.active_streaming_count,
    m.failed_turns_count,
    m.consecutive_role_anomalies,
    m.total_conversation_tokens,
    m.avg_tokens_per_turn,
    CASE
        WHEN m.total_turns = 0 THEN 'EMPTY_CONVERSATION'
        WHEN m.active_streaming_count > 0 THEN 'STREAMING_IN_PROGRESS'
        WHEN m.consecutive_role_anomalies > 0 THEN 'ROLE_SEQUENCE_ANOMALY'
        WHEN m.failed_turns_count > 0 THEN 'CONTAINS_FAILED_TURNS'
        ELSE 'CONSISTENT_AND_HEALTHY'
    END AS integrity_status
FROM metrics m;


-- ---------------------------------------------------------
-- 25. UPDATE CONVERSATION CONTEXT BUDGET
-- ---------------------------------------------------------
-- Used by: Context assembler after calculating system prompt and history tokens
-- Parameters: $1 = conversation_id, $2 = system_prompt_tokens,
--             $3 = context_window_tokens, $4 = user_id

-- name: ai-update-conversation-context-budget
UPDATE ai_conversations
SET system_prompt_tokens = COALESCE($2, system_prompt_tokens),
    context_window_tokens = COALESCE($3, context_window_tokens),
    updated_at = NOW()
WHERE id = $1 AND user_id = $4
RETURNING id, user_id, title, system_prompt_tokens, context_window_tokens, updated_at;


-- ---------------------------------------------------------
-- 26. GET STREAMING LATENCY SLA BENCHMARK STATS
-- ---------------------------------------------------------
-- Used by: GET /api/ai/metrics/latency (Engineering Health & SLA Dashboard)
-- Computes p50, p95, p99, min, max, avg latencies for completed streams.
-- Parameters: $1 = window_hours (default 24)

-- name: ai-get-streaming-latency-stats
SELECT
    COALESCE($1, 24)                                                                AS window_hours,
    COUNT(m.id)                                                                     AS completed_stream_count,
    ROUND(AVG(m.latency_ms)::NUMERIC, 2)                                            AS avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2)   AS p50_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2)   AS p95_latency_ms,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2)   AS p99_latency_ms,
    MIN(m.latency_ms)                                                               AS min_latency_ms,
    MAX(m.latency_ms)                                                               AS max_latency_ms,
    ROUND(AVG(m.chunk_count)::NUMERIC, 1)                                           AS avg_chunks_per_stream,
    ROUND(AVG(CASE WHEN m.latency_ms > 0 THEN (m.tokens_used::FLOAT / (m.latency_ms::FLOAT / 1000.0)) ELSE 0 END)::NUMERIC, 2) AS avg_tokens_per_second
FROM ai_messages m
JOIN ai_conversations c ON m.conversation_id = c.id
WHERE m.role = 'assistant'
  AND m.status = 'completed'
  AND m.latency_ms IS NOT NULL
  AND m.created_at >= (NOW() - (COALESCE($1, 24) || ' hours')::INTERVAL);


-- ---------------------------------------------------------
-- 27. GET STREAMING LATENCY BREAKDOWN BY MODEL
-- ---------------------------------------------------------
-- Used by: Model performance comparison (Gemini 1.5 Pro vs Gemini 1.5 Flash)
-- Parameters: $1 = window_days (default 7)

-- name: ai-get-streaming-latency-by-model
SELECT
    m.model_version,
    COUNT(m.id)                                                                     AS message_count,
    ROUND(AVG(m.latency_ms)::NUMERIC, 2)                                            AS avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2)   AS p50_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms)::NUMERIC, 2)   AS p95_latency_ms,
    MIN(m.latency_ms)                                                               AS min_latency_ms,
    MAX(m.latency_ms)                                                               AS max_latency_ms,
    ROUND(AVG(m.tokens_used)::NUMERIC, 1)                                           AS avg_tokens_per_response,
    ROUND(AVG(CASE WHEN m.latency_ms > 0 THEN (m.tokens_used::FLOAT / (m.latency_ms::FLOAT / 1000.0)) ELSE 0 END)::NUMERIC, 2) AS avg_tokens_per_sec
FROM ai_messages m
WHERE m.role = 'assistant'
  AND m.status = 'completed'
  AND m.latency_ms IS NOT NULL
  AND m.created_at >= (NOW() - (COALESCE($1, 7) || ' days')::INTERVAL)
GROUP BY m.model_version
ORDER BY message_count DESC;


-- ---------------------------------------------------------
-- 28. GET SLOW STREAMING QUERIES (SLA Outlier Detection)
-- ---------------------------------------------------------
-- Used by: Latency alert debugging to inspect requests exceeding threshold (e.g. > 2500ms)
-- Parameters: $1 = threshold_ms (e.g. 2500), $2 = limit (default 20)

-- name: ai-get-slow-streaming-queries
SELECT
    m.id                    AS message_id,
    m.conversation_id,
    c.user_id,
    c.title                 AS conversation_title,
    m.latency_ms,
    m.tokens_used,
    m.chunk_count,
    m.model_version,
    LEFT(m.content, 120)    AS content_preview,
    m.created_at
FROM ai_messages m
JOIN ai_conversations c ON m.conversation_id = c.id
WHERE m.role = 'assistant'
  AND m.status = 'completed'
  AND m.latency_ms >= COALESCE($1, 2500)
ORDER BY m.latency_ms DESC
LIMIT COALESCE($2, 20);

