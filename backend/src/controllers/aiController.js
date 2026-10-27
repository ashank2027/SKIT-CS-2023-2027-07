/**
 * ============================================================
 * FILE: src/controllers/aiController.js
 * ROLE: AI Copilot Controller (Chat, Conversations, Insights)
 * ============================================================
 *
 * This controller powers the EcoInsight AI Copilot feature (24 Oct–20 Nov phase).
 * It enables users to converse with an AI sustainability advisor that is deeply
 * contextualized with their actual emission records, categories, and company profile.
 *
 * It provides full persistence for multi-turn conversations and message threads:
 *   - ai_conversations: (id, user_id, title, created_at, updated_at)
 *   - ai_messages:      (id, conversation_id, role, content, created_at)
 *
 * ENDPOINTS:
 *   POST /api/ai/chat              — Submit a prompt, get an AI response & persist conversation
 *   GET  /api/ai/conversations     — List user's conversations
 *   GET  /api/ai/conversations/:id — Get conversation details with all historical messages
 *   DELETE /api/ai/conversations/:id — Delete a conversation and its messages
 *
 * DEPENDENCIES: database, aiService, AppError.
 * ============================================================
 */

const db = require('../config/database');
const AppError = require('../utils/AppError');
const aiService = require('../services/aiService');

/**
 * Helper to ensure the ai_conversations and ai_messages tables exist.
 * This ensures zero runtime errors even if database migrations are pending.
 */
let tablesInitialized = false;
async function ensureAITables() {
  if (tablesInitialized) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'Sustainability Chat',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
    `);
    tablesInitialized = true;
  } catch (err) {
    console.error('[AI Controller] Error ensuring AI tables:', err.message);
  }
}

/**
 * Gather aggregated emission context for the user to inject into the AI prompt.
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function fetchUserEmissionContext(userId) {
  try {
    // 1. Total and record count
    const totalsRes = await db.query(`
      SELECT 
        COALESCE(SUM(co2e), 0) AS total_co2e,
        COUNT(id) AS record_count
      FROM emission_records
      WHERE user_id = $1
    `, [userId]);

    // 2. Breakdown by category
    const catRes = await db.query(`
      SELECT 
        ec.name,
        COALESCE(SUM(er.co2e), 0) AS total_co2e,
        COUNT(er.id) AS record_count
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
      GROUP BY ec.name
      ORDER BY total_co2e DESC
    `, [userId]);

    // 3. Highest category
    const highestCategory = catRes.rows.length > 0 ? catRes.rows[0].name : 'None';

    // 4. Recent activities (up to 5)
    const recentRes = await db.query(`
      SELECT 
        er.activity,
        er.quantity,
        er.unit,
        er.co2e,
        er.date,
        ec.name AS category_name
      FROM emission_records er
      LEFT JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
      ORDER BY er.date DESC, er.created_at DESC
      LIMIT 5
    `, [userId]);

    return {
      total_co2e: Number(totalsRes.rows[0]?.total_co2e || 0),
      record_count: Number(totalsRes.rows[0]?.record_count || 0),
      highest_category: highestCategory,
      categories: catRes.rows,
      recent: recentRes.rows
    };
  } catch (err) {
    console.warn('[AI Controller] Could not fetch emissions context (DB may be offline):', err.message);
    return {
      total_co2e: 0,
      record_count: 0,
      highest_category: 'N/A',
      categories: [],
      recent: []
    };
  }
}

/**
 * POST /api/ai/chat
 * Main AI Copilot endpoint.
 * Request Body:
 *   - message: string (required)
 *   - conversation_id: number (optional — if omitted, a new conversation is created)
 *   - title: string (optional — for newly created conversation)
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, conversation_id, title } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return next(new AppError('Message is required and must not be empty.', 400));
    }

    await ensureAITables();

    const userId = req.user.id;
    let conversationId = conversation_id;

    // 1. Resolve or create conversation
    if (conversationId) {
      const convCheck = await db.query(
        'SELECT id, title FROM ai_conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      if (convCheck.rows.length === 0) {
        return next(new AppError('Conversation not found or unauthorized.', 404));
      }
    } else {
      // Auto-generate title from message excerpt if not supplied
      const cleanTitle = (title && title.trim()) || (message.trim().substring(0, 45) + (message.length > 45 ? '...' : ''));
      const newConv = await db.query(
        `INSERT INTO ai_conversations (user_id, title, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, title, created_at, updated_at`,
        [userId, cleanTitle]
      );
      conversationId = newConv.rows[0].id;
    }

    // 2. Fetch conversation history for multi-turn memory
    const historyRes = await db.query(
      `SELECT role, content FROM ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [conversationId]
    );
    const history = historyRes.rows;

    // 3. Retrieve user profile and emission context
    const userProfile = {
      name: req.user.name,
      organization: req.user.organization,
      industry: req.user.industry,
      location: req.user.location
    };
    const emissionsContext = await fetchUserEmissionContext(userId);

    // 4. Generate AI response (Gemini API or intelligent fallback)
    const assistantReply = await aiService.generateAIResponse(
      message.trim(),
      history,
      userProfile,
      emissionsContext
    );

    // 5. Persist user message and assistant response
    await db.query(
      `INSERT INTO ai_messages (conversation_id, role, content, created_at)
       VALUES ($1, 'user', $2, NOW()), ($1, 'assistant', $3, NOW())`,
      [conversationId, message.trim(), assistantReply]
    );

    // Update conversation timestamp
    await db.query(
      'UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // 6. Return response payload
    res.status(200).json({
      status: 'success',
      conversation_id: conversationId,
      message: assistantReply,
      context_used: {
        total_co2e: emissionsContext.total_co2e,
        highest_category: emissionsContext.highest_category,
        records_analyzed: emissionsContext.record_count
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/conversations
 * List all conversations for the authenticated user.
 */
exports.getConversations = async (req, res, next) => {
  try {
    await ensureAITables();
    const userId = req.user.id;

    const result = await db.query(`
      SELECT 
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        COUNT(m.id) AS message_count
      FROM ai_conversations c
      LEFT JOIN ai_messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `, [userId]);

    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/conversations/:id
 * Retrieve a specific conversation and all associated messages.
 */
exports.getConversationById = async (req, res, next) => {
  try {
    await ensureAITables();
    const userId = req.user.id;
    const conversationId = req.params.id;

    const convRes = await db.query(
      'SELECT id, title, created_at, updated_at FROM ai_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convRes.rows.length === 0) {
      return next(new AppError('Conversation not found.', 404));
    }

    const messagesRes = await db.query(
      `SELECT id, role, content, created_at 
       FROM ai_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.status(200).json({
      status: 'success',
      conversation: convRes.rows[0],
      messages: messagesRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/ai/conversations/:id
 * Delete a conversation.
 */
exports.deleteConversation = async (req, res, next) => {
  try {
    await ensureAITables();
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await db.query(
      'DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Conversation not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Conversation deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
