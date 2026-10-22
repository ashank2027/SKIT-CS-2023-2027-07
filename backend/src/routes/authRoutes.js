/**
 * ============================================================
 * FILE: src/routes/authRoutes.js
 * ROLE: Authentication Route Definitions — mounted at /api/auth
 * ============================================================
 *
 * This file defines the HTTP routes for user authentication operations.
 * These routes are PUBLIC — they do not require a JWT token or any
 * authentication middleware — because they are the endpoints used to obtain
 * or relinquish tokens in the first place. They are mounted in server.js as:
 *   app.use('/api/auth', authRoutes);
 *
 * ROUTES:
 *
 *   POST  /api/auth/register
 *     Creates a new user account. Expects JSON body with:
 *       name (required), email (required), password (required),
 *       industry (optional), location (optional), organization (optional).
 *     On success, returns HTTP 201 with a JWT and the new user's safe profile.
 *     Handler: authController.register
 *
 *   POST  /api/auth/login
 *     Authenticates an existing user. Expects JSON body with:
 *       email (required), password (required).
 *     Returns HTTP 200 with a JWT and the user's safe profile on success,
 *     or HTTP 401 if credentials are invalid.
 *     Handler: authController.login
 *
 *   POST  /api/auth/logout
 *     Stateless logout — the server has no session to destroy. Simply returns
 *     HTTP 200 { status: 'success' }. The client must discard its stored token.
 *     Handler: authController.logout
 *
 * DEPENDENCIES: express (Router), authController.
 * ============================================================
 */
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;
