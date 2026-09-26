-- ============================================================================
-- ECOINSIGHT — PostgreSQL Database Schema
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Project: EcoInsight (SKIT-CS-2023-2027-07)
-- Phase:   MVP — 26 September 2026
-- 
-- This schema implements the shared database contract defined in:
--   - EcoInsight_Complete_Project_Master_Document
--   - EcoInsight_Frontend_Backend_Database_Contract
--   - EcoInsight_Master_Team_Task_Specification_for_Codex
--
-- Core tables (MVP):
--   1. users
--   2. emission_categories
--   3. emission_factors
--   4. emission_records
--   5. tasks
--   6. reports
--
-- Later-phase tables (NOT created here):
--   - ai_conversations
--   - ai_messages
--   - forecasts
--
-- Relationships:
--   users 1:N emission_records
--   emission_categories 1:N emission_records
--   emission_categories 1:N emission_factors
--   users 1:N tasks
--   users 1:N reports
-- ============================================================================

-- Enable UUID extension (optional, using SERIAL for simplicity per contract)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ============================================================================
-- 1. USERS
-- ============================================================================
-- Stores user accounts for authentication and profile management.
-- Consumed by: POST /api/auth/register, POST /api/auth/login,
--              GET /api/users/me, PUT /api/users/me
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    industry        VARCHAR(255),
    location        VARCHAR(255),
    organization    VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index: fast email lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);


-- ============================================================================
-- 2. EMISSION_CATEGORIES
-- ============================================================================
-- Reference table for emission activity categories.
-- Consumed by: GET /api/categories, category dropdowns in frontend.
-- ============================================================================

CREATE TABLE IF NOT EXISTS emission_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 3. EMISSION_FACTORS
-- ============================================================================
-- Conversion factors: activity quantity × factor = estimated CO2e.
-- Consumed by: GET /api/emission-factors, POST /api/calculator,
--              POST /api/emissions (backend CO2e calculation).
-- ============================================================================

CREATE TABLE IF NOT EXISTS emission_factors (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER         NOT NULL
                        REFERENCES emission_categories (id)
                        ON DELETE RESTRICT
                        ON UPDATE CASCADE,
    activity        VARCHAR(255)    NOT NULL,
    unit            VARCHAR(50)     NOT NULL,
    factor          NUMERIC(12, 6)  NOT NULL
                        CHECK (factor > 0),
    source          VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- A category + activity + unit combination should be unique
    UNIQUE (category_id, activity, unit)
);

-- Index: factor lookups by category
CREATE INDEX IF NOT EXISTS idx_emission_factors_category ON emission_factors (category_id);

-- Index: factor lookups by activity name
CREATE INDEX IF NOT EXISTS idx_emission_factors_activity ON emission_factors (activity);


-- ============================================================================
-- 4. EMISSION_RECORDS
-- ============================================================================
-- Core data entity — each row is one emission activity logged by a user.
-- Consumed by: GET/POST/PUT/DELETE /api/emissions,
--              GET /api/dashboard, GET /api/analytics.
-- ============================================================================

CREATE TABLE IF NOT EXISTS emission_records (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL
                        REFERENCES users (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    category_id     INTEGER         NOT NULL
                        REFERENCES emission_categories (id)
                        ON DELETE RESTRICT
                        ON UPDATE CASCADE,
    activity        VARCHAR(255)    NOT NULL,
    quantity        NUMERIC(14, 4)  NOT NULL
                        CHECK (quantity > 0),
    unit            VARCHAR(50)     NOT NULL,
    emission_factor NUMERIC(12, 6)  NOT NULL
                        CHECK (emission_factor > 0),
    co2e            NUMERIC(14, 4)  NOT NULL
                        CHECK (co2e >= 0),
    location        VARCHAR(255),
    date            DATE            NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index: user-scoped queries (isolation + pagination)
CREATE INDEX IF NOT EXISTS idx_emission_records_user ON emission_records (user_id);

-- Index: category-based aggregation
CREATE INDEX IF NOT EXISTS idx_emission_records_category ON emission_records (category_id);

-- Index: date-range filtering and trend queries
CREATE INDEX IF NOT EXISTS idx_emission_records_date ON emission_records (date);

-- Index: location-based aggregation
CREATE INDEX IF NOT EXISTS idx_emission_records_location ON emission_records (location);

-- Composite index: user + date for dashboard/trend queries
CREATE INDEX IF NOT EXISTS idx_emission_records_user_date ON emission_records (user_id, date);

-- Composite index: user + category for category breakdown per user
CREATE INDEX IF NOT EXISTS idx_emission_records_user_category ON emission_records (user_id, category_id);


-- ============================================================================
-- 5. TASKS
-- ============================================================================
-- Tracks background/computational tasks handled by C++ scheduler.
-- Consumed by: POST/GET /api/tasks, GET /api/tasks/:id/status
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER         NOT NULL
                            REFERENCES users (id)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE,
    task_type           VARCHAR(50)     NOT NULL
                            CHECK (task_type IN (
                                'CSV_PROCESSING',
                                'ANALYTICS',
                                'FORECAST',
                                'REPORT_GENERATION',
                                'AI_ANALYSIS'
                            )),
    priority            INTEGER         NOT NULL DEFAULT 0
                            CHECK (priority >= 0),
    status              VARCHAR(20)     NOT NULL DEFAULT 'QUEUED'
                            CHECK (status IN (
                                'QUEUED',
                                'RUNNING',
                                'COMPLETED',
                                'FAILED',
                                'RETRYING'
                            )),
    retry_count         INTEGER         NOT NULL DEFAULT 0
                            CHECK (retry_count >= 0),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    result_reference    TEXT,
    error_message       TEXT
);

-- Index: user-scoped task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);

-- Index: status-based filtering (active/failed/completed)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- Index: task type filtering
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks (task_type);


-- ============================================================================
-- 6. REPORTS
-- ============================================================================
-- Report metadata — actual report files stored on filesystem/cloud.
-- Consumed by: POST/GET/DELETE /api/reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL
                        REFERENCES users (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    report_type     VARCHAR(50)     NOT NULL DEFAULT 'SUSTAINABILITY'
                        CHECK (report_type IN (
                            'SUSTAINABILITY',
                            'MONTHLY',
                            'QUARTERLY',
                            'ANNUAL',
                            'CUSTOM'
                        )),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN (
                            'PENDING',
                            'GENERATING',
                            'COMPLETED',
                            'FAILED'
                        )),
    file_reference  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- End date must be after start date
    CHECK (period_end >= period_start)
);

-- Index: user-scoped report queries
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_id);

-- Index: report status filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);


-- ============================================================================
-- TRIGGER: auto-update updated_at on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables that have updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_emission_factors_updated_at
    BEFORE UPDATE ON emission_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_emission_records_updated_at
    BEFORE UPDATE ON emission_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


COMMIT;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
