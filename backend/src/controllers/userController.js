/**
 * ============================================================
 * FILE: src/controllers/userController.js
 * ROLE: Authenticated User Profile Controller (Get & Update Self)
 * ============================================================
 *
 * This controller provides endpoints for a logged-in user to view and update
 * their own profile information. It is mounted on /api/users via userRoutes.js.
 * All routes in this controller are protected by the `protect` middleware,
 * meaning a valid JWT must be present in every request — the authenticated
 * user's data is available as `req.user` (set by authMiddleware.js).
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.getMe  — GET /api/users/me
 *   Fetches the currently authenticated user's complete profile from the
 *   `users` table using the ID stored in req.user.id (injected by the
 *   protect middleware after JWT verification).
 *   Returns the following fields:
 *     id, name, email, industry, location, organization, created_at, updated_at
 *   Note: password_hash is deliberately excluded from the SELECT clause so
 *   that sensitive credentials are never sent over the wire.
 *   If no matching row is found (e.g. deleted in a race condition), returns
 *   HTTP 404 via AppError ("User not found").
 *   On success returns HTTP 200 with the user object as a flat JSON.
 *
 * exports.updateMe  — PUT /api/users/me
 *   Allows the authenticated user to update their own profile fields.
 *   Updatable fields: name, industry, location, organization.
 *   The email and password_hash are NOT updatable through this endpoint —
 *   changing email/password would require a dedicated, more secure flow
 *   (e.g. verification email, current-password confirmation).
 *
 *   The SQL UPDATE uses COALESCE($n, columnName) for every optional field.
 *   This means: if the client sends a value for a field, use that new value;
 *   if the client omits the field entirely (sends null or undefined), keep
 *   the existing value from the database unchanged. This allows partial
 *   updates — the client does not need to resend the entire profile, only
 *   the fields it wants to change.
 *
 *   updated_at is automatically set to NOW() so audit timestamps stay current.
 *   The query uses RETURNING to get the updated row in a single round-trip,
 *   which is then sent back as HTTP 200 JSON without a second SELECT call.
 *
 * DATABASE TABLE: users
 *   Columns: id, name, email, password_hash, industry, location,
 *            organization, created_at, updated_at
 *
 * DEPENDENCIES: database (pg pool), AppError.
 * ============================================================
 */
const db = require('../config/database');
const AppError = require('../utils/AppError');

exports.getMe = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, industry, location, organization, created_at, updated_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, industry, location, organization } = req.body;

    const query = `
      UPDATE users
      SET name = COALESCE($2, name),
          industry = COALESCE($3, industry),
          location = COALESCE($4, location),
          organization = COALESCE($5, organization),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, industry, location, organization, created_at, updated_at
    `;
    
    const values = [req.user.id, name, industry, location, organization];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
