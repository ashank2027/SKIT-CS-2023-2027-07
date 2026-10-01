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
