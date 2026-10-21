/**
 * ============================================================
 * FILE: src/routes/taskRoutes.js
 * ROLE: Task Queue Route Definitions — mounted at /api/tasks
 * ============================================================
 *
 * This file defines the HTTP routes for the EcoInsight async task queue system.
 * All routes are PROTECTED — the `protect` middleware is applied globally via
 * `router.use(protect)` so every request must include a valid JWT.
 * Mounted in server.js as:
 *   app.use('/api/tasks', taskRoutes);
 *
 * The task queue tracks long-running background operations (CSV processing,
 * analytics, report generation, etc.) in the `tasks` database table. The
 * frontend can create tasks, monitor their progress, and retrieve results.
 *
 * ROUTES:
 *
 *   POST  /api/tasks
 *     Creates a new task record with status='QUEUED'.
 *     Required body: task_type (one of: CSV_PROCESSING, ANALYTICS, FORECAST,
 *     REPORT_GENERATION, AI_ANALYSIS). Optional: priority, result_reference.
 *     Returns HTTP 201 with the created task row.
 *     Handler: taskController.createTask
 *
 *   GET   /api/tasks
 *     Returns a paginated list of all tasks for the authenticated user.
 *     Optional query params: status (filter), limit, offset (pagination).
 *     Handler: taskController.getTasks
 *
 *   GET   /api/tasks/:id
 *     Fetches a single task by its primary key, scoped to the auth user.
 *     Returns full task details including parsed result_reference.
 *     Handler: taskController.getTaskById
 *
 *   GET   /api/tasks/:id/status
 *     Lightweight polling endpoint for the frontend to check task progress.
 *     Returns: status, retryCount, errorMessage, result, startedAt, completedAt.
 *     Intended for polling after a CSV upload or other async operation.
 *     Handler: taskController.getTaskStatus
 *
 *   PATCH /api/tasks/:id/status
 *     Updates the task's lifecycle state. Used by workers or backend pipelines.
 *     Required body: status (one of: QUEUED, RUNNING, COMPLETED, FAILED, RETRYING).
 *     Optional: result_reference, error_message.
 *     Auto-sets started_at / completed_at timestamps based on new status.
 *     Handler: taskController.updateTaskStatus
 *
 * AUTH: All routes require a valid JWT (protect middleware).
 * DEPENDENCIES: express (Router), taskController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All task routes require authentication
router.use(protect);

router.route('/')
  .post(taskController.createTask)
  .get(taskController.getTasks);

router.route('/:id')
  .get(taskController.getTaskById);

router.route('/:id/status')
  .get(taskController.getTaskStatus)
  .patch(taskController.updateTaskStatus);

module.exports = router;
