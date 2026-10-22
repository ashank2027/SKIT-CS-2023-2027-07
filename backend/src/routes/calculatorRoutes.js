/**
 * ============================================================
 * FILE: src/routes/calculatorRoutes.js
 * ROLE: CO₂e Calculator Route Definitions — mounted at /api/calculator
 * ============================================================
 *
 * This file defines the HTTP route for the standalone CO₂ equivalent calculator.
 * Unlike most other route files, this one uses `optionalAuth` middleware so that
 * the calculator is accessible to BOTH authenticated users and anonymous visitors.
 * When a valid JWT is present, req.user is populated and the controller can
 * optionally save the result to the database. When no token is present, the
 * calculation is performed and returned without saving.
 *
 * Mounted in server.js as:
 *   app.use('/api/calculator', calculatorRoutes);
 *
 * ROUTES:
 *
 *   POST  /api/calculator
 *     Accepts a JSON body describing an activity:
 *       category (required) : Category name or numeric ID.
 *       activity (required) : Description of the specific activity.
 *       quantity (required) : Positive numeric usage amount.
 *       unit     (required) : Unit of measurement (kWh, km, litre, kg, etc.).
 *       save / calculateAndSave (optional, boolean) : If true AND the user is
 *         authenticated, saves the result as an emission record to the DB.
 *       date     (optional) : Date for the saved record (defaults to today).
 *       location (optional) : Location for the saved record.
 *
 *     Returns the calculated co2e, the emission factor used, its source, and
 *     optionally the savedRecord if save=true.
 *     Handler: calculatorController.calculate
 *
 * USE CASE:
 *   - Public calculator page: anonymous visitors can estimate their footprint.
 *   - Authenticated users: same calculation but with option to save the result
 *     as a permanent emission record in one API call.
 *
 * AUTH: optionalAuth — accessible to authenticated and anonymous users.
 * DEPENDENCIES: express (Router), calculatorController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const calculatorController = require('../controllers/calculatorController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);
router.post('/', calculatorController.calculate);

module.exports = router;
