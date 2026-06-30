// errorHandler.js - centralized Express error-handling middleware (CommonJS).
'use strict';

/**
 * src/middleware/errorHandler.js
 *
 * Centralized Express error-handling middleware for the Society Management API
 * (Login + Reporting feature). It is the SINGLE place where errors that are
 * thrown by, or forwarded (`next(err)`) from, route handlers and other
 * middleware are converted into a consistent JSON envelope and returned to the
 * client.
 *
 * It is registered LAST in `src/app.js`, after every router and other
 * middleware. The composition root loads this module with Node's standard
 * module loader and mounts it as the final middleware, e.g.:
 *
 *     // const errorHandler = ...('./middleware/errorHandler');
 *     // ...mount routers and other middleware first...
 *     app.use(errorHandler); // MUST be the final `app.use(...)` call
 *
 * ── Express error-handler signature (critical) ────────────────────────────
 * Express recognises error-handling middleware *specifically* by its function
 * ARITY of four — `(err, req, res, next)`. The `next` parameter MUST therefore
 * be present in the signature even though it is only used to delegate to the
 * framework's default handler. If `next` were omitted, Express would treat this
 * as ordinary request-handling middleware and never route errors to it.
 *
 * Express 5.x additionally forwards rejected promises returned by `async` route
 * handlers to this middleware automatically, so individual handlers do not need
 * their own try/catch blocks to surface errors here.
 *
 * ── Response envelope (consistent across the API) ─────────────────────────
 * Every error response uses the same shape, matching `authMiddleware.js`:
 *
 *     { "error": { "message": <string>, "status": <number> } }
 *
 * ── Security (AAP §0.8 / acceptance criterion C6) ─────────────────────────
 *  - Server faults (HTTP 5xx) return a GENERIC message ('Internal Server
 *    Error') so internal details and stack traces never leak to the client.
 *  - Client errors (HTTP 4xx) surface the error's own `message`, because that
 *    text is intended to guide the caller (e.g. validation feedback).
 *  - Server-side logging is performed exclusively through `utils/logger` and is
 *    limited to the request method, URL PATH (the query string is stripped, since
 *    it can carry tokens/secrets), derived status, and an error detail (stack for
 *    5xx, message for 4xx). Request bodies, the `Authorization` header, tokens,
 *    query strings and passwords are NEVER logged.
 *
 * MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM syntax.
 * DEPENDENCIES: `../utils/logger` is the ONLY dependency of this module.
 */

const logger = require('../utils/logger');

/**
 * Centralized Express error handler.
 *
 * @param {Error & {status?: number, statusCode?: number}} err - The error that
 *        was thrown or forwarded via `next(err)`. May carry an explicit HTTP
 *        `status` or `statusCode`; the handler defaults to `500` when neither
 *        is present (or when `err` itself is null/undefined).
 * @param {express.Request} req - The incoming request. Used only for log context
 *        (`method` and the URL PATH, with any query string stripped); its body
 *        and headers are never read here.
 * @param {express.Response} res - The outgoing response that carries
 *        the error envelope back to the client.
 * @param {express.NextFunction} next - Express continuation callback.
 *        Required so Express recognises this function as an error handler
 *        (arity === 4). It is only invoked to delegate to Express's built-in
 *        handler once the response headers have already been sent.
 * @returns {void}
 */
// The 4-argument signature is REQUIRED so Express treats this as an error
// handler; `next` is intentionally part of the signature even when unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Phase 1 — Derive the HTTP status code, defaulting to 500. The leading
  // `err &&` guard ensures the handler can never itself throw when invoked with
  // a null/undefined error.
  const status = (err && (err.status || err.statusCode)) || 500;

  // Phase 2 — Log the failure server-side with useful request context but
  // WITHOUT any sensitive data. Only the method, URL PATH and derived status are
  // recorded, alongside a diagnostic detail derived from the error.
  //
  // SECURITY (C6): the query string is STRIPPED from the logged URL — exactly as
  // `requestLogger.js` does — because query parameters can carry secrets (for
  // example `?token=...` or `?password=...`). Only the path before any `?` is
  // logged. Request bodies, the Authorization header, tokens and passwords are
  // likewise deliberately never referenced here.
  const method = (req && req.method) || 'UNKNOWN';
  const rawUrl = (req && (req.originalUrl || req.url)) || 'unknown';
  const queryStart = rawUrl.indexOf('?');
  const urlPath = queryStart === -1 ? rawUrl : rawUrl.slice(0, queryStart);

  // Tier the diagnostic detail by severity: a full stack trace is reserved for
  // server faults (5xx), where it aids triage; client errors (4xx) log only the
  // concise message (no stack noise). When neither is available, the raw error
  // value is used as a last resort.
  let detail;
  if (status >= 500 && err && err.stack) {
    detail = err.stack;
  } else if (err && err.message) {
    detail = err.message;
  } else {
    detail = err;
  }

  logger.error(`${method} ${urlPath} -> ${status}`, detail);

  // Phase 3 — If the response has already begun streaming, we cannot set a new
  // status or body. Delegate to Express's default (finalhandler) error handler,
  // which will terminate the connection appropriately.
  if (res.headersSent) {
    return next(err);
  }

  // Choose a client-safe message: a generic label for server faults (5xx) so
  // internals are never leaked, and the error's own message for client errors
  // (4xx), falling back to a generic 'Error' when none is provided.
  const message = status >= 500 ? 'Internal Server Error' : (err && err.message) || 'Error';

  // Respond with the consistent envelope shape used across the entire API.
  return res.status(status).json({ error: { message, status } });
}

module.exports = errorHandler;
