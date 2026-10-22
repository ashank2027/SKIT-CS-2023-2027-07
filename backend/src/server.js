/**
 * ============================================================
 * FILE: src/server.js
 * ROLE: Main Application Entry Point — Express HTTP Server
 * ============================================================
 *
 * This is the central bootstrap file for the EcoInsight backend.
 * It is the first file executed when the server starts (via `node src/server.js`
 * or `npm start`). Its responsibilities are:
 *
 * 1. ENVIRONMENT CONFIGURATION
 *    Loads all environment variables from the `.env` file at the project root
 *    using `dotenv`. Variables such as PORT, DB_HOST, JWT_SECRET, CORS_ORIGIN,
 *    and NODE_ENV are made available throughout the application via process.env.
 *
 * 2. EXPRESS APPLICATION SETUP
 *    Creates and configures the core Express application instance. Two pieces
 *    of global middleware are registered:
 *      - cors()  : Allows cross-origin requests from the frontend. The allowed
 *                  origin is read from `CORS_ORIGIN` env var (defaults to '*').
 *      - express.json() : Parses incoming JSON request bodies so controllers
 *                         can read req.body directly.
 *
 * 3. HEALTH CHECK ENDPOINT  (GET /api/health)
 *    A lightweight endpoint used by load-balancers, deployment pipelines, and
 *    the frontend to verify both the HTTP server and the PostgreSQL database
 *    are alive. It runs `SELECT 1` against the DB pool — if that query succeeds
 *    it returns HTTP 200 with status "success"; if it fails it returns HTTP 500
 *    indicating a DB connection problem. This is intentionally placed before
 *    route mounting so it is reachable even if routes fail to load.
 *
 * 4. ROUTE MOUNTING
 *    All feature routers are imported from ./routes/ and mounted onto the
 *    Express app under their respective URL prefixes:
 *      - /api/auth             → authRoutes       (register, login, logout)
 *      - /api/users            → userRoutes       (get/update own profile)
 *      - /api/categories       → categoryRoutes   (list emission categories)
 *      - /api/emission-factors → factorRoutes     (list emission factors)
 *      - /api/emissions        → emissionRoutes   (CRUD + CSV import)
 *      - /api/calculator       → calculatorRoutes (CO₂e calculator)
 *      - /api/dashboard        → dashboardRoutes  (aggregated dashboard stats)
 *      - /api/analytics        → analyticsRoutes  (multi-dimensional analytics)
 *      - /api/tasks            → taskRoutes       (async task queue management)
 *
 * 5. UNHANDLED ROUTE HANDLER
 *    A catch-all `app.all('*')` handler is registered after all routes. Any
 *    request that does not match a mounted route falls through to this handler,
 *    which creates an AppError with HTTP 404 and passes it to the global error
 *    handler. This prevents Express from silently returning an empty response.
 *
 * 6. GLOBAL ERROR HANDLER
 *    The `errorHandler` middleware (from ./middleware/errorMiddleware) is
 *    registered as the last middleware with Express's 4-argument signature
 *    (err, req, res, next). All errors thrown or passed via next(err) anywhere
 *    in the application ultimately land here for consistent JSON error responses.
 *
 * 7. SERVER START
 *    The Express app begins listening on `process.env.PORT` (default 5000).
 *    A startup message is printed to the console indicating the port and the
 *    current NODE_ENV (development / production / test).
 *
 * DEPENDENCIES: express, cors, dotenv, and all route/middleware modules.
 * ============================================================
 */
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
const taskRoutes = require('./routes/taskRoutes');

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
app.use('/api/tasks', taskRoutes);

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
