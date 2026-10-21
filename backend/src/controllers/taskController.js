/**
 * ============================================================
 * FILE: src/controllers/taskController.js
 * ROLE: Async Task Queue Management Controller
 * ============================================================
 *
 * This controller manages asynchronous background task records stored in the
 * `tasks` database table. The task system allows the frontend to submit long-
 * running operations (such as CSV processing) and then poll for their completion
 * status without blocking the HTTP connection. Mounted on /api/tasks via
 * taskRoutes.js, all routes require full authentication (`protect` middleware).
 *
 * ──────────────────────────────────────────────────────────────
 * TASK SYSTEM OVERVIEW
 * ──────────────────────────────────────────────────────────────
 *
 * VALID_TASK_TYPES (array)
 *   The recognised categories of tasks this system accepts:
 *     CSV_PROCESSING    — Bulk CSV import of emission records.
 *     ANALYTICS         — Deferred heavy analytics computation.
 *     FORECAST          — Future emission projection calculation.
 *     REPORT_GENERATION — Scheduled PDF/Excel report creation.
 *     AI_ANALYSIS       — AI-powered carbon footprint analysis.
 *   Tasks with any other type are rejected with HTTP 400.
 *
 * VALID_STATUSES (array)
 *   The lifecycle states a task can occupy:
 *     QUEUED    — Created but not yet picked up by a worker.
 *     RUNNING   — Currently being processed.
 *     COMPLETED — Finished successfully; result_reference holds the output.
 *     FAILED    — Processing terminated with an error; error_message is set.
 *     RETRYING  — A failed task is being re-attempted.
 *   Only these values are accepted by the updateTaskStatus endpoint.
 *
 * HOW THE CSV IMPORT USES TASKS:
 *   When a user uploads a CSV via POST /api/emissions/import, the emissionController
 *   creates a task row with type='CSV_PROCESSING' and status='RUNNING', then
 *   processes the file synchronously and updates the task to 'COMPLETED' or 'FAILED'.
 *   The response includes the taskId so the frontend can use /api/tasks/:id/status
 *   to display progress information even after the upload response is received.
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.createTask  — POST /api/tasks
 *   Creates a new task record in QUEUED status.
 *   Required body field: task_type (or taskType) — must be in VALID_TASK_TYPES.
 *   Optional: priority (integer, default 0), result_reference (object or string).
 *   result_reference objects are JSON.stringify'd before storage.
 *   Returns HTTP 201 with the new task row.
 *
 * exports.getTasks  — GET /api/tasks
 *   Returns a paginated list of all tasks belonging to the authenticated user.
 *   Optional query params:
 *     status : Filter to tasks with a specific status (e.g. "COMPLETED").
 *     limit  : Max results to return (default 50).
 *     offset : Number of results to skip for pagination (default 0).
 *   result_reference is parsed from JSON string back to an object for each task
 *   (stored as text in PostgreSQL, returned as a JS object in the API).
 *   Returns: { status, count, data, tasks }.
 *
 * exports.getTaskById  — GET /api/tasks/:id
 *   Fetches a single task by its primary key, scoped to the authenticated user.
 *   Returns HTTP 404 if not found or not owned by the requester.
 *   result_reference is parsed and exposed as both `result` and `result_reference`.
 *   Returns the task object alongside all its fields as top-level keys.
 *
 * exports.getTaskStatus  — GET /api/tasks/:id/status
 *   A lightweight polling endpoint designed for the frontend to check task progress.
 *   Returns a reduced set of fields: status, taskId, retryCount, errorMessage,
 *   result (parsed), result_reference (raw), startedAt, completedAt.
 *   Also includes a nested `data` object for consistent API shape.
 *   The CSV import flow relies on this endpoint for progress indicators.
 *
 * exports.updateTaskStatus  — PATCH /api/tasks/:id/status
 *   Allows workers, schedulers, or the backend pipeline to update a task's
 *   lifecycle state. Required body: status (must be in VALID_STATUSES).
 *   Optional: result_reference (updated output), error_message (failure reason).
 *   Smart timestamp handling:
 *     - started_at is set to NOW() the first time status becomes 'RUNNING'
 *       (using COALESCE to preserve existing value on subsequent updates).
 *     - completed_at is set to NOW() when status becomes 'COMPLETED' or 'FAILED'.
 *   Updates are always scoped to the authenticated user (AND user_id = $5).
 *   Returns HTTP 404 if the task is not found or not owned by the requester.
 *
 * DATABASE TABLE: tasks
 *   Columns: id, user_id, task_type, priority, status, retry_count,
 *            created_at, started_at, completed_at, result_reference, error_message.
 *
 * DEPENDENCIES: database (pg pool), AppError.
 * ============================================================
 */
