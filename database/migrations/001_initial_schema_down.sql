-- ============================================================================
-- ECOINSIGHT — Rollback: Initial Migration
-- ============================================================================
-- Drops all objects created by 001_initial_schema.sql
-- Run: psql -U <user> -d ecoinsight -f 001_initial_schema_down.sql
-- ============================================================================

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
DROP TRIGGER IF EXISTS trg_emission_records_updated_at ON emission_records;
DROP TRIGGER IF EXISTS trg_emission_factors_updated_at ON emission_factors;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS emission_records CASCADE;
DROP TABLE IF EXISTS emission_factors CASCADE;
DROP TABLE IF EXISTS emission_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Remove migration record
DELETE FROM _migrations WHERE version = '001';

COMMIT;
