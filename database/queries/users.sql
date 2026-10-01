-- ============================================================================
-- ECOINSIGHT — User Queries
-- ============================================================================
-- Supports: POST /api/auth/register, POST /api/auth/login,
--           GET /api/users/me, PUT /api/users/me
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE USER (Registration)
-- ---------------------------------------------------------
-- Used by: POST /api/auth/register
-- Backend hashes the password before calling this.

-- name: create-user
INSERT INTO users (name, email, password_hash, industry, location, organization)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, name, email, industry, location, organization, created_at, updated_at;


-- ---------------------------------------------------------
-- 2. FIND USER BY EMAIL (Login / duplicate check)
-- ---------------------------------------------------------
-- Used by: POST /api/auth/login, POST /api/auth/register (uniqueness check)

-- name: find-user-by-email
SELECT id, name, email, password_hash, industry, location, organization,
       created_at, updated_at
FROM users
WHERE email = $1;


-- ---------------------------------------------------------
-- 3. FIND USER BY ID (Profile / auth middleware)
-- ---------------------------------------------------------
-- Used by: GET /api/users/me, auth middleware

-- name: find-user-by-id
SELECT id, name, email, industry, location, organization,
       created_at, updated_at
FROM users
WHERE id = $1;


-- ---------------------------------------------------------
-- 4. UPDATE USER PROFILE
-- ---------------------------------------------------------
-- Used by: PUT /api/users/me
-- Only updates non-auth fields. Password changes should be
-- handled separately.

-- name: update-user-profile
UPDATE users
SET name         = COALESCE($2, name),
    industry     = COALESCE($3, industry),
    location     = COALESCE($4, location),
    organization = COALESCE($5, organization)
WHERE id = $1
RETURNING id, name, email, industry, location, organization, created_at, updated_at;


-- ---------------------------------------------------------
-- 5. UPDATE PASSWORD HASH
-- ---------------------------------------------------------
-- Used by: password change feature (future)

-- name: update-password
UPDATE users
SET password_hash = $2
WHERE id = $1;


-- ---------------------------------------------------------
-- 6. CHECK EMAIL EXISTS
-- ---------------------------------------------------------
-- Used by: POST /api/auth/register (pre-check)

-- name: email-exists
SELECT EXISTS (
    SELECT 1 FROM users WHERE email = $1
) AS exists;


-- ---------------------------------------------------------
-- 7. COUNT USERS
-- ---------------------------------------------------------
-- Used by: admin/analytics (future)

-- name: count-users
SELECT COUNT(*) AS total_users FROM users;
