const db = require('../config/database');
const AppError = require('../utils/AppError');

// Helper function to find emission factor and calculate CO2e
const calculateCO2e = async (categoryName, activity, quantity, unit) => {
  // 1. Get category ID
  const catRes = await db.query('SELECT id FROM emission_categories WHERE name = $1', [categoryName]);
  if (catRes.rows.length === 0) {
    throw new AppError(`Category '${categoryName}' not found`, 404);
  }
  const categoryId = catRes.rows[0].id;

  // 2. Try to find exact factor
  let factorRes = await db.query(
    'SELECT factor FROM emission_factors WHERE category_id = $1 AND activity ILIKE $2 AND unit ILIKE $3 LIMIT 1',
    [categoryId, `%${activity}%`, unit]
  );

  // 3. Fallback: just match category and unit
  if (factorRes.rows.length === 0) {
    factorRes = await db.query(
      'SELECT factor FROM emission_factors WHERE category_id = $1 AND unit ILIKE $2 LIMIT 1',
      [categoryId, unit]
    );
  }
  
  // 4. Ultimate fallback: generic factor for category if unit doesn't match perfectly
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

exports.createEmission = async (req, res, next) => {
  try {
    const { category, activity, quantity, unit, location, date } = req.body;

    if (!category || !activity || !quantity || !unit || !date) {
      return next(new AppError('Please provide all required fields', 400));
    }

    const { categoryId, factor, co2e } = await calculateCO2e(category, activity, quantity, unit);

    const query = `
      INSERT INTO emission_records
      (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [req.user.id, categoryId, activity, quantity, unit, factor, co2e, location, date];
    
    const result = await db.query(query, values);
    
    // Fetch with category name for frontend
    const newRecordRes = await db.query(`
      SELECT er.*, ec.name AS category
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newRecordRes.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getEmissions = async (req, res, next) => {
  try {
    const { category, location, from, to, limit, offset } = req.query;
    
    let query = `
      SELECT er.*, ec.name AS category
      FROM emission_records er
      JOIN emission_categories ec ON er.category_id = ec.id
      WHERE er.user_id = $1
    `;
    const values = [req.user.id];
    let paramCount = 1;

    if (category) {
      paramCount++;
      query += ` AND ec.name = $${paramCount}`;
      values.push(category);
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

    query += ` ORDER BY er.date DESC, er.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit || 50);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset || 0);

    const result = await db.query(query, values);

    // Also get total count for pagination if needed
    const countQuery = `SELECT COUNT(*) FROM emission_records WHERE user_id = $1`;
    const countResult = await db.query(countQuery, [req.user.id]);

    res.status(200).json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmission = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT er.*, ec.name AS category
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
    const { category, activity, quantity, unit, location, date } = req.body;

    // Check if record exists and belongs to user
    const checkRes = await db.query('SELECT * FROM emission_records WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkRes.rows.length === 0) {
      return next(new AppError('Emission record not found', 404));
    }
    
    const existing = checkRes.rows[0];

    // If factors that affect calculation change, recalculate
    let categoryId = existing.category_id;
    let factor = existing.emission_factor;
    let co2e = existing.co2e;

    if (category || activity || quantity || unit) {
      const cat = category || 'Electricity'; // We should query the existing category name if not provided, but frontend usually sends full form
      
      let catName = category;
      if (!catName) {
         const cRes = await db.query('SELECT name FROM emission_categories WHERE id = $1', [categoryId]);
         catName = cRes.rows[0].name;
      }
      
      const calcResult = await calculateCO2e(
        catName, 
        activity || existing.activity, 
        quantity || existing.quantity, 
        unit || existing.unit
      );
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
      activity || existing.activity, 
      quantity || existing.quantity, 
      unit || existing.unit, 
      factor, 
      co2e, 
      location !== undefined ? location : existing.location, 
      date || existing.date
    ];

    const result = await db.query(query, values);

    // Fetch with category name for frontend
    const updatedRecordRes = await db.query(`
      SELECT er.*, ec.name AS category
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
    const result = await db.query('DELETE FROM emission_records WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('Emission record not found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
