/**
 * ============================================================
 * FILE: src/routes/emissionRoutes.js
 * ROLE: Emission Records Route Definitions — mounted at /api/emissions
 * ============================================================
 *
 * This file defines the full REST route surface for carbon emission record
 * management, including a special file-upload route for bulk CSV import.
 * All routes are PROTECTED — the `protect` middleware is applied globally to
 * this router via `router.use(protect)`, so every request must carry a valid
 * JWT or it will be rejected with HTTP 401 before reaching any handler.
 *
 * multer is configured here with `dest: 'uploads/'` to store uploaded files
 * temporarily on disk (relative to the project root). After processing,
 * the emissionController deletes the file via fs.unlinkSync().
 *
 * Mounted in server.js as:
 *   app.use('/api/emissions', emissionRoutes);
 *
 * ROUTES:
 *
 *   POST  /api/emissions/import  (multipart/form-data, field: "file")
 *     Bulk CSV import. multer's `upload.single('file')` middleware intercepts
 *     this request, saves the uploaded CSV to the uploads/ directory, and
 *     populates req.file with the file metadata. The handler then reads,
 *     validates, and inserts all rows from the CSV as emission records.
 *     NOTE: This route MUST be defined before the `router.route('/')` block
 *     so Express matches /import before trying to match '/' with a body param.
 *     Handler: emissionController.importEmissions
 *
 *   GET   /api/emissions
 *     Returns a paginated, filterable list of the user's emission records.
 *     Supports query params: category, category_id, location, from, to,
 *     search/activity, limit, offset.
 *     Handler: emissionController.getEmissions
 *
 *   POST  /api/emissions
 *     Creates a single new emission record. Expects a JSON body with:
 *     category (ID or name), activity, quantity, unit, date, and optionally
 *     location, emission_factor, co2e.
 *     Handler: emissionController.createEmission
 *
 *   GET   /api/emissions/:id
 *     Fetches a specific emission record by ID (must belong to the auth user).
 *     Handler: emissionController.getEmission
 *
 *   PUT   /api/emissions/:id
 *     Updates an existing emission record (partial or full update).
 *     Recalculates CO₂e if activity/quantity/unit/category changes.
 *     Handler: emissionController.updateEmission
 *
 *   DELETE /api/emissions/:id
 *     Permanently deletes a specific emission record.
 *     Handler: emissionController.deleteEmission
 *
 * AUTH: All routes require a valid JWT (protect middleware).
 * DEPENDENCIES: express (Router), emissionController, authMiddleware, multer.
 * ============================================================
 */
const express = require('express');
const emissionController = require('../controllers/emissionController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.use(protect);

router.post('/import', upload.single('file'), emissionController.importEmissions);

router.route('/')
  .get(emissionController.getEmissions)
  .post(emissionController.createEmission);

router.route('/:id')
  .get(emissionController.getEmission)
  .put(emissionController.updateEmission)
  .delete(emissionController.deleteEmission);

module.exports = router;
