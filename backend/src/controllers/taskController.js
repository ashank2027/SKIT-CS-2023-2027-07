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
