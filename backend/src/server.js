require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const factorRoutes = require('./routes/factorRoutes');
const emissionRoutes = require('./routes/emissionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const calculatorRoutes = require('./routes/calculatorRoutes');

// Middleware
const errorHandler = require('./middleware/errorMiddleware');
const AppError = require('./utils/AppError');
const db = require('./config/database');

const app = express();

// Middleware config
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1'); // Check DB connection
    res.status(200).json({ status: 'success', message: 'API is running and DB is connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'API is running but DB connection failed' });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/emission-factors', factorRoutes);
app.use('/api/emissions', emissionRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Unhandled Route Handler
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EcoInsight Backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
