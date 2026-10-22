/**
 * ============================================================
 * FILE: src/controllers/categoryController.js
 * ROLE: Emission Categories Reference Data Controller
 * ============================================================
 *
 * This controller exposes a single read-only endpoint that returns the complete
 * list of emission categories stored in the `emission_categories` table. It is
 * mounted on /api/categories via categoryRoutes.js and uses `optionalAuth`
 * (not the strict `protect` middleware) so that unauthenticated users such as
 * visitors to the public CO₂ calculator can also retrieve this list.
 *
 * ──────────────────────────────────────────────────────────────
 * EXPORTED HANDLERS
 * ──────────────────────────────────────────────────────────────
 *
 * exports.getAllCategories  — GET /api/categories
 *   Fetches all rows from `emission_categories` and returns them ordered
 *   alphabetically by name. The returned fields are:
 *     id          : Numeric primary key (used as category_id in emission_records
 *                   and emission_factors tables).
 *     name        : Human-readable category label (e.g. "Electricity", "Fuel",
 *                   "Transportation", "Waste", "Water", "Natural Gas"). These
 *                   names are also used in the frontend dropdowns and charts.
 *     description : Brief text explaining what activities fall under this category.
 *     created_at  : Timestamp when the category was seeded into the database.
 *   Returns HTTP 200 with a JSON array of category objects.
 *
 * WHY IS THIS A SEPARATE CONTROLLER?
 *   Emission categories are reference / master data that rarely change (they are
 *   seeded once by the database migration scripts). Separating them into their
 *   own controller keeps the codebase clean: the emissionController focuses on
 *   user emission records, while this controller serves the lookup table that
 *   powers dropdowns in the create-emission form and the calculator.
 *
 * DATABASE TABLE: emission_categories
 *   Seeded rows: Electricity, Fuel, Natural Gas, Transportation, Waste, Water
 *   (approximately 6 rows — exact count depends on database seed script).
 *
 * AUTH: optionalAuth — accessible to both authenticated and anonymous users.
 * DEPENDENCIES: database (pg pool).
 * ============================================================
 */
const db = require('../config/database');

exports.getAllCategories = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, description, created_at
      FROM emission_categories
      ORDER BY name
    `);
    
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};
