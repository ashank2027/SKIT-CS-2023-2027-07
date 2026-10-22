/**
 * ============================================================
 * FILE: src/routes/factorRoutes.js
 * ROLE: Emission Factors Route Definitions — mounted at /api/emission-factors
 * ============================================================
 *
 * This file defines the HTTP route for the emission factors reference data.
 * Like categoryRoutes, it uses `optionalAuth` so that both logged-in users
 * and anonymous visitors (e.g. using the public calculator) can retrieve the
 * factor list without requiring authentication. Mounted in server.js as:
 *   app.use('/api/emission-factors', factorRoutes);
 *
 * ROUTES:
 *
 *   GET  /api/emission-factors
 *     Returns the full list of emission factors from the `emission_factors`
 *     table, joined with the parent category name from `emission_categories`.
 *     Results are sorted by category name then activity description.
 *     Each row contains: id, category_id, activity, factor, unit, source,
 *     and the derived category_name / category alias fields.
 *
 *     Emission factors are the numeric multipliers used to convert a raw
 *     activity quantity (e.g. 500 kWh) into CO₂ equivalents (e.g. 410 kg CO₂e).
 *     The frontend uses this list to display available factors in informational
 *     panels and to pre-populate the calculator's factor field.
 *     Handler: factorController.getAllFactors
 *
 * AUTH: optionalAuth — accessible to authenticated and anonymous users.
 * DEPENDENCIES: express (Router), factorController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const factorController = require('../controllers/factorController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/', factorController.getAllFactors);

module.exports = router;
