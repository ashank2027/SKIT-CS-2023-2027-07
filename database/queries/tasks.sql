-- ============================================================================
-- ECOINSIGHT — Task Queries
-- ============================================================================
-- Supports: POST/GET /api/tasks, GET /api/tasks/:id, GET /api/tasks/:id/status
-- Integrates with Ashank's C++ Scheduler.
-- All queries are user-scoped where applicable.
-- ============================================================================


-- ---------------------------------------------------------
-- 1. CREATE TASK
-- ---------------------------------------------------------
-- Used by: POST /api/tasks (backend creates task before sending to scheduler)

-- name: create-task
INSERT INTO tasks
    (user_id, task_type, priority, status, retry_count)
VALUES ($1, $2, $3, 'QUEUED', 0)
RETURNING id, user_id, task_type, priority, status, created_at;


-- ---------------------------------------------------------
-- 2. GET TASK BY ID (user-scoped)
-- ---------------------------------------------------------
-- Used by: GET /api/tasks/:id

-- name: get-task-by-id
SELECT id, task_type, priority, status, retry_count,
       created_at, started_at, completed_at,
       result_reference, error_message
FROM tasks
WHERE id = $1 AND user_id = $2;


-- ---------------------------------------------------------
-- 3. GET TASK STATUS
-- ---------------------------------------------------------
-- Used by: GET /api/tasks/:id/status (polling from frontend)

-- name: get-task-status
SELECT id, status, retry_count, error_message, result_reference
FROM tasks
WHERE id = $1 AND user_id = $2;


-- ---------------------------------------------------------
-- 4. LIST TASKS FOR USER (with optional status filter)
-- ---------------------------------------------------------
-- Used by: GET /api/tasks (e.g., in a Task Monitoring UI)
-- $2 = optional status filter (e.g., 'FAILED', 'COMPLETED')

-- name: list-user-tasks
SELECT id, task_type, priority, status, retry_count,
       created_at, started_at, completed_at
FROM tasks
WHERE user_id = $1
  AND ($2::VARCHAR IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT COALESCE($3, 50)
OFFSET COALESCE($4, 0);


-- ---------------------------------------------------------
-- 5. UPDATE TASK STATUS (Internal Backend / Scheduler use)
-- ---------------------------------------------------------
-- Used by: Scheduler integration when task starts, completes, or fails.
-- This might not need user_id scoping if called directly by an admin/system worker.

-- name: update-task-status
UPDATE tasks
SET status = $2,
    started_at = COALESCE(started_at, CASE WHEN $2 = 'RUNNING' THEN NOW() ELSE started_at END),
    completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE completed_at END,
    result_reference = COALESCE($3, result_reference),
    error_message = COALESCE($4, error_message)
WHERE id = $1
RETURNING id, status, started_at, completed_at;


-- ---------------------------------------------------------
-- 6. INCREMENT RETRY COUNT
-- ---------------------------------------------------------
-- Used by: Scheduler when a task fails and is requeued.

-- name: increment-task-retry
UPDATE tasks
SET status = 'RETRYING',
    retry_count = retry_count + 1
WHERE id = $1
RETURNING id, status, retry_count;