const db = require('../config/database');
const AppError = require('../utils/AppError');

const VALID_TASK_TYPES = [
  'CSV_PROCESSING',
  'ANALYTICS',
  'FORECAST',
  'REPORT_GENERATION',
  'AI_ANALYSIS',
];

const VALID_STATUSES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'RETRYING',
];

/**
 * POST /api/tasks
 * Create a new task in QUEUED state
 */
exports.createTask = async (req, res, next) => {
  try {
    const { task_type, taskType, priority, result_reference } = req.body;
    const type = task_type || taskType;

    if (!type || !VALID_TASK_TYPES.includes(type)) {
      return next(new AppError(`Invalid task_type. Must be one of: ${VALID_TASK_TYPES.join(', ')}`, 400));
    }

    const taskPriority = parseInt(priority, 10) || 0;
    const resultRefStr = typeof result_reference === 'object' ? JSON.stringify(result_reference) : (result_reference || null);

    const query = `
      INSERT INTO tasks (user_id, task_type, priority, status, retry_count, result_reference)
      VALUES ($1, $2, $3, 'QUEUED', 0, $4)
      RETURNING *
    `;
    const result = await db.query(query, [req.user.id, type, taskPriority, resultRefStr]);
    const task = result.rows[0];

    res.status(201).json({
      status: 'success',
      data: task,
      task,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks
 * List tasks for the authenticated user with optional status filter & pagination
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;

    const query = `
      SELECT id, task_type, priority, status, retry_count,
             created_at, started_at, completed_at, result_reference, error_message
      FROM tasks
      WHERE user_id = $1
        AND ($2::VARCHAR IS NULL OR status = $2)
      ORDER BY created_at DESC
      LIMIT COALESCE($3, 50)
      OFFSET COALESCE($4, 0)
    `;

    const limitVal = limit ? parseInt(limit, 10) : 50;
    const offsetVal = offset ? parseInt(offset, 10) : 0;
    const statusVal = status ? status.toUpperCase() : null;

    const result = await db.query(query, [req.user.id, statusVal, limitVal, offsetVal]);

    const tasks = result.rows.map(task => {
      let parsedResult = null;
      if (task.result_reference) {
        try {
          parsedResult = JSON.parse(task.result_reference);
        } catch {
          parsedResult = task.result_reference;
        }
      }
      return {
        ...task,
        result: parsedResult,
      };
    });

    res.status(200).json({
      status: 'success',
      count: tasks.length,
      data: tasks,
      tasks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks/:id
 * Retrieve a specific task by ID
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const query = `
      SELECT id, user_id, task_type, priority, status, retry_count,
             created_at, started_at, completed_at, result_reference, error_message
      FROM tasks
      WHERE id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('Task not found', 404));
    }

    const task = result.rows[0];
    let parsedResult = null;
    if (task.result_reference) {
      try {
        parsedResult = JSON.parse(task.result_reference);
      } catch {
        parsedResult = task.result_reference;
      }
    }

    const payload = {
      ...task,
      result: parsedResult,
    };

    res.status(200).json({
      status: 'success',
      data: payload,
      ...payload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks/:id/status
 * Polling endpoint for frontend task progress monitoring
 */
exports.getTaskStatus = async (req, res, next) => {
  try {
    const query = `
      SELECT id, status, retry_count, error_message, result_reference, started_at, completed_at
      FROM tasks
      WHERE id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('Task not found', 404));
    }

    const task = result.rows[0];
    let parsedResult = null;
    if (task.result_reference) {
      try {
        parsedResult = JSON.parse(task.result_reference);
      } catch {
        parsedResult = task.result_reference;
      }
    }

    res.status(200).json({
      status: task.status,
      taskId: task.id,
      retryCount: task.retry_count,
      errorMessage: task.error_message,
      result: parsedResult,
      result_reference: task.result_reference,
      startedAt: task.started_at,
      completedAt: task.completed_at,
      data: {
        id: task.id,
        status: task.status,
        result: parsedResult,
        errorMessage: task.error_message,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Update task status (used by scheduler, workers, or backend pipeline)
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status, result_reference, error_message } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return next(new AppError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400));
    }

    const resultRefStr = typeof result_reference === 'object' ? JSON.stringify(result_reference) : (result_reference || null);

    const query = `
      UPDATE tasks
      SET status = $2,
          started_at = COALESCE(started_at, CASE WHEN $2 = 'RUNNING' THEN NOW() ELSE started_at END),
          completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE completed_at END,
          result_reference = COALESCE($3, result_reference),
          error_message = COALESCE($4, error_message)
      WHERE id = $1 AND user_id = $5
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      status,
      resultRefStr,
      error_message || null,
      req.user.id,
    ]);

    if (result.rows.length === 0) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
