const db = require('../config/database');

exports.getAllFactors = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT ef.*, ec.name AS category_name
      FROM emission_factors ef
      JOIN emission_categories ec ON ef.category_id = ec.id
      ORDER BY ec.name, ef.activity
    `);
    
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};
