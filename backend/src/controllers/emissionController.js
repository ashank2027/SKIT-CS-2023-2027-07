/**
 * ============================================================
 * FILE: src/controllers/emissionController.js
 * ROLE: Emission Records CRUD + Bulk CSV Import Controller
 * ============================================================
 *
 * This is the largest and most feature-rich controller in the project. It manages
 * every operation on carbon emission records that belong to the logged-in user.
 * All endpoints require authentication via the `protect` middleware. The controller
 * is mounted on /api/emissions by server.js via emissionRoutes.js.
 *
 * ──────────────────────────────────────────────────────────────
 * PRIVATE CONSTANTS & HELPERS
 * ──────────────────────────────────────────────────────────────
 *
 * DEFAULT_FACTORS (object)
 *   A hardcoded map of category name → { factor, source, unit }. Used as the
 *   last-resort fallback when the database emission_factors table has no matching
 *   entry for a given category. Factor values are sourced from internationally
 *   recognised standards: India CEA, GHG Protocol, IPCC 2006, UK DEFRA/EPA,
 *   EPA WARM, and Water Services Association Guidelines.
 *   Categories: Electricity (0.82 kg CO₂e/kWh), Transportation (0.192/km),
 *   Fuel (2.68/litre), Waste (0.587/kg), Water (0.344/kl), Natural Gas (2.02/m³).
 *
 * resolveCategory(categoryInput) → { id, name }
 *   An async helper that resolves a flexible category identifier (which can be
 *   either a numeric ID string or a category name string) to a concrete category
 *   object. First tries an integer-based lookup by ID; if the input is not
 *   numeric, falls back to a case-insensitive ILIKE name match. Returns null
 *   if no match is found. Used by createEmission, updateEmission, and calculateCO2e.
 *
 * calculateCO2e(categoryInput, activity, quantity, unit) → { categoryId, categoryName, factor, source, co2e }
 *   The core computation helper shared between createEmission and updateEmission.
 *   Implements a 4-tier factor-matching algorithm against the emission_factors table:
 *     Tier 1: Exact match on both activity (ILIKE partial) AND unit.
 *     Tier 2: Partial activity match only (ignores unit).
 *     Tier 3: Unit match only within the same category.
 *     Tier 4: Any factor in the category (takes the first by ID, as a last resort).
 *   If none of the 4 tiers return a result, falls back to DEFAULT_FACTORS.
 *   Finally computes: co2e = round(quantity × factor, 4 decimal places).
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.createEmission  — POST /api/emissions
 *   Creates a single new emission record for the authenticated user.
 *   Accepts category as a numeric ID or a string name (flexible for frontend).
 *   Required fields: category, activity, quantity (positive number), unit, date.
 *   Optional: location.
 *   The client MAY optionally pre-supply emission_factor and co2e (e.g. from
 *   the calculator page); if they are missing, calculateCO2e() is called to
 *   derive them server-side, ensuring calculation integrity.
 *   Inserts into emission_records and returns the saved row enriched with the
 *   category name as HTTP 201.
 *
 * exports.getEmissions  — GET /api/emissions
 *   Returns a paginated, filterable list of the authenticated user's emission
 *   records. Supports the following query parameters:
 *     category / category_id : Filter by category (name or ID).
 *     location               : Partial match on the location field.
 *     from / to              : Date range filter (inclusive, ISO date strings).
 *     search / activity      : Partial text match on the activity field.
 *     limit / offset         : Pagination (default: limit=50, offset=0).
 *   Also executes a separate COUNT query (with the same filters applied) to
 *   return the total number of matching records for pagination UI.
 *   Returns: { status, data, emissions, total }.
 *
 * exports.getEmission  — GET /api/emissions/:id
 *   Fetches a single emission record by its primary key, scoped to the
 *   authenticated user (WHERE id = $1 AND user_id = $2 prevents cross-user
 *   data access). Returns HTTP 404 if not found or not owned by the requester.
 *
 * exports.updateEmission  — PUT /api/emissions/:id
 *   Updates an existing emission record. Similar to createEmission but first
 *   checks that the record exists and belongs to the authenticated user.
 *   Any combination of fields can be updated; unchanged fields are preserved
 *   by falling back to the existing row values (fetched with a pre-update SELECT).
 *   Re-runs calculateCO2e() whenever category, activity, quantity, or unit change,
 *   keeping the stored co2e value always consistent with the factor table.
 *   Returns the updated row joined with its category name.
 *
 * exports.deleteEmission  — DELETE /api/emissions/:id
 *   Permanently removes an emission record. Scoped to the authenticated user.
 *   Returns HTTP 404 if the record doesn't exist or doesn't belong to the user.
 *   Returns HTTP 200 with { status: 'success', data: null } on successful deletion.
 *
 * exports.importEmissions  — POST /api/emissions/import  (multipart/form-data)
 *   Bulk CSV import endpoint that accepts a CSV file uploaded via multipart form
 *   (field name: "file") and processes every row as a new emission record.
 *
 *   Full Import Flow:
 *     1. Validates that a file was uploaded (multer stores it at uploads/).
 *     2. Creates a tracking entry in the `tasks` table with status 'RUNNING'.
 *        This allows the frontend to poll /api/tasks/:id/status for progress.
 *     3. Pre-fetches ALL emission categories and emission factors from the DB
 *        into in-memory Maps/arrays. This avoids one DB round-trip per CSV row,
 *        dramatically improving throughput for large files.
 *     4. Streams and parses the CSV using the csv-parser library. Flexible
 *        column naming is supported (e.g. "category" OR "emission_category" OR
 *        "category_name"; "quantity" OR "amount" OR "usage"; etc.).
 *     5. For each row: validates required fields, resolves the category,
 *        finds the best matching emission factor using the same 4-tier logic
 *        as calculateCO2e but using the pre-loaded in-memory data, computes
 *        co2e, and inserts a row into emission_records.
 *     6. Skipped/failed rows are collected into an errors array (up to 30 shown).
 *     7. Deletes the uploaded temporary file after parsing is complete.
 *     8. Updates the task row to 'COMPLETED' (or 'FAILED' if 0 rows succeeded)
 *        with a JSON result_reference containing success/error counts and co2e sum.
 *     9. Returns a summary response: { imported, skipped, totalCO2e, data }.
 *
 * DATABASE TABLES:
 *   emission_records      — primary table (user's CO₂ data).
 *   emission_categories   — referenced for category resolution.
 *   emission_factors      — referenced for CO₂e factor lookup.
 *   tasks                 — updated to track import job status.
 *
 * DEPENDENCIES: database (pg pool), AppError, fs (Node.js), csv-parser, multer.
 * ============================================================
 */
