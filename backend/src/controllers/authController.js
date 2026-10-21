/**
 * ============================================================
 * FILE: src/controllers/authController.js
 * ROLE: User Authentication Controller (Register / Login / Logout)
 * ============================================================
 *
 * This controller handles all user identity operations: creating new accounts,
 * verifying credentials, and issuing (or revoking) JSON Web Tokens. It is
 * mounted on the /api/auth route prefix by server.js via authRoutes.js.
 *
 * ──────────────────────────────────────────────────────────────
 * PRIVATE HELPERS
 * ──────────────────────────────────────────────────────────────
 *
 * signToken(id)
 *   Creates and signs a JWT containing the user's numeric database ID as the
 *   sole payload claim. The token is signed using:
 *     - Secret  : JWT_SECRET env var (falls back to dev secret).
 *     - Expiry  : JWT_EXPIRES_IN env var (defaults to '7d').
 *   The expiry ensures tokens are short-lived; users must re-login periodically.
 *
 * createSendToken(user, statusCode, res)
 *   Convenience function called after both register and login succeed.
 *   It strips the password_hash field from the user object (so credentials
 *   are never sent over the wire, even accidentally), calls signToken(),
 *   and sends back a JSON response:
 *     { "status": "success", "token": "<JWT>", "user": { ...safeUserFields } }
 *   The frontend stores this token in localStorage/cookies and includes it
 *   in the Authorization header for all subsequent protected API calls.
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.register  — POST /api/auth/register
 *   Registers a brand-new user account.
 *   Validation steps:
 *     1. Checks that name, email, and password are all present in req.body.
 *     2. Queries the `users` table to verify the email is not already taken.
 *        Uses a subquery with EXISTS for efficiency (stops scanning at first match).
 *     3. Hashes the plain-text password with bcrypt (salt rounds = 10). Bcrypt
 *        is a slow, intentionally expensive hash function designed to resist
 *        brute-force attacks. Even if the DB is compromised, raw passwords
 *        cannot be recovered quickly.
 *     4. Inserts the new user row into `users` with all provided fields
 *        (name, email, password_hash, industry, location, organization).
 *        industry / location / organization are optional profile fields.
 *     5. Returns HTTP 201 with the JWT and safe user data via createSendToken().
 *   The frontend can store the returned token immediately and redirect to the
 *   dashboard without a second login step.
 *
 * exports.login  — POST /api/auth/login
 *   Authenticates an existing user.
 *   Validation steps:
 *     1. Requires both email and password in req.body.
 *     2. Looks up the user by email (SELECT * to get password_hash).
 *     3. Uses bcrypt.compare() to check the plain-text password against the
 *        stored hash. Returns the same generic error ("Incorrect email or
 *        password") for both "email not found" and "wrong password" cases
 *        — this prevents user enumeration attacks (an attacker cannot tell
 *        whether the email exists).
 *     4. Returns HTTP 200 with the JWT and safe user data via createSendToken().
 *
 * exports.logout  — POST /api/auth/logout
 *   Since this API uses stateless JWTs stored client-side, server-side logout
 *   is a no-op — there is no session to destroy. This endpoint simply returns
 *   HTTP 200 { "status": "success" }. The client is responsible for deleting
 *   the token from its storage. (Token blacklisting could be added later.)
 *
 * DEPENDENCIES: bcryptjs, jsonwebtoken, database (pg pool), AppError.
 * ============================================================
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ecoinsight_jwt_secret_dev_2026_skit_cs_07', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // Remove password from output
  user.password_hash = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    user
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, industry, location, organization } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email and password', 400));
    }

    // Check if email exists
    const emailCheck = await db.query('SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) AS exists', [email]);
    if (emailCheck.rows[0].exists) {
      return next(new AppError('Email already exists', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUserQuery = `
      INSERT INTO users (name, email, password_hash, industry, location, organization)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, industry, location, organization, created_at, updated_at
    `;
    const values = [name, email, passwordHash, industry, location, organization];
    const result = await db.query(newUserQuery, values);
    
    createSendToken(result.rows[0], 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ status: 'success' });
};
