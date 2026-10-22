/**
 * ============================================================
 * FILE: src/routes/categoryRoutes.js
 * ROLE: Emission Categories Route Definitions — mounted at /api/categories
 * ============================================================
 *
 * This file defines the HTTP routes for the emission categories reference data.
 * These routes use `optionalAuth` middleware (not the strict `protect`), meaning
 * authenticated users get req.user populated but unauthenticated requests are
 * NOT rejected — they simply proceed without a user context. This allows the
 * public-facing CO₂ calculator page to load the category list without requiring
 * visitors to log in first. Mounted in server.js as:
 *   app.use('/api/categories', categoryRoutes);
 *
 * ROUTES:
 *
 *   GET  /api/categories
 *     Returns the complete list of emission categories from the
 *     `emission_categories` table, sorted alphabetically by name.
 *     Each item contains: id, name, description, created_at.
 *     These categories (Electricity, Fuel, Natural Gas, Transportation,
 *     Waste, Water) are the master values used in emission record creation,
 *     the calculator, and all chart groupings throughout the application.
 *     Handler: categoryController.getAllCategories
 *
 * AUTH: optionalAuth — accessible to authenticated and anonymous users.
 * DEPENDENCIES: express (Router), categoryController, authMiddleware.
 * ============================================================
 */
const express = require('express');
const categoryController = require('../controllers/categoryController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/', categoryController.getAllCategories);

module.exports = router;
