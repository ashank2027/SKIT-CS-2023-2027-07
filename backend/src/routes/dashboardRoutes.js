/**
 * ============================================================
 * FILE: src/routes/dashboardRoutes.js
 * ROLE: Dashboard Route Definitions — mounted at /api/dashboard
 * ============================================================
 *
 * This file defines the single HTTP route that serves all dashboard data.
 * The route is PROTECTED — the `protect` middleware is applied via
 * `router.use(protect)` so all requests must carry a valid JWT.
 * Mounted in server.js as:
 *   app.use('/api/dashboard', dashboardRoutes);
 *
 * ROUTES:
 *
 *   GET  /api/dashboard
 *     Returns a comprehensive aggregated JSON payload containing everything
 *     the EcoInsight dashboard page needs to render in a single API call:
 *       - KPI summary: total emissions, current/previous period, percentage change
 *       - Highest-emitting category with its GHG scope
 *       - Recent emission records (last 5)
 *       - Monthly emission trend (up to 12 months)
 *       - Category breakdown with chart colors and scope labels
 *       - GHG scope allocation percentages (Scope 1 / 2 / 3)
 *       - System metrics: kernel efficiency, ingested CSV count, factor confidence
 *       - Projected Q4, reduction velocity, and YTD actual
 *     All data is scoped to the authenticated user.
 *     Handler: dashboardController.getDashboard
 *
 * AUTH: All routes require a valid JWT (protect middleware).
 * DEPENDENCIES: express (Router), dashboardController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', dashboardController.getDashboard);

module.exports = router;
