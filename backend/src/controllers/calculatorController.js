/**
 * ============================================================
 * FILE: src/controllers/calculatorController.js
 * ROLE: CO₂e Emissions Calculator Controller
 * ============================================================
 *
 * This controller provides a standalone CO₂ equivalent (CO₂e) calculation
 * endpoint that can be used by both authenticated users and anonymous visitors.
 * It resolves the correct emission factor from the database and computes how
 * many kilograms of CO₂e a given activity produces. Optionally it can also
 * save the calculated result as a permanent emission record. Mounted on
 * /api/calculator via calculatorRoutes.js with `optionalAuth` middleware.
 *
 * ──────────────────────────────────────────────────────────────
 * PRIVATE CONSTANTS & HELPERS
 * ──────────────────────────────────────────────────────────────
 *
 * DEFAULT_FACTORS (object)
 *   Hardcoded fallback emission factors per category for when no matching row
 *   is found in the database's emission_factors table. Identical to the
 *   DEFAULT_FACTORS in emissionController.js. Values sourced from internationally
 *   recognised standards:
 *     Electricity  : 0.82 kg CO₂e/kWh  (India CEA / GHG Protocol Standard)
 *     Transportation: 0.192 kg CO₂e/km (UK DEFRA / EPA Standard)
 *     Fuel         : 2.68 kg CO₂e/litre (IPCC 2006 Guidelines)
 *     Waste        : 0.587 kg CO₂e/kg  (EPA WARM Model)
 *     Water        : 0.344 kg CO₂e/kl  (Water Services Association Guidelines)
 *     Natural Gas  : 2.02 kg CO₂e/m³   (IPCC 2006 Guidelines)
 *
 * resolveCategory(categoryIdentifier) → { id, name } | null
 *   Resolves a flexible category identifier — either a numeric ID (sent as a
 *   string by form inputs) or a category name string — to a concrete DB row.
 *   First tries integer lookup by primary key; if the identifier is not numeric,
 *   falls back to a case-insensitive ILIKE name match. Returns null if no match.
 *
 * calculateCO2e(categoryInput, activity, quantity, unit) → { categoryId, categoryName, factor, source, co2e }
 *   The core computation function. Uses a 4-tier factor-matching strategy
 *   against the emission_factors table to find the best available factor:
 *     Tier 1: Exact match on activity (ILIKE partial) AND unit — most precise.
 *     Tier 2: Partial activity match only (unit ignored).
 *     Tier 3: Unit match only within the category (activity ignored).
 *     Tier 4: Any factor in the category (least specific, fallback of last resort).
 *   If all 4 tiers fail (no factors in DB for this category), falls back to
 *   DEFAULT_FACTORS, and if the category itself is not in DEFAULT_FACTORS,
 *   uses a generic 0.000385 factor with "IPCC / GHG Protocol Standard" citation.
 *   Computes: co2e = round(quantity × factor, 4 decimal places).
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLER
 * ──────────────────────────────────────────────────────────────
 *
 * exports.calculate  — POST /api/calculator
 *   The main calculation endpoint.
 *   REQUEST BODY fields:
 *     category / category_id / categoryId / categoryName  (required — any one)
 *       : Identifies the emission category; accepts name or numeric ID.
 *     activity  (required) : Description of the specific activity (e.g. "Diesel car").
 *     quantity  (required) : Numeric amount of usage (must be > 0).
 *     unit      (required) : Unit of measurement (e.g. "kWh", "km", "litre").
 *     save / calculateAndSave (optional, boolean) : If true, the result is also
 *       saved as a new emission record to the database. Requires authentication
 *       (req.user must be set); returns HTTP 401 if save=true but not logged in.
 *     date      (optional) : Date for the saved record (defaults to today).
 *     location  (optional) : Location for the saved record.
 *
 *   RESPONSE BODY (HTTP 200, always returned):
 *     {
 *       status: 'success',
 *       co2e        : calculated CO₂e value (number, kg)
 *       emissionFactor / factor : the emission factor used
 *       category    : category name string
 *       categoryId / category_id : numeric category ID
 *       unit        : unit string
 *       source      : citation / source of the factor used
 *       savedRecord : the saved emission_records row if save=true, else null
 *       data        : { ...same fields }  (duplicated for frontend compatibility)
 *     }
 *
 * USE CASES:
 *   - Public calculator on the website: any visitor can compute their CO₂e
 *     without logging in (optionalAuth allows this).
 *   - Pre-fill helper: the "Create Emission" form on the dashboard can call
 *     this endpoint to get a calculated CO₂e before submitting the record,
 *     or use save=true to calculate and save in one API call.
 *
 * DATABASE TABLES:
 *   emission_categories (resolved), emission_factors (looked up),
 *   emission_records (written when save=true).
 *
 * AUTH: optionalAuth — accessible to both authenticated and anonymous users.
 *       Authenticated users may optionally save the calculated result.
 * DEPENDENCIES: database (pg pool), AppError.
 * ============================================================
 */
