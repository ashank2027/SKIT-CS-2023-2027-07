/**
 * ============================================================
 * FILE: src/middleware/errorMiddleware.js
 * ROLE: Global Express Error Handler Middleware
 * ============================================================
 *
 * This file exports the single, centralised error-handling middleware for the
 * entire EcoInsight backend. It is registered as the LAST middleware in
 * server.js (after all routes) using the standard Express 4-argument signature:
 *   app.use(errorHandler);   // (err, req, res, next)
 *
 * Any time a controller or middleware calls next(err), or throws an error
 * inside an async function that is caught by a try/catch wrapper, the error
 * lands here. This ensures every API error returns a consistent JSON response
 * regardless of where in the codebase it was generated.
 *
 * ──────────────────────────────────────────────────────────────
 * BEHAVIOR IN DEVELOPMENT  (NODE_ENV === 'development')
 * ──────────────────────────────────────────────────────────────
 *   In development mode the middleware sends the full error object back to
 *   the client, including:
 *     - status       : 'fail' (4xx) or 'error' (5xx)
 *     - error        : the full error object (all its properties)
 *     - message      : the human-readable error message
 *     - stack        : the full stack trace
 *   This verbose output is intentional so developers can debug quickly
 *   without needing to look at server logs.
 *
 * ──────────────────────────────────────────────────────────────
 * BEHAVIOR IN PRODUCTION  (NODE_ENV !== 'development')
 * ──────────────────────────────────────────────────────────────
 *   The middleware distinguishes two categories of errors:
 *
 *   A) Operational Errors (err.isOperational === true):
 *      These are AppError instances created deliberately by controllers to
 *      signal known bad conditions (e.g. "User not found", "Invalid token",
 *      "Missing required fields"). Because we know exactly what went wrong
 *      and it is safe to tell the user, the full message is returned:
 *        { "status": "fail",  "message": "..." }   (for 4xx)
 *        { "status": "error", "message": "..." }   (for 5xx AppErrors)
 *
 *   B) Non-Operational / Programming Errors (err.isOperational is falsy):
 *      These are unexpected errors such as: uncaught exceptions, DB driver
 *      crashes, null pointer dereferences, etc. Leaking their details to
 *      the client would expose internal implementation. Instead, the error
 *      is logged to stderr (console.error) for server-side investigation
 *      and a generic safe message is returned:
 *        { "status": "error", "message": "Something went very wrong!" }
 *        (HTTP 500)
 *
 * DEFAULT STATUS CODE:
 *   If the error somehow reaches here without a statusCode (e.g. a raw
 *   `new Error()` thrown without AppError), it defaults to 500. Similarly
 *   status defaults to 'error'.
 *
 * DEPENDENCIES: AppError (imported but used implicitly via isOperational flag).
 * ============================================================
 */
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  }
};

module.exports = errorHandler;
