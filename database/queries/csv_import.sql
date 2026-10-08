-- ============================================================================
-- ECOINSIGHT — CSV Import Database Queries Blueprint
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Project: EcoInsight (SKIT-CS-2023-2027-07)
-- Phase:   Phase 8 — CSV & Bulk Imports (27 Sep – 23 Oct 2026)
--
-- Consumed by: POST /api/emissions/import, Node.js CSV processing service,
--              C++ CSV_PROCESSING scheduler background task worker.
-- ============================================================================


-- ============================================================================
-- 1. CATEGORY RESOLUTION BY NAME
-- ============================================================================
-- Resolves incoming CSV category column string to category_id.
-- Parameters: $1 = category_name (e.g., 'Electricity')

SELECT id, name
FROM emission_categories
WHERE LOWER(name) = LOWER($1);


-- ============================================================================
-- 2. EXACT EMISSION FACTOR LOOKUP
-- ============================================================================
-- Fetches the exact conversion factor for a (category_id, activity, unit) triple.
-- Parameters: $1 = category_id, $2 = activity, $3 = unit

SELECT id, category_id, activity, unit, factor, source
FROM emission_factors
WHERE category_id = $1
  AND LOWER(activity) = LOWER($2)
  AND LOWER(unit) = LOWER($3);


-- ============================================================================
-- 3. FALLBACK / FUZZY EMISSION FACTOR MATCHING
-- ============================================================================
-- Used when exact activity string differs slightly in CSV (e.g. 'Grid Electric').
-- Parameters: $1 = category_id, $2 = activity pattern (e.g. '%Grid%'), $3 = unit

SELECT id, category_id, activity, unit, factor, source
FROM emission_factors
WHERE category_id = $1
  AND LOWER(unit) = LOWER($3)
  AND (
      LOWER(activity) LIKE LOWER($2)
      OR LOWER(activity) ILIKE '%grid%'
      OR LOWER(activity) ILIKE '%petrol%'
      OR LOWER(activity) ILIKE '%diesel%'
  )
ORDER BY id ASC
LIMIT 1;


-- ============================================================================
-- 4. BULK / BATCH INSERTION OF EMISSION RECORDS
-- ============================================================================
-- Multi-row parametric insert for high performance CSV imports.
-- Parameters per tuple: (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)

INSERT INTO emission_records (
    user_id,
    category_id,
    activity,
    quantity,
    unit,
    emission_factor,
    co2e,
    location,
    date
)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, activity, co2e, date;


-- ============================================================================
-- 5. IMPORT BATCH SUMMARY & VERIFICATION
-- ============================================================================
-- Returns summary stats of imported records for confirmation response.
-- Parameters: $1 = user_id, $2 = start_date, $3 = end_date

SELECT 
    COUNT(id)                           AS total_records_imported,
    ROUND(SUM(co2e), 4)                AS total_co2e_kg,
    ROUND(SUM(co2e) / 1000.0, 4)        AS total_co2e_tonnes,
    COUNT(DISTINCT category_id)         AS distinct_categories,
    MIN(date)                           AS earliest_record_date,
    MAX(date)                           AS latest_record_date
FROM emission_records
WHERE user_id = $1
  AND created_at >= $2;


-- ============================================================================
-- 6. CSV ROW DATA VALIDATION QUERY
-- ============================================================================
-- Verifies whether category and factor exist prior to inserting a row.
-- Parameters: $1 = category_name, $2 = activity_name, $3 = unit

SELECT 
    c.id AS category_id,
    f.id AS factor_id,
    f.factor AS emission_factor
FROM emission_categories c
LEFT JOIN emission_factors f 
       ON f.category_id = c.id 
      AND LOWER(f.activity) = LOWER($2)
      AND LOWER(f.unit) = LOWER($3)
WHERE LOWER(c.name) = LOWER($1);
