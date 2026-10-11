-- ============================================================================
-- ECOINSIGHT — Emission Record Queries (CRUD + Filtering)
-- ============================================================================
-- Supports: GET/POST/PUT/DELETE /api/emissions, POST /api/calculator,
--           POST /api/emissions/import
--
-- All queries enforce user_id scoping for data isolation.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE EMISSION RECORD
-- ---------------------------------------------------------
-- Used by: POST /api/emissions, POST /api/calculator (save mode)
-- Backend calculates co2e = quantity × emission_factor before insert.

-- name: create-emission
INSERT INTO emission_records
    (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;


-- ---------------------------------------------------------
-- 2. GET EMISSION BY ID (user-scoped)
-- ---------------------------------------------------------
-- Used by: GET /api/emissions/:id

-- name: get-emission-by-id
SELECT er.*, ec.name AS category_name
FROM emission_records er
JOIN emission_categories ec ON er.category_id = ec.id
WHERE er.id = $1 AND er.user_id = $2;


-- ---------------------------------------------------------
-- 3. UPDATE EMISSION RECORD (user-scoped)
-- ---------------------------------------------------------
-- Used by: PUT /api/emissions/:id

-- name: update-emission
UPDATE emission_records
SET category_id     = $3,
    activity        = $4,
    quantity        = $5,
    unit            = $6,
    emission_factor = $7,
    co2e            = $8,
    location        = $9,
    date            = $10
WHERE id = $1 AND user_id = $2
RETURNING *;


-- ---------------------------------------------------------
-- 4. DELETE EMISSION RECORD (user-scoped)
-- ---------------------------------------------------------
-- Used by: DELETE /api/emissions/:id

-- name: delete-emission
DELETE FROM emission_records
WHERE id = $1 AND user_id = $2
RETURNING id;


-- ---------------------------------------------------------
-- 5. LIST EMISSIONS (user-scoped, with filtering + pagination)
-- ---------------------------------------------------------
-- Used by: GET /api/emissions
--
-- Supports optional filters via COALESCE/NULL checks.
-- Backend should pass NULL for unset filters.
-- Parameters:
--   $1 = user_id (required)
--   $2 = category_id (optional, NULL to skip)
--   $3 = location (optional, NULL to skip)
--   $4 = date_from (optional, NULL to skip)
--   $5 = date_to (optional, NULL to skip)
--   $6 = limit (default 50)
--   $7 = offset (default 0)

-- name: list-emissions
SELECT er.*, ec.name AS category_name
FROM emission_records er
JOIN emission_categories ec ON er.category_id = ec.id
WHERE er.user_id = $1
  AND ($2::INTEGER IS NULL OR er.category_id = $2)
  AND ($3::VARCHAR IS NULL OR er.location ILIKE '%' || $3 || '%')
  AND ($4::DATE IS NULL OR er.date >= $4)
  AND ($5::DATE IS NULL OR er.date <= $5)
ORDER BY er.date DESC, er.created_at DESC
LIMIT COALESCE($6, 50)
OFFSET COALESCE($7, 0);


-- ---------------------------------------------------------
-- 6. COUNT EMISSIONS (user-scoped, with same filters)
-- ---------------------------------------------------------
-- Used by: GET /api/emissions (for pagination metadata)

-- name: count-emissions
SELECT COUNT(*) AS total
FROM emission_records er
WHERE er.user_id = $1
  AND ($2::INTEGER IS NULL OR er.category_id = $2)
  AND ($3::VARCHAR IS NULL OR er.location ILIKE '%' || $3 || '%')
  AND ($4::DATE IS NULL OR er.date >= $4)
  AND ($5::DATE IS NULL OR er.date <= $5);


-- ---------------------------------------------------------
-- 7. GET EMISSION FACTOR BY CATEGORY AND ACTIVITY
-- ---------------------------------------------------------
-- Used by: POST /api/emissions (factor lookup), POST /api/calculator

-- name: find-emission-factor
SELECT id, category_id, activity, unit, factor, source
FROM emission_factors
WHERE category_id = $1
  AND activity ILIKE $2
  AND unit ILIKE $3
LIMIT 1;


-- ---------------------------------------------------------
-- 8. LIST ALL EMISSION FACTORS
-- ---------------------------------------------------------
-- Used by: GET /api/emission-factors

-- name: list-emission-factors
SELECT ef.*, ec.name AS category_name
FROM emission_factors ef
JOIN emission_categories ec ON ef.category_id = ec.id
ORDER BY ec.name, ef.activity;


-- ---------------------------------------------------------
-- 9. LIST ALL CATEGORIES
-- ---------------------------------------------------------
-- Used by: GET /api/categories

-- name: list-categories
SELECT id, name, description, created_at
FROM emission_categories
ORDER BY name;


-- ---------------------------------------------------------
-- 10. BULK INSERT EMISSIONS (CSV Import)
-- ---------------------------------------------------------
-- Used by: POST /api/emissions/import
-- Backend should use a single INSERT with multiple VALUES rows
-- or use pg COPY for large datasets.

-- name: bulk-insert-emissions
-- (Template — backend generates VALUES dynamically)
INSERT INTO emission_records
    (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
VALUES
    -- ($1, $2, $3, $4, $5, $6, $7, $8, $9),
    -- ... more rows
RETURNING id;


-- ---------------------------------------------------------
-- 11. TOTAL EMISSIONS FOR USER
-- ---------------------------------------------------------
-- Used by: various aggregation needs

-- name: total-user-emissions
SELECT SUM(co2e) AS total_co2e,
       COUNT(*)  AS total_records
FROM emission_records
WHERE user_id = $1;
