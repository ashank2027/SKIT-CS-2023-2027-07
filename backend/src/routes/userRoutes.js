/**
 * ============================================================
 * FILE: src/routes/userRoutes.js
 * ROLE: User Profile Route Definitions — mounted at /api/users
 * ============================================================
 *
 * This file defines the HTTP routes for the authenticated user's own profile
 * operations. All routes in this file are PROTECTED — every request must carry
 * a valid JWT in the Authorization header, enforced by applying the `protect`
 * middleware to the entire router via `router.use(protect)`. If no valid token
 * is provided, the request is rejected with HTTP 401 before reaching any handler.
 *
 * The router is mounted in server.js as:
 *   app.use('/api/users', userRoutes);
 *
 * ROUTES:
 *
 *   GET  /api/users/me
 *     Returns the full profile of the currently authenticated user (identified
 *     by the ID extracted from their JWT by the protect middleware).
 *     Returns: id, name, email, industry, location, organization,
 *              created_at, updated_at. Password hash is excluded.
 *     Handler: userController.getMe
 *
 *   PUT  /api/users/me
 *     Allows the authenticated user to update their own profile.
 *     Accepts any subset of: name, industry, location, organization.
 *     Uses COALESCE so omitted fields are left unchanged (partial update).
 *     Returns the updated user row as HTTP 200 JSON.
 *     Handler: userController.updateMe
 *
 * AUTH: All routes require a valid JWT (protect middleware).
 * DEPENDENCIES: express (Router), userController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all routes below

router.route('/me')
  .get(userController.getMe)
  .put(userController.updateMe);

module.exports = router;
