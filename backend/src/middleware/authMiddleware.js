/**
 * ============================================================
 * FILE: src/middleware/authMiddleware.js
 * ROLE: JWT-Based Authentication Middleware (protect & optionalAuth)
 * ============================================================
 *
 * This file exports two Express middleware functions used to authenticate
 * incoming requests by validating JSON Web Tokens (JWTs). Both middleware
 * functions follow the same token extraction and verification flow, but
 * differ in what happens when no token is present.
 *
 * ──────────────────────────────────────────────────────────────
 * MIDDLEWARE 1: protect(req, res, next)
 * ──────────────────────────────────────────────────────────────
 * Purpose:
 *   Enforces that the caller is a fully authenticated user. Any route
 *   protected by this middleware WILL reject unauthenticated requests.
 *   Used on all sensitive routes: emissions CRUD, dashboard, analytics,
 *   user profile, and task management.
 *
 * Authentication Flow (3 steps):
 *   Step 1 — Token Extraction:
 *     Reads the Authorization header from the request. The expected format
 *     is the standard Bearer scheme: "Authorization: Bearer <token>".
 *     If the header is missing or does not start with "Bearer", the
 *     request is immediately rejected with HTTP 401 and the message
 *     "You are not logged in. Please log in to get access."
 *
 *   Step 2 — Token Verification:
 *     Calls jwt.verify() with the extracted token and the JWT_SECRET
 *     environment variable (falls back to a hardcoded dev secret).
 *     - If the token signature is invalid → AppError 401 "Invalid token."
 *     - If the token has expired        → AppError 401 "Your token has expired."
 *     On success, jwt.verify() returns the decoded payload which contains
 *     the user's numeric `id`.
 *
 *   Step 3 — User Existence Check:
 *     Even though the token is cryptographically valid, the user account
 *     it refers to might have been deleted from the database. This step
 *     queries the `users` table for a row matching decoded.id. If none
 *     is found, the request is rejected with HTTP 401. If found, the full
 *     user object (id, name, email, industry, location, organization) is
 *     attached to `req.user` so downstream controllers can use it without
 *     making additional DB calls.
 *
 *   On success, next() is called and the request proceeds to the controller.
 *
 * ──────────────────────────────────────────────────────────────
 * MIDDLEWARE 2: optionalAuth(req, res, next)
 * ──────────────────────────────────────────────────────────────
 * Purpose:
 *   A "soft" version of protect. It attempts to authenticate the request
 *   exactly the same way, but it does NOT reject the request if no token
 *   is provided or if the token is invalid. Instead it simply calls next()
 *   without setting req.user, allowing the controller to handle both
 *   authenticated and unauthenticated callers differently (e.g. the
 *   calculator can save a result to DB only when req.user is set).
 *   Used on: categoryRoutes, factorRoutes, and calculatorRoutes.
 *
 * TOKEN SIGNING SECRET:
 *   process.env.JWT_SECRET || 'ecoinsight_jwt_secret_dev_2026_skit_cs_07'
 *   The fallback dev secret is used when the .env file does not define
 *   JWT_SECRET, preventing the server from crashing during local development.
 *   In production, JWT_SECRET MUST be set to a long, random, unique value.
 *
 * DEPENDENCIES: jsonwebtoken, AppError, database (pg pool).
 * ============================================================
 */
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const db = require('../config/database');

const protect = async (req, res, next) => {
  try {
    // 1. Get token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecoinsight_jwt_secret_dev_2026_skit_cs_07');

    // 3. Check if user still exists
    const result = await db.query('SELECT id, name, email, industry, location, organization FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Grant access to protected route
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ecoinsight_jwt_secret_dev_2026_skit_cs_07');
    const result = await db.query('SELECT id, name, email, industry, location, organization FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
    next();
  } catch {
    // In optional auth, invalid token simply means treated as unauthenticated
    next();
  }
};

module.exports = { protect, optionalAuth };
