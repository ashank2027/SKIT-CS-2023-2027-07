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