const db = require('../config/database');
const AppError = require('../utils/AppError');

// Helper to resolve category ID and name
const resolveCategory = async (categoryIdentifier) => {
  if (!categoryIdentifier) return null;

  // Check if identifier is numeric ID
  if (!isNaN(categoryIdentifier)) {
    const res = await db.query(
      'SELECT id, name FROM emission_categories WHERE id = $1',
      [parseInt(categoryIdentifier, 10)]
    );
    if (res.rows.length > 0) return res.rows[0];
  }

  // Lookup by name
  const res = await db.query(
    'SELECT id, name FROM emission_categories WHERE name ILIKE $1',
    [categoryIdentifier.toString().trim()]
  );
  if (res.rows.length > 0) return res.rows[0];

  return null;
};

// Default factors in case database has no match
const DEFAULT_FACTORS = {
  'Electricity': { factor: 0.820000, source: 'India CEA / GHG Protocol Standard', unit: 'kWh' },
  'Transportation': { factor: 0.192000, source: 'UK DEFRA / EPA Standard', unit: 'km' },
  'Fuel': { factor: 2.680000, source: 'IPCC 2006 Guidelines', unit: 'litre' },
  'Waste': { factor: 0.587000, source: 'EPA WARM Model', unit: 'kg' },
  'Water': { factor: 0.344000, source: 'Water Services Association Guidelines', unit: 'kl' },
  'Natural Gas': { factor: 2.020000, source: 'IPCC 2006 Guidelines', unit: 'cubic_m' },
};

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

exports.calculate = async (req, res, next) => {
  try {
    const categoryInput = req.body.category_id || req.body.categoryId || req.body.category || req.body.categoryName;
    const { activity, quantity, unit, save, calculateAndSave, date, location } = req.body;

    if (!categoryInput || !activity || quantity === undefined || quantity === null || !unit) {
      return next(new AppError('Please provide category, activity, quantity, and unit', 400));
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return next(new AppError('Quantity must be a positive number', 400));
    }

    const { categoryId, categoryName, factor, source, co2e } = await calculateCO2e(
      categoryInput,
      activity,
      numQuantity,
      unit
    );

    let savedRecord = null;
    const shouldSave = save === true || save === 'true' || calculateAndSave === true;

    if (shouldSave) {
      if (!req.user) {
        return next(new AppError('Authentication required to save calculation to database', 401));
      }

      const recordDate = date || new Date().toISOString().split('T')[0];
      const query = `
        INSERT INTO emission_records
        (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [req.user.id, categoryId, activity, numQuantity, unit, factor, co2e, location || null, recordDate];
      const result = await db.query(query, values);
      savedRecord = {
        ...result.rows[0],
        category: categoryName,
        category_name: categoryName,
      };
    }

    const payload = {
      co2e,
      emissionFactor: factor,
      factor,
      category: categoryName,
      categoryId,
      category_id: categoryId,
      unit,
      source,
      savedRecord,
    };

    res.status(200).json({
      status: 'success',
      ...payload,
      data: payload,
    });
  } catch (err) {
    next(err);
  }
};
