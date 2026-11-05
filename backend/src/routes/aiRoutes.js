/**
 * ============================================================
 * FILE: src/routes/aiRoutes.js
 * ROLE: AI Copilot Route Definitions — mounted at /api/ai
 * ============================================================
 *
 * This router exposes the EcoInsight AI Copilot endpoints.
 * All routes are PROTECTED — every request must include a valid JWT token
 * in the Authorization header.
 *
 * Mounted in server.js as:
 *   app.use('/api/ai', aiRoutes);
 *
 * ROUTES:
 *   POST   /api/ai/chat              — Submit message, receive AI response & persist conversation
 *   GET    /api/ai/conversations     — List user's conversations
 *   GET    /api/ai/conversations/:id — Fetch conversation and full message thread
 *   DELETE /api/ai/conversations/:id — Delete a conversation
 *
 * AUTH: protect middleware (JWT required)
 * DEPENDENCIES: express, aiController, authMiddleware
 * ============================================================
 */

const express = require('express');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All AI Copilot routes require authentication
router.use(protect);

router.post('/chat', aiController.chat);
router.get('/conversations', aiController.getConversations);
router.route('/conversations/:id')
  .get(aiController.getConversationById)
  .delete(aiController.deleteConversation);

module.exports = router;
