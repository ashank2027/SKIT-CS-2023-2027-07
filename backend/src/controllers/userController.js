const db = require('../config/database');
const AppError = require('../utils/AppError');

exports.getMe = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, industry, location, organization, created_at, updated_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, industry, location, organization } = req.body;

    const query = `
      UPDATE users
      SET name = COALESCE($2, name),
          industry = COALESCE($3, industry),
          location = COALESCE($4, location),
          organization = COALESCE($5, organization),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, industry, location, organization, created_at, updated_at
    `;
    
    const values = [req.user.id, name, industry, location, organization];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
