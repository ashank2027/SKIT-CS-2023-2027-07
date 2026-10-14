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
-- 6. INSERT AI MESSAGE (User Query or Assistant Response)
-- ---------------------------------------------------------
-- Used by: POST /api/ai/chat
-- Parameters: $1 = conversation_id, $2 = role ('user', 'assistant', 'system'),
--             $3 = content, $4 = tokens_used

-- name: ai-insert-message
INSERT INTO ai_messages (conversation_id, role, content, tokens_used)
VALUES ($1, $2, $3, COALESCE($4, 0))
RETURNING id, conversation_id, role, content, tokens_used, created_at;


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
