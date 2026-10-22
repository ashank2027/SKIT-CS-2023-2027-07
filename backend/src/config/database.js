/**
 * ============================================================
 * FILE: src/config/database.js
 * ROLE: PostgreSQL Connection Pool & Query Helpers
 * ============================================================
 *
 * This file is the single source of truth for all database connectivity
 * in the EcoInsight backend. Every controller that needs to talk to
 * PostgreSQL imports this module — it is never instantiated more than once
 * because Node.js caches require() calls, so the same pool object is
 * shared across the entire application.
 *
 * WHY A POOL?
 *   Establishing a new TCP connection to PostgreSQL for every HTTP request
 *   would be extremely slow. A connection pool maintains a set of pre-opened
 *   connections (up to `max: 20`) and reuses them across requests. This
 *   dramatically lowers latency and resource consumption under concurrent load.
 *
 * POOL CONFIGURATION (read from environment variables, with safe defaults):
 *   - DB_HOST     : Hostname/IP of the PostgreSQL server (default: 'localhost').
 *   - DB_PORT     : Port of the PostgreSQL server (default: 5432).
 *   - DB_NAME     : Name of the target database (default: 'ecoinsight').
 *   - DB_USER     : PostgreSQL login role (default: 'postgres').
 *   - DB_PASSWORD : Password for the login role (default: 'postgres').
 *   - max         : Maximum number of concurrent client connections in the pool
 *                   (hardcoded to 20 — enough for typical REST workloads).
 *   - idleTimeoutMillis : A pooled connection that sits idle for 30 seconds is
 *                         automatically closed and removed from the pool to
 *                         free server-side resources.
 *   - connectionTimeoutMillis : If a new client cannot be acquired within
 *                               5 seconds an error is thrown instead of waiting
 *                               indefinitely, which prevents request pile-up.
 *
 * ERROR HANDLING:
 *   The pool emits an 'error' event when a background (idle) client encounters
 *   an unexpected error (e.g. the DB server closed the connection). The listener
 *   logs the error to stderr. Without this listener Node.js would throw an
 *   uncaught exception and crash the process.
 *
 * EXPORTED HELPERS:
 *
 *   pool  — The raw pg.Pool instance. Rarely needed directly; prefer `query`.
 *
 *   query(text, params) — Convenience wrapper around pool.query(). Accepts a
 *                         parameterised SQL string with $1, $2… placeholders and
 *                         an array of values. Returns a Promise that resolves to
 *                         a pg.QueryResult whose `.rows` property contains the
 *                         returned data. Used by all controllers for SELECT,
 *                         INSERT, UPDATE, and DELETE operations.
 *
 *   getClient()        — Checks out a single client from the pool for use in
 *                         multi-statement transactions (BEGIN / COMMIT / ROLLBACK).
 *                         The caller MUST call client.release() after the
 *                         transaction completes to return the client to the pool.
 *                         Currently used for any complex atomic operations that
 *                         need to span multiple SQL statements.
 *
 * USAGE PATTERN IN CONTROLLERS:
 *   const db = require('../config/database');
 *   const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 *   const rows = result.rows;  // Array of plain JS objects
 *
 * DEPENDENCIES: pg (node-postgres), dotenv (loaded by server.js before import).
 * ============================================================
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'ecoinsight',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a parameterised query.
 * @param {string} text  SQL query text with $1, $2… placeholders.
 * @param {Array}  params Values for placeholders.
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a single client from the pool (for transactions).
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
