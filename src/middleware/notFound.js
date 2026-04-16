'use strict';

/**
 * @module src/middleware/notFound
 * @description 404 Catch-All Middleware for the Express.js application.
 *
 * This middleware is registered AFTER all defined route handlers but BEFORE the
 * global error handler (`errorHandler.js`) in the middleware pipeline configured
 * in `src/app.js`. When a request reaches this middleware, it means no prior
 * route matched the incoming request method and path combination.
 *
 * Responsibility:
 *   - Creates a standardized HTTP 404 (Not Found) error using the `http-errors`
 *     package.
 *   - Delegates the error to the next middleware in the chain (the centralized
 *     error handler) via `next(error)`.
 *
 * This middleware does NOT:
 *   - Send any response directly (response formatting is handled by errorHandler.js).
 *   - Perform any logging (logging is handled by errorHandler.js).
 *   - Attempt to recover or retry the request.
 *
 * Error Flow:
 *   Unmatched request → notFound → creates 404 error → next(error) → errorHandler
 *
 * @requires http-errors
 * @see {@link module:src/middleware/errorHandler} for error response formatting
 */

const createError = require('http-errors');

/**
 * Express middleware that catches requests which did not match any defined route
 * and generates a 404 Not Found error, forwarding it to the global error handler.
 *
 * @function notFound
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 * @returns {void} Passes a 404 error to the next error-handling middleware.
 *
 * @example
 * // Registered in src/app.js after all route handlers:
 * // const notFound = require('./middleware/notFound');
 * // app.use(notFound);
 */
const notFound = (req, res, next) => {
  next(createError(404, 'The requested resource was not found'));
};

module.exports = notFound;
