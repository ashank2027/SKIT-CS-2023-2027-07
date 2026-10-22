/**
 * ============================================================
 * FILE: src/routes/analyticsRoutes.js
 * ROLE: Analytics Route Definitions — mounted at /api/analytics
 * ============================================================
 *
 * This file defines the single HTTP route that serves the advanced analytics
 * data for the EcoInsight Analytics page. The route is PROTECTED — the
 * `protect` middleware is applied via `router.use(protect)` so all requests
 * must carry a valid JWT. Mounted in server.js as:
 *   app.use('/api/analytics', analyticsRoutes);
 *
 * ROUTES:
 *
 *   GET  /api/analytics
 *     Returns five analytics datasets in a single JSON response, all of which
 *     can be filtered using optional query parameters:
 *       from      : Start date (ISO string, inclusive).
 *       to        : End date (ISO string, inclusive).
 *       category  : Category name or numeric ID.
 *       location  : Partial match on emission location.
 *       sector    : GHG scope filter ("Scope 1", "Scope 2", "Scope 3",
 *                   or their aliases "direct", "indirect", "value").
 *       industry  : Partial match on user's industry field.
 *
 *     Datasets returned:
 *       emissionsByTime     — Monthly trend with previous-year comparison.
 *       emissionsByCategory — Totals per category with record counts and colors.
 *       emissionsByLocation — Totals per location, sorted descending.
 *       emissionsByIndustry — Cross-user industry benchmark with percentages.
 *       emissionsBySector   — GHG Scope 1 / 2 / 3 aggregation from category data.
 *
 *     Handler: analyticsController.getAnalytics
 *
 * AUTH: All routes require a valid JWT (protect middleware).
 * DEPENDENCIES: express (Router), analyticsController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', analyticsController.getAnalytics);

module.exports = router;
