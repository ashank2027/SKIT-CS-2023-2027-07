-- ============================================================================
-- ECOINSIGHT — Migration 006: Phase 10 Forecasting Data Layer
-- ============================================================================
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    18 December 2026
-- Phase:   Phase 10 — Forecasting Data Layer & Historical Feeds (21 Nov – 18 Dec)
--
-- Description:
--   1. Creates `forecasts` table for persisting AI/ML emission projections:
--      - `id`: Unique surrogate primary key.
--      - `user_id`: Foreign key with CASCADE deletion ensuring user data isolation.
--      - `task_id`: Optional foreign key linking to `tasks` table when generated
--        via Ashank's C++ scheduler background engine.
--      - `period`: Projected calendar month formatted as 'YYYY-MM'.
--      - `predicted_co2e`: Forecasted emissions in kg CO2e.
--      - `confidence_lower`: Lower bound of the confidence interval.
--      - `confidence_upper`: Upper bound of the confidence interval.
--      - `model_version`: Forecasting model identifier ('linear-regression-v1', 'neural-prophet-v1').
--      - `created_at` / `updated_at`: Audit timestamps.
--   2. Strict separation: actual `emission_records` remain pristine and separate
--      from `forecasts`, with joint queries provided for actual-vs-predicted analysis.
--   3. Unique composite constraint (user_id, period, model_version) enabling
--      idempotent upserts when regenerating forecasts.
--   4. Creates high-performance indexes for time-series chart rendering and task tracking.
--   5. Attaches `trg_forecasts_updated_at` trigger for automatic timestamp updates.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FORECASTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forecasts (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER         NOT NULL
                            REFERENCES users (id)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE,
    task_id             INTEGER         DEFAULT NULL
                            REFERENCES tasks (id)
                            ON DELETE SET NULL
                            ON UPDATE CASCADE,
    period              VARCHAR(7)      NOT NULL
                            CHECK (period ~ '^\d{4}-\d{2}$'),
    predicted_co2e      NUMERIC(14, 4)  NOT NULL
                            CHECK (predicted_co2e >= 0),
    confidence_lower    NUMERIC(14, 4)  DEFAULT NULL
                            CHECK (confidence_lower IS NULL OR confidence_lower >= 0),
    confidence_upper    NUMERIC(14, 4)  DEFAULT NULL
                            CHECK (confidence_upper IS NULL OR confidence_upper >= confidence_lower),
    model_version       VARCHAR(50)     NOT NULL DEFAULT 'linear-regression-v1',
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique forecast point per user, period, and model version
    CONSTRAINT uq_forecasts_user_period_model UNIQUE (user_id, period, model_version)
);


-- ----------------------------------------------------------------------------
-- 2. HIGH-PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- User-scoped forecast retrieval ordered by monthly period
CREATE INDEX IF NOT EXISTS idx_forecasts_user_period
    ON forecasts (user_id, period ASC);

-- Fast lookup by scheduler task ID for worker verification and batch updates
CREATE INDEX IF NOT EXISTS idx_forecasts_task
    ON forecasts (task_id)
    WHERE task_id IS NOT NULL;

-- Chronological index for cross-user trend aggregation
CREATE INDEX IF NOT EXISTS idx_forecasts_period
    ON forecasts (period ASC);

-- Model version comparisons and user-scoped model benchmarks
CREATE INDEX IF NOT EXISTS idx_forecasts_user_model
    ON forecasts (user_id, model_version);


-- ----------------------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_forecasts_updated_at
    BEFORE UPDATE ON forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- END OF MIGRATION 006
-- ============================================================================
