const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ecoinsight_jwt_secret_dev_2026_skit_cs_07', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // Remove password from output
  user.password_hash = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    user
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, industry, location, organization } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email and password', 400));
    }

    // Check if email exists
    const emailCheck = await db.query('SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) AS exists', [email]);
    if (emailCheck.rows[0].exists) {
      return next(new AppError('Email already exists', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUserQuery = `
      INSERT INTO users (name, email, password_hash, industry, location, organization)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, industry, location, organization, created_at, updated_at
    `;
    const values = [name, email, passwordHash, industry, location, organization];
    const result = await db.query(newUserQuery, values);
    
    createSendToken(result.rows[0], 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ status: 'success' });
};
