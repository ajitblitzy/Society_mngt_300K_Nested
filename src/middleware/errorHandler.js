/**
 * Global Error Handling Middleware
 *
 * Centralised error handler for the Express.js application. This middleware
 * MUST be the LAST middleware registered via `app.use()` in `src/app.js`.
 *
 * Responsibilities:
 *   1. Catch ALL errors propagated via `next(err)` from route handlers,
 *      the 404 notFound middleware, and Express 5.x automatic Promise
 *      rejection forwarding.
 *   2. Log every error through the Winston logger with contextual request
 *      information (status code, URL, HTTP method, client IP).
 *   3. Log full stack traces for server-level errors (statusCode >= 500).
 *   4. Sanitise error messages in production to prevent leaking internal
 *      implementation details to clients.
 *   5. Return a standardised JSON error response:
 *      { status: 'error', statusCode: <number>, message: <string> }
 *
 * Error flow:
 *   Error occurs → propagated via next(err) → errorHandler logs via Winston
 *   → sends JSON response → request cycle ends (next is NOT called).
 *
 * @module middleware/errorHandler
 */

'use strict';

// ---------------------------------------------------------------------------
// Internal dependency — Winston logger singleton for structured error logging.
// Provides logger.error() to record caught errors with contextual metadata.
// ---------------------------------------------------------------------------
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Internal dependency — Centralized environment configuration.
// Provides config.nodeEnv for environment-aware error message sanitization.
// All environment variable access is routed through this module — NEVER
// read process.env directly in application code.
// ---------------------------------------------------------------------------
const config = require('../config');

// ---------------------------------------------------------------------------
// Error Handler Middleware
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware.
 *
 * CRITICAL: The 4-argument signature `(err, req, res, next)` is mandatory —
 * Express uses the parameter count to distinguish error-handling middleware
 * from regular middleware. All four parameters MUST be present even though
 * `next` is intentionally unused (this is the terminal handler).
 *
 * @param {Error}    err  - The error object propagated via `next(err)`.
 *                          May originate from http-errors (has `.status`),
 *                          native Error objects, or custom error classes.
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next callback
 *                          (intentionally unused — this is the terminal handler).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ------------------------------------------------------------------
  // Step 1 — Extract HTTP status code from the error object.
  //
  // The `http-errors` package (used by notFound.js) sets `err.status`.
  // Some libraries or custom errors may use `err.statusCode` instead.
  // Default to 500 (Internal Server Error) when neither is available.
  // ------------------------------------------------------------------
  const statusCode = err.status || err.statusCode || 500;

  // ------------------------------------------------------------------
  // Step 2 — Determine the client-facing error message.
  //
  // In production, ALL server errors (5xx status codes) MUST NOT expose
  // internal details — replace with a generic message to protect against
  // information disclosure vulnerabilities. This covers 500, 502, 503,
  // and any other server-class errors that may be introduced in future.
  //
  // In non-production environments, the original error message is
  // preserved for developer debugging convenience.
  // ------------------------------------------------------------------
  const message =
    config.nodeEnv === 'production' && statusCode >= 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  // ------------------------------------------------------------------
  // Step 3 — Log the error via Winston with request context.
  //
  // Every error is logged with: status code, error message, the
  // original request URL, HTTP method, and the client IP address.
  // This provides full traceability for debugging and monitoring.
  // ------------------------------------------------------------------
  logger.error(
    `${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  // For server-level errors (5xx), log the full stack trace so that
  // engineers can pinpoint the root cause in log files / aggregators.
  if (statusCode >= 500 && err.stack) {
    logger.error(err.stack);
  }

  // ------------------------------------------------------------------
  // Step 4 — Send standardised JSON error response.
  //
  // Response format is consistent across ALL error scenarios:
  // { status: 'error', statusCode: <number>, message: <string> }
  //
  // This predictable structure allows API consumers to implement
  // uniform error-handling logic on the client side.
  // ------------------------------------------------------------------
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });

  // ------------------------------------------------------------------
  // Step 5 — Do NOT call next().
  //
  // This is the terminal error handler. Calling next(err) here would
  // hand the error to Express's built-in default error handler, which
  // returns HTML — that is undesirable for a JSON API.
  // ------------------------------------------------------------------
};

// ---------------------------------------------------------------------------
// Module export — the error handler function is exported directly (not
// wrapped in an object) so it can be registered as: app.use(errorHandler)
// ---------------------------------------------------------------------------
module.exports = errorHandler;
