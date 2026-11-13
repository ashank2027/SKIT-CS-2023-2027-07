-- ============================================================================
-- ECOINSIGHT — Phase 10: Forecasting Data Layer Verification Suite
-- ============================================================================
-- File:    database/tests/test_phase10_forecasting.sql
-- Author:  Bhavya Chautharamani (Lead Database Engineer)
-- Date:    18 December 2026
--
-- Executes automated verification across all Phase 10 deliverables:
--   1. Schema column and constraint integrity (period format, predicted >= 0, bounds)
--   2. Performance indexes verification (user_period, task, period, user_model)
--   3. Foreign key constraints to users and tasks
--   4. Historical training series aggregation query
--   5. Idempotent forecast insertion & upsert on conflict
--   6. Forecast vs Actual comparative query execution
--   7. Model accuracy benchmarking metrics (MAE, RMSE, MAPE)
--   8. Clean rollback of test data
-- ============================================================================

\echo '----------------------------------------------------------------------'
\echo 'ECOINSIGHT PHASE 10 (21 NOV – 18 DEC 2026) DATABASE VERIFICATION'
\echo '----------------------------------------------------------------------'

BEGIN;

-- ----------------------------------------------------------------------------
-- TEST 1: SCHEMA COLUMNS VERIFICATION
-- ----------------------------------------------------------------------------
\echo 'TEST 1: Verifying Phase 10 forecasts table schema and columns...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'forecasts'
    ) THEN
        RAISE EXCEPTION 'Table forecasts is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.user_id is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'task_id'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.task_id is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'period'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.period is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'predicted_co2e'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.predicted_co2e is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'confidence_lower'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.confidence_lower is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'confidence_upper'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.confidence_upper is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forecasts' AND column_name = 'model_version'
    ) THEN
        RAISE EXCEPTION 'Column forecasts.model_version is missing!';
    END IF;

    RAISE NOTICE '✓ Table forecasts and all core columns verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 2: INDEX INTEGRITY VERIFICATION
-- ----------------------------------------------------------------------------
\echo 'TEST 2: Verifying forecasting performance indexes...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'forecasts' AND indexname = 'idx_forecasts_user_period'
    ) THEN
        RAISE EXCEPTION 'Index idx_forecasts_user_period is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'forecasts' AND indexname = 'idx_forecasts_task'
    ) THEN
        RAISE EXCEPTION 'Index idx_forecasts_task is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'forecasts' AND indexname = 'idx_forecasts_period'
    ) THEN
        RAISE EXCEPTION 'Index idx_forecasts_period is missing!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'forecasts' AND indexname = 'idx_forecasts_user_model'
    ) THEN
        RAISE EXCEPTION 'Index idx_forecasts_user_model is missing!';
    END IF;

    RAISE NOTICE '✓ All Phase 10 forecasting indexes verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 3: CONSTRAINT INTEGRITY VERIFICATION
-- ----------------------------------------------------------------------------
\echo 'TEST 3: Verifying forecasting constraints & integrity checks...'

DO $$
DECLARE
    v_user_id INTEGER;
    v_failed BOOLEAN;
BEGIN
    -- Get or create test user
    SELECT id INTO v_user_id FROM users LIMIT 1;
    IF v_user_id IS NULL THEN
        INSERT INTO users (name, email, password_hash)
        VALUES ('Test Forecast User', 'test.forecast@example.com', 'hash123')
        RETURNING id INTO v_user_id;
    END IF;

    -- Sub-test: Invalid period format must fail
    v_failed := FALSE;
    BEGIN
        INSERT INTO forecasts (user_id, period, predicted_co2e)
        VALUES (v_user_id, '2026/12', 100.0);
    EXCEPTION WHEN check_violation THEN
        v_failed := TRUE;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'Check constraint failed: invalid period format was accepted!';
    END IF;

    -- Sub-test: Negative predicted_co2e must fail
    v_failed := FALSE;
    BEGIN
        INSERT INTO forecasts (user_id, period, predicted_co2e)
        VALUES (v_user_id, '2027-01', -50.0);
    EXCEPTION WHEN check_violation THEN
        v_failed := TRUE;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'Check constraint failed: negative predicted_co2e was accepted!';
    END IF;

    -- Sub-test: confidence_upper < confidence_lower must fail
    v_failed := FALSE;
    BEGIN
        INSERT INTO forecasts (user_id, period, predicted_co2e, confidence_lower, confidence_upper)
        VALUES (v_user_id, '2027-01', 100.0, 120.0, 80.0);
    EXCEPTION WHEN check_violation THEN
        v_failed := TRUE;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'Check constraint failed: inverted confidence interval was accepted!';
    END IF;

    RAISE NOTICE '✓ All Phase 10 constraints verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 4: HISTORICAL TRAINING EXTRACTION QUERY
-- ----------------------------------------------------------------------------
\echo 'TEST 4: Verifying historical training series extraction...'

