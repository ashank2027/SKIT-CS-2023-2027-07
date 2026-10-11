-- ============================================================================
-- ECOINSIGHT — Initial Migration: Core Tables
-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Author:    Bhavya Chautharamani
-- Date:      26 September 2026
-- Phase:     MVP
--
-- Creates all 6 core tables required for the EcoInsight MVP:
--   users, emission_categories, emission_factors, emission_records,
--   tasks, reports
--
-- To run:
--   psql -U <user> -d ecoinsight -f 001_initial_schema.sql
--
-- To rollback:
--   psql -U <user> -d ecoinsight -f 001_initial_schema_down.sql
-- ============================================================================

BEGIN;

-- Record migration version
CREATE TABLE IF NOT EXISTS _migrations (
    id          SERIAL PRIMARY KEY,
    version     VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO _migrations (version, name)
VALUES ('001', 'initial_schema')
ON CONFLICT (version) DO NOTHING;


-- ============================================================================
-- 1. USERS
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);


-- ============================================================================
-- 2. EMISSION_CATEGORIES
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
    UNIQUE (category_id, activity, unit)
);

CREATE INDEX IF NOT EXISTS idx_emission_factors_category ON emission_factors (category_id);
CREATE INDEX IF NOT EXISTS idx_emission_factors_activity ON emission_factors (activity);


-- ============================================================================
-- 4. EMISSION_RECORDS
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

CREATE INDEX IF NOT EXISTS idx_emission_records_user ON emission_records (user_id);
CREATE INDEX IF NOT EXISTS idx_emission_records_category ON emission_records (category_id);
CREATE INDEX IF NOT EXISTS idx_emission_records_date ON emission_records (date);
CREATE INDEX IF NOT EXISTS idx_emission_records_location ON emission_records (location);
CREATE INDEX IF NOT EXISTS idx_emission_records_user_date ON emission_records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_emission_records_user_category ON emission_records (user_id, category_id);


-- ============================================================================
-- 5. TASKS
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
                                'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING'
                            )),
    retry_count         INTEGER         NOT NULL DEFAULT 0
                            CHECK (retry_count >= 0),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    result_reference    TEXT,
    error_message       TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks (task_type);


-- ============================================================================
-- 6. REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER         NOT NULL
                        REFERENCES users (id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    report_type     VARCHAR(50)     NOT NULL DEFAULT 'SUSTAINABILITY'
                        CHECK (report_type IN (
                            'SUSTAINABILITY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'
                        )),
    period_start    DATE            NOT NULL,
    period_end      DATE            NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN (
                            'PENDING', 'GENERATING', 'COMPLETED', 'FAILED'
                        )),
    file_reference  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);


-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_emission_factors_updated_at
    BEFORE UPDATE ON emission_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_emission_records_updated_at
    BEFORE UPDATE ON emission_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


COMMIT;