const db = require('../config/database');
const AppError = require('../utils/AppError');
const fs = require('fs');
const csv = require('csv-parser');

// Default fallback factors per category
const DEFAULT_FACTORS = {
  'Electricity': { factor: 0.820000, source: 'India CEA / GHG Protocol Standard', unit: 'kWh' },
  'Transportation': { factor: 0.192000, source: 'UK DEFRA / EPA Standard', unit: 'km' },
  'Fuel': { factor: 2.680000, source: 'IPCC 2006 Guidelines', unit: 'litre' },
  'Waste': { factor: 0.587000, source: 'EPA WARM Model', unit: 'kg' },
  'Water': { factor: 0.344000, source: 'Water Services Association Guidelines', unit: 'kl' },
  'Natural Gas': { factor: 2.020000, source: 'IPCC 2006 Guidelines', unit: 'cubic_m' },
};

// Helper to resolve category by ID or name
const resolveCategory = async (categoryInput) => {
  if (!categoryInput) return null;

  if (!isNaN(categoryInput)) {
    const res = await db.query(
      'SELECT id, name FROM emission_categories WHERE id = $1',
      [parseInt(categoryInput, 10)]
    );
    if (res.rows.length > 0) return res.rows[0];
  }

  const res = await db.query(
    'SELECT id, name FROM emission_categories WHERE name ILIKE $1',
    [categoryInput.toString().trim()]
  );
  if (res.rows.length > 0) return res.rows[0];

  return null;
};

// Helper function to find emission factor and calculate CO2e
const calculateCO2e = async (categoryInput, activity, quantity, unit) => {
  const catObj = await resolveCategory(categoryInput);
  if (!catObj) {
    throw new AppError(`Category '${categoryInput}' not found`, 404);
  }

  const categoryId = catObj.id;
  const categoryName = catObj.name;

  // 1. Exact match by activity and unit
  let factorRes = await db.query(
    'SELECT factor, source, unit FROM emission_factors WHERE category_id = $1 AND activity ILIKE $2 AND unit ILIKE $3 LIMIT 1',
    [categoryId, `%${activity}%`, unit]
  );

  // 2. Partial match by activity
  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor, source, unit FROM emission_factors WHERE category_id = $1 AND activity ILIKE $2 LIMIT 1',
      [categoryId, `%${activity}%`]
    );
  }

  // 3. Fallback match by unit
  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor, source, unit FROM emission_factors WHERE category_id = $1 AND unit ILIKE $2 LIMIT 1',
      [categoryId, unit]
    );
  }

  // 4. Fallback match: any factor in category
  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor, source, unit FROM emission_factors WHERE category_id = $1 ORDER BY id ASC LIMIT 1',
      [categoryId]
    );
  }

  let factor;
  let source;
  if (factorRes.rows.length > 0) {
    factor = parseFloat(factorRes.rows[0].factor);
    source = factorRes.rows[0].source || 'IPCC / GHG Protocol Standard';
  } else {
    const fallback = DEFAULT_FACTORS[categoryName] || { factor: 0.000385, source: 'IPCC / GHG Protocol Standard' };
    factor = fallback.factor;
    source = fallback.source;
  }

  const co2e = parseFloat((parseFloat(quantity) * factor).toFixed(4));
  return { categoryId, categoryName, factor, source, co2e };
};

