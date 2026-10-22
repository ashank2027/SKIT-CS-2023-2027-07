/**
 * ============================================================
 * FILE: src/utils/AppError.js
 * ROLE: Custom Operational Error Class
 * ============================================================
 *
 * AppError is the standard error object used everywhere in the EcoInsight
 * backend to represent expected, operational errors — things that are wrong
 * with the client request or the current application state, but are NOT
 * programming bugs (e.g. "email already exists", "record not found",
 * "invalid token", "missing required fields").
 *
 * WHY EXTEND THE BUILT-IN Error CLASS?
 *   By extending Error we ensure AppError instances:
 *     - Can be thrown with `throw new AppError(...)` and caught normally.
 *     - Are recognised by Express's 4-argument error-handling middleware
 *       (err, req, res, next) without any special detection logic.
 *     - Carry a proper stack trace pointing to the call site where the error
 *       was created (via Error.captureStackTrace).
 *
 * CONSTRUCTOR PARAMETERS:
 *   @param {string} message    Human-readable description of what went wrong.
 *                              This is the string sent back to the API client
 *                              in the JSON response body as { message: "..." }.
 *   @param {number} statusCode HTTP status code to use in the response.
 *                              e.g. 400 (Bad Request), 401 (Unauthorised),
 *                              403 (Forbidden), 404 (Not Found), 409 (Conflict).
 *
 * INSTANCE PROPERTIES SET BY THE CONSTRUCTOR:
 *   - this.statusCode    : The HTTP status code passed in (e.g. 404).
 *   - this.status        : Derived string — 'fail' for 4xx codes (client errors)
 *                          or 'error' for 5xx codes (server errors). Mirrors the
 *                          JSend / standard API convention used by this project.
 *   - this.isOperational : Always set to `true`. The global error handler in
 *                          errorMiddleware.js checks this flag to decide whether
 *                          to send the full error message to the client (safe —
 *                          it is an operational error we created intentionally)
 *                          or to hide the details (unsafe — unknown programming
 *                          error, e.g. a DB driver crash). Only AppError instances
 *                          have isOperational = true; all other errors do not.
 *
 * USAGE IN CONTROLLERS:
 *   Import AppError and pass a new instance to `next()`:
 *     const AppError = require('../utils/AppError');
 *     return next(new AppError('User not found', 404));
 *   The global error handler then picks it up and sends:
 *     { "status": "fail", "message": "User not found" }  (HTTP 404)
 *
 * USAGE IN MIDDLEWARE:
 *   The catch-all route handler in server.js also uses AppError:
 *     next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
 *
 * DEPENDENCIES: None (only the Node.js built-in Error class).
 * ============================================================
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
