const db = require('../config/database');
const AppError = require('../utils/AppError');

const calculateCO2e = async (categoryName, activity, quantity, unit) => {
  const catRes = await db.query('SELECT id FROM emission_categories WHERE name = $1', [categoryName]);
  if (catRes.rows.length === 0) {
    throw new AppError(`Category '${categoryName}' not found`, 404);
  }
  const categoryId = catRes.rows[0].id;

  let factorRes = await db.query(
    'SELECT factor FROM emission_factors WHERE category_id = $1 AND activity ILIKE $2 AND unit ILIKE $3 LIMIT 1',
    [categoryId, `%${activity}%`, unit]
  );

  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor FROM emission_factors WHERE category_id = $1 AND unit ILIKE $2 LIMIT 1',
      [categoryId, unit]
    );
  }
  
  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor FROM emission_factors WHERE category_id = $1 LIMIT 1',
      [categoryId]
    );
  }

  if (factorRes.rows.length === 0) {
    throw new AppError(`No emission factor found for category '${categoryName}'`, 404);
  }

  const factor = factorRes.rows[0].factor;
  const co2e = parseFloat(quantity) * parseFloat(factor);

  return { categoryId, factor, co2e };
};

exports.calculate = async (req, res, next) => {
  try {
    const { category, activity, quantity, unit, save, date, location } = req.body;

    if (!category || !activity || quantity === undefined || !unit) {
      return next(new AppError('Please provide category, activity, quantity, and unit', 400));
    }

    const { categoryId, factor, co2e } = await calculateCO2e(category, activity, quantity, unit);
    
    let savedRecord = null;
    if (save) {
      const recordDate = date || new Date().toISOString();
      const query = `
        INSERT INTO emission_records
        (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [req.user.id, categoryId, activity, quantity, unit, factor, co2e, location || null, recordDate];
      const result = await db.query(query, values);
      savedRecord = result.rows[0];
    }

    res.status(200).json({
      status: 'success',
      data: {
        co2e,
        factor,
        savedRecord
      }
    });
  } catch (err) {
    next(err);
  }
};