exports.createEmission = async (req, res, next) => {
  try {
    const categoryInput = req.body.category_id || req.body.categoryId || req.body.category || req.body.categoryName;
    const { activity, quantity, unit, location, date } = req.body;

    if (!categoryInput || !activity || quantity === undefined || !unit || !date) {
      return next(new AppError('Please provide category, activity, quantity, unit, and date', 400));
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return next(new AppError('Quantity must be a positive number', 400));
    }

    let factor = req.body.emission_factor || req.body.emissionFactor;
    let co2e = req.body.co2e;
    let categoryId;
    let categoryName;

    if (factor !== undefined && co2e !== undefined) {
      const catObj = await resolveCategory(categoryInput);
      if (!catObj) {
        return next(new AppError(`Category '${categoryInput}' not found`, 404));
      }
      categoryId = catObj.id;
      categoryName = catObj.name;
      factor = parseFloat(factor);
      co2e = parseFloat(co2e);
    } else {
      const calcResult = await calculateCO2e(categoryInput, activity, numQuantity, unit);
      categoryId = calcResult.categoryId;
      categoryName = calcResult.categoryName;
      factor = calcResult.factor;
      co2e = calcResult.co2e;
    }

    const query = `
      INSERT INTO emission_records
      (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [req.user.id, categoryId, activity, numQuantity, unit, factor, co2e, location || null, date];
    const result = await db.query(query, values);

    const savedRecord = {
      ...result.rows[0],
      category: categoryName,
      category_name: categoryName,
    };

    res.status(201).json(savedRecord);
  } catch (err) {
    next(err);
  }
};

exports.getEmissions = async (req, res, next) => {
  try {
    const { category, category_id, location, from, to, search, activity, limit, offset } = req.query;

    let query = `
      SELECT er.*, ec.name AS category, ec.name AS category_name
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
    `;
    const values = [req.user.id];
    let paramCount = 1;

    // Filter by category (by ID or by name)
    const catFilter = category_id || category;
    if (catFilter) {
      paramCount++;
      if (!isNaN(catFilter)) {
        query += ` AND er.category_id = $${paramCount}`;
        values.push(parseInt(catFilter, 10));
      } else {
        query += ` AND ec.name ILIKE $${paramCount}`;
        values.push(catFilter);
      }
    }

    if (location) {
      paramCount++;
      query += ` AND er.location ILIKE $${paramCount}`;
      values.push(`%${location}%`);
    }

    if (from) {
      paramCount++;
      query += ` AND er.date >= $${paramCount}`;
      values.push(from);
    }

    if (to) {
      paramCount++;
      query += ` AND er.date <= $${paramCount}`;
      values.push(to);
    }

    const searchTerm = search || activity;
    if (searchTerm) {
      paramCount++;
      query += ` AND er.activity ILIKE $${paramCount}`;
      values.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY er.date DESC, er.created_at DESC`;

    const limitVal = limit ? parseInt(limit, 10) : 50;
    const offsetVal = offset ? parseInt(offset, 10) : 0;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limitVal);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offsetVal);

    const result = await db.query(query, values);

    // Get total count matching user filter
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
    `;
    const countValues = [req.user.id];
    let countParam = 1;

    if (catFilter) {
      countParam++;
      if (!isNaN(catFilter)) {
        countQuery += ` AND er.category_id = $${countParam}`;
        countValues.push(parseInt(catFilter, 10));
      } else {
        countQuery += ` AND ec.name ILIKE $${countParam}`;
        countValues.push(catFilter);
      }
    }
    if (location) {
      countParam++;
      countQuery += ` AND er.location ILIKE $${countParam}`;
      countValues.push(`%${location}%`);
    }
    if (from) {
      countParam++;
      countQuery += ` AND er.date >= $${countParam}`;
      countValues.push(from);
    }
    if (to) {
      countParam++;
      countQuery += ` AND er.date <= $${countParam}`;
      countValues.push(to);
    }
    if (searchTerm) {
      countParam++;
      countQuery += ` AND er.activity ILIKE $${countParam}`;
      countValues.push(`%${searchTerm}%`);
    }

    const countResult = await db.query(countQuery, countValues);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    res.status(200).json({
      status: 'success',
      data: result.rows,
      emissions: result.rows,
      total: totalCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmission = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT er.*, ec.name AS category, ec.name AS category_name
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.id = $1 AND er.user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('Emission record not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateEmission = async (req, res, next) => {
  try {
    const categoryInput = req.body.category_id || req.body.categoryId || req.body.category || req.body.categoryName;
    const { activity, quantity, unit, location, date } = req.body;

    const checkRes = await db.query(
      'SELECT * FROM emission_records WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkRes.rows.length === 0) {
      return next(new AppError('Emission record not found', 404));
    }

    const existing = checkRes.rows[0];

    let categoryId = existing.category_id;
    let factor = existing.emission_factor;
    let co2e = existing.co2e;

    const newCategory = categoryInput !== undefined ? categoryInput : existing.category_id;
    const newActivity = activity !== undefined ? activity : existing.activity;
    const newQuantity = quantity !== undefined ? parseFloat(quantity) : parseFloat(existing.quantity);
    const newUnit = unit !== undefined ? unit : existing.unit;

    if (categoryInput !== undefined || activity !== undefined || quantity !== undefined || unit !== undefined) {
      const calcResult = await calculateCO2e(newCategory, newActivity, newQuantity, newUnit);
      categoryId = calcResult.categoryId;
      factor = calcResult.factor;
      co2e = calcResult.co2e;
    }

    const query = `
      UPDATE emission_records
      SET category_id = $3,
          activity = $4,
          quantity = $5,
          unit = $6,
          emission_factor = $7,
          co2e = $8,
          location = COALESCE($9, location),
          date = COALESCE($10, date),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const values = [
      req.params.id,
      req.user.id,
      categoryId,
      newActivity,
      newQuantity,
      newUnit,
      factor,
      co2e,
      location !== undefined ? location : existing.location,
      date || existing.date,
    ];

    const result = await db.query(query, values);

    const updatedRecordRes = await db.query(`
      SELECT er.*, ec.name AS category, ec.name AS category_name
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.id = $1
    `, [result.rows[0].id]);

    res.status(200).json(updatedRecordRes.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteEmission = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM emission_records WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Emission record not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Emission record deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/emissions/import
 * CSV Import with file validation, row validation, factor lookup, co2e computation,
 * database insertion, and tasks table integration for scheduler coordination.
 */
exports.importEmissions = async (req, res, next) => {
  let createdTaskId = null;
  try {
    if (!req.file) {
      return next(new AppError('Please upload a CSV file', 400));
    }

    // Create tracking task in tasks table
    try {
      const taskRes = await db.query(
        `INSERT INTO tasks (user_id, task_type, priority, status, retry_count)
         VALUES ($1, 'CSV_PROCESSING', 1, 'RUNNING', 0)
         RETURNING id`,
        [req.user.id]
      );
      createdTaskId = taskRes.rows[0].id;
    } catch (taskErr) {
      console.warn('Could not initialize task record:', taskErr.message);
    }

    // Pre-fetch all categories and emission factors for fast in-memory matching
    const [catsRes, factorsRes] = await Promise.all([
      db.query('SELECT id, name FROM emission_categories'),
      db.query('SELECT category_id, activity, unit, factor, source FROM emission_factors'),
    ]);

    const categoriesMap = new Map();
    catsRes.rows.forEach(c => {
      categoriesMap.set(c.id.toString(), c);
      categoriesMap.set(c.name.toLowerCase().trim(), c);
    });

    const allFactors = factorsRes.rows;

    const findFactor = (catId, catName, act, u) => {
      const actNorm = (act || '').toLowerCase().trim();
      const unitNorm = (u || '').toLowerCase().trim();

      // 1. Exact activity & unit match
      let match = allFactors.find(
        f => f.category_id === catId &&
             f.activity.toLowerCase().includes(actNorm) &&
             f.unit.toLowerCase() === unitNorm
      );
      if (match) return { factor: parseFloat(match.factor), source: match.source };

      // 2. Unit match within category
      match = allFactors.find(
        f => f.category_id === catId && f.unit.toLowerCase() === unitNorm
      );
      if (match) return { factor: parseFloat(match.factor), source: match.source };

      // 3. Activity partial match
      match = allFactors.find(
        f => f.category_id === catId && f.activity.toLowerCase().includes(actNorm)
      );
      if (match) return { factor: parseFloat(match.factor), source: match.source };

      // 4. Any factor in category
      match = allFactors.find(f => f.category_id === catId);
      if (match) return { factor: parseFloat(match.factor), source: match.source };

      // 5. Default fallback
      const fallback = DEFAULT_FACTORS[catName] || { factor: 0.000385, source: 'GHG Protocol Standard' };
      return fallback;
    };

    const results = [];
    const errors = [];

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let successCount = 0;
    let totalCO2eSum = 0;
    const insertedRecords = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // Row number in spreadsheet (accounting for 1-based index + header)

      // Normalize keys: trim & lowercase
      const normalizedRow = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.trim().toLowerCase()] = typeof row[k] === 'string' ? row[k].trim() : row[k];
      });

      const rawCategory = normalizedRow.category || normalizedRow.emission_category || normalizedRow.category_name;
      const rawActivity = normalizedRow.activity || normalizedRow.activity_name || normalizedRow.source;
      const rawQuantity = normalizedRow.quantity || normalizedRow.amount || normalizedRow.usage;
      const rawUnit = normalizedRow.unit || normalizedRow.uom;
      const rawDate = normalizedRow.date || normalizedRow.record_date || normalizedRow.timestamp || new Date().toISOString().split('T')[0];
      const rawLocation = normalizedRow.location || normalizedRow.site || normalizedRow.facility || 'Default Location';

      // Validation
      if (!rawCategory) {
        errors.push({ row: rowNum, message: 'Missing category' });
        continue;
      }
      if (!rawActivity) {
        errors.push({ row: rowNum, message: 'Missing activity' });
        continue;
      }
      if (rawQuantity === undefined || rawQuantity === '' || isNaN(parseFloat(rawQuantity)) || parseFloat(rawQuantity) <= 0) {
        errors.push({ row: rowNum, message: 'Quantity must be a positive number' });
        continue;
      }
      if (!rawUnit) {
        errors.push({ row: rowNum, message: 'Missing unit' });
        continue;
      }

      // Category lookup
      const catObj = categoriesMap.get(rawCategory.toLowerCase()) || categoriesMap.get(rawCategory);
      if (!catObj) {
        errors.push({ row: rowNum, message: `Category '${rawCategory}' not found` });
        continue;
      }

      const quantityVal = parseFloat(rawQuantity);
      const factorObj = findFactor(catObj.id, catObj.name, rawActivity, rawUnit);
      const co2eVal = parseFloat((quantityVal * factorObj.factor).toFixed(4));

      try {
        const insertQuery = `
          INSERT INTO emission_records
          (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `;
        const insertValues = [
          req.user.id,
          catObj.id,
          rawActivity,
          quantityVal,
          rawUnit,
          factorObj.factor,
          co2eVal,
          rawLocation,
          rawDate,
        ];

        const inserted = await db.query(insertQuery, insertValues);
        insertedRecords.push(inserted.rows[0].id);
        successCount++;
        totalCO2eSum += co2eVal;
      } catch (insertErr) {
        errors.push({ row: rowNum, message: insertErr.message });
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const taskResultData = {
      imported: successCount,
      skipped: errors.length,
      totalCO2e: totalCO2eSum.toFixed(2),
      totalRows: results.length,
      errorCount: errors.length,
      errors: errors.slice(0, 30),
    };

    // Update tasks table
    if (createdTaskId) {
      const taskFinalStatus = (successCount === 0 && results.length > 0) ? 'FAILED' : 'COMPLETED';
      await db.query(
        `UPDATE tasks
         SET status = $1,
             completed_at = NOW(),
             result_reference = $2,
             error_message = $3
         WHERE id = $4`,
        [
          taskFinalStatus,
          JSON.stringify(taskResultData),
          errors.length > 0 ? `${errors.length} rows skipped` : null,
          createdTaskId,
        ]
      );
    }

    res.status(200).json({
      status: 'success',
      taskId: createdTaskId,
      imported: successCount,
      skipped: errors.length,
      totalCO2e: totalCO2eSum.toFixed(2),
      data: {
        taskId: createdTaskId,
        totalRows: results.length,
        successCount,
        imported: successCount,
        errorCount: errors.length,
        skipped: errors.length,
        totalCO2e: totalCO2eSum.toFixed(2),
        errors,
      },
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    if (createdTaskId) {
      await db.query(
        `UPDATE tasks SET status = 'FAILED', completed_at = NOW(), error_message = $1 WHERE id = $2`,
        [err.message, createdTaskId]
      ).catch(() => {});
    }
    next(err);
  }
};