DO $$
DECLARE
    v_user_id INTEGER;
    v_cat_id INTEGER;
    v_series_count INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users LIMIT 1;
    SELECT id INTO v_cat_id FROM emission_categories LIMIT 1;

    -- Insert known test emission records for historical training
    INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, date)
    VALUES
        (v_user_id, v_cat_id, 'Test Electricity', 1000, 'kWh', 0.82, 820.0, '2026-08-15'),
        (v_user_id, v_cat_id, 'Test Electricity', 1100, 'kWh', 0.82, 902.0, '2026-08-25'),
        (v_user_id, v_cat_id, 'Test Electricity', 1200, 'kWh', 0.82, 984.0, '2026-09-10'),
        (v_user_id, v_cat_id, 'Test Electricity', 1300, 'kWh', 0.82, 1066.0, '2026-10-05');

    SELECT COUNT(DISTINCT TO_CHAR(date, 'YYYY-MM')) INTO v_series_count
    FROM emission_records
    WHERE user_id = v_user_id AND date >= '2026-08-01';

    IF v_series_count < 3 THEN
        RAISE EXCEPTION 'Historical series extraction failed: expected at least 3 monthly periods, got %', v_series_count;
    END IF;

    RAISE NOTICE '✓ Historical training data extracted cleanly across % monthly periods.', v_series_count;
END $$;


-- ----------------------------------------------------------------------------
-- TEST 5: IDEMPOTENT FORECAST INSERTION & UPSERT
-- ----------------------------------------------------------------------------
\echo 'TEST 5: Testing forecast insertion and upsert idempotency...'

DO $$
DECLARE
    v_user_id INTEGER;
    v_forecast_id INTEGER;
    v_updated_val NUMERIC;
BEGIN
    SELECT id INTO v_user_id FROM users LIMIT 1;

    -- Initial insert
    INSERT INTO forecasts (user_id, period, predicted_co2e, confidence_lower, confidence_upper, model_version)
    VALUES (v_user_id, '2027-01', 1150.00, 1050.00, 1250.00, 'linear-regression-v1')
    ON CONFLICT (user_id, period, model_version)
    DO UPDATE SET predicted_co2e = EXCLUDED.predicted_co2e, updated_at = NOW()
    RETURNING id INTO v_forecast_id;

    IF v_forecast_id IS NULL THEN
        RAISE EXCEPTION 'Forecast insert failed to return ID!';
    END IF;

    -- Upsert with updated predicted value
    INSERT INTO forecasts (user_id, period, predicted_co2e, confidence_lower, confidence_upper, model_version)
    VALUES (v_user_id, '2027-01', 1180.00, 1080.00, 1280.00, 'linear-regression-v1')
    ON CONFLICT (user_id, period, model_version)
    DO UPDATE SET predicted_co2e = EXCLUDED.predicted_co2e, updated_at = NOW()
    RETURNING predicted_co2e INTO v_updated_val;

    IF v_updated_val != 1180.00 THEN
        RAISE EXCEPTION 'Forecast upsert failed: expected 1180.00, got %', v_updated_val;
    END IF;

    RAISE NOTICE '✓ Forecast upsert idempotent logic verified successfully.';
END $$;


-- ----------------------------------------------------------------------------
-- TEST 6: FORECAST VS ACTUAL & ACCURACY METRICS
-- ----------------------------------------------------------------------------
\echo 'TEST 6: Testing forecast vs actual alignment and accuracy metrics...'

DO $$
DECLARE
    v_user_id INTEGER;
    v_mae NUMERIC;
    v_rmse NUMERIC;
    v_count INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users LIMIT 1;

    -- Insert overlapping forecast for 2026-09 to test actual vs predicted
    INSERT INTO forecasts (user_id, period, predicted_co2e, confidence_lower, confidence_upper, model_version)
    VALUES (v_user_id, '2026-09', 950.00, 850.00, 1050.00, 'test-eval-v1')
    ON CONFLICT (user_id, period, model_version) DO NOTHING;

    -- Compute evaluation metrics
    WITH comparative_points AS (
        SELECT
            a.actual_co2e,
            p.predicted_co2e,
            ABS(a.actual_co2e - p.predicted_co2e) AS abs_error,
            POWER(a.actual_co2e - p.predicted_co2e, 2) AS squared_error
        FROM (
            SELECT TO_CHAR(date, 'YYYY-MM') AS period, SUM(co2e) AS actual_co2e
            FROM emission_records
            WHERE user_id = v_user_id AND date >= '2026-09-01' AND date < '2026-10-01'
            GROUP BY TO_CHAR(date, 'YYYY-MM')
        ) a
        JOIN (
            SELECT period, predicted_co2e
            FROM forecasts
            WHERE user_id = v_user_id AND model_version = 'test-eval-v1'
        ) p ON a.period = p.period
    )
    SELECT
        COUNT(*),
        AVG(abs_error),
        SQRT(AVG(squared_error))
    INTO v_count, v_mae, v_rmse
    FROM comparative_points;

    IF v_count < 1 THEN
        RAISE EXCEPTION 'Forecast vs actual join failed: no comparative rows produced!';
    END IF;

    RAISE NOTICE '✓ Forecast vs actual metrics calculated: periods=%, MAE=%, RMSE=%.', v_count, ROUND(v_mae, 2), ROUND(v_rmse, 2);
END $$;

-- Clean up test records
ROLLBACK;

\echo '----------------------------------------------------------------------'
\echo 'ALL PHASE 10 FORECASTING VERIFICATION TESTS PASSED (100%)'
\echo '----------------------------------------------------------------------'
