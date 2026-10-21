/**
 * ============================================================
 * FILE: src/controllers/factorController.js
 * ROLE: Emission Factors Reference Data Controller
 * ============================================================
 *
 * This controller exposes a single read-only endpoint that returns the full
 * list of emission conversion factors from the `emission_factors` table joined
 * with their parent emission category from `emission_categories`. It is mounted
 * on /api/emission-factors via factorRoutes.js and uses `optionalAuth` so that
 * both authenticated users and anonymous visitors (e.g. using the public
 * calculator page) can access the factor list.
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.getAllFactors  — GET /api/emission-factors
 *   Retrieves all rows from `emission_factors` with their associated category
 *   name via an INNER JOIN on emission_categories. Results are sorted first by
 *   category name and then by the activity description within each category,
 *   making the list easy for the frontend to group into a dropdown by category.
 *
 *   Each returned row contains all columns from emission_factors PLUS:
 *     category_name : The name of the parent emission category
 *                     (aliased twice as both `category_name` and `category`
 *                      for frontend compatibility — some frontend code may
 *                      reference either alias).
 *
 *   Typical emission_factors row fields:
 *     id          : Numeric primary key of the factor row.
 *     category_id : Foreign key → emission_categories.id.
 *     activity    : Description of the specific activity, e.g.
 *                   "Grid Electricity India", "Diesel Vehicle", "Landfill Waste".
 *     factor      : The CO₂-equivalent emission coefficient (numeric).
 *                   Multiply this by the quantity to get kg CO₂e.
 *     unit        : Unit for the quantity, e.g. "kWh", "km", "litre", "kg".
 *     source      : Citation for the factor — e.g. "India CEA / GHG Protocol",
 *                   "IPCC 2006 Guidelines", "UK DEFRA / EPA Standard".
 *
 * HOW THE FACTORS ARE USED:
 *   The calculator and emission creation flow use these factors to compute
 *   CO₂ equivalents: co2e = quantity × factor. The emissionController and
 *   calculatorController both implement a multi-tier factor-matching algorithm
 *   (exact activity+unit → activity → unit → any in category → hardcoded
 *   default) to find the most accurate factor for a given input.
 *
 * DATABASE TABLES: emission_factors (primary), emission_categories (joined).
 * AUTH: optionalAuth — accessible to authenticated and anonymous users.
 * DEPENDENCIES: database (pg pool).
 * ============================================================
 */
const db = require('../config/database');

exports.getAllFactors = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT ef.*, ec.name AS category_name, ec.name AS category
      FROM emission_factors ef
      JOIN emission_categories ec ON ef.category_id = ec.id
      ORDER BY ec.name, ef.activity
    `);
    
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};
