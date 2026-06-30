// requestLogger.js - per-request logging middleware (CommonJS).
'use strict';

/**
 * src/middleware/requestLogger.js
 *
 * Per-request HTTP logging middleware for the Society Management backend
 * (Login + Reporting feature). For every request that passes through it, the
 * middleware emits exactly one structured log line once the response has been
 * fully sent, capturing:
 *
 *   - the HTTP method (e.g. GET, POST),
 *   - the requested URL,
 *   - the final HTTP response status code, and
 *   - the wall-clock duration of the request in milliseconds.
 *
 * It is a cross-cutting concern registered in `src/app.js` BEFORE the feature
 * routers, so it observes every inbound request:
 *
 *   const requestLogger = require('./middleware/requestLogger');
 *   app.use(requestLogger);            // installed before app.use('/api/...')
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DESIGN CONSTRAINTS (per Technical Specification / Agent Action Plan):
 *  - ADDITIVE ONLY: this module is net-new and does NOT modify, import, or copy
 *    logic from any of the repository's pre-existing synthetic placeholder
 *    modules (AAP §0.6.2, acceptance criteria C1/C2). Those modules export
 *    nothing, so there is no existing wiring to integrate with here.
 *  - CommonJS: the public API is exposed via `module.exports`. No ESM syntax.
 *  - SINGLE DEPENDENCY: the only module required is the project logging helper
 *    at `../utils/logger` (AAP §0.4.1 — cross-cutting middleware).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SECURITY (AAP §0.8 / acceptance criterion C6): this middleware logs ONLY the
 * request method, URL path, response status code, and duration. It NEVER logs
 * request bodies, request/response headers (in particular the `Authorization`
 * header), query-string parameters (which can carry tokens), JWTs, passwords,
 * password hashes, or any other secret. The query string is deliberately
 * stripped from the URL before logging. Keeping the logged surface to this
 * fixed, non-sensitive set is what guarantees the feature does not leak
 * credentials through the application logs.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * IMPLEMENTATION NOTES:
 *  - The duration is measured from the moment the middleware runs until the
 *    response's `finish` event. `finish` fires after the last segment of the
 *    response has been handed off to the operating system, so at that point
 *    `res.statusCode` is final and the elapsed time reflects the full
 *    request/response lifecycle.
 *  - A one-shot listener (`res.once('finish', ...)`) is used so that exactly
 *    one log line is produced per response and the listener is automatically
 *    removed afterwards (no listener accumulation / leak).
 *  - `next()` is invoked synchronously and exactly once. No asynchronous work
 *    is performed before `next()`, so the middleware adds negligible latency to
 *    the request path and never blocks the chain on logging.
 */

// The project's minimal logging helper — exposes { info, warn, error, debug }
// and prefixes every line with an ISO-8601 timestamp and an uppercase level.
// This is the ONLY dependency of this middleware (AAP whitelist).
const logger = require('../utils/logger');

/**
 * Express middleware that logs a concise, single-line summary of each request
 * after its response has completed.
 *
 * The standard Express middleware signature `(req, res, next)` is preserved so
 * the function can be passed directly to `app.use(...)`.
 *
 * @param {import('express').Request} req  - The incoming HTTP request.
 * @param {import('express').Response} res - The outgoing HTTP response.
 * @param {import('express').NextFunction} next - Callback that passes control
 *        to the next middleware/route handler.
 * @returns {void}
 */
function requestLogger(req, res, next) {
  // Capture the start time up front so the measured duration includes the work
  // performed by every downstream middleware and the route handler itself.
  const start = Date.now();

  // Defer logging until the response is fully sent. `finish` guarantees the
  // status code is final; `once` ensures a single emission and self-cleanup.
  res.once('finish', () => {
    const durationMs = Date.now() - start;

    // Resolve the request URL. `req.originalUrl` preserves the URL exactly as
    // received (Express may rewrite `req.url` when routers are mounted); fall
    // back to `req.url` when `originalUrl` is unavailable (e.g. outside an
    // Express Router context).
    const rawUrl = req.originalUrl || req.url || '';

    // SECURITY (C6): strip the query string before logging. Query parameters
    // can carry sensitive values (for example `?token=...`), and the logging
    // contract forbids writing secrets to the logs — so only the URL *path* is
    // recorded. Bodies, headers (e.g. Authorization), tokens, and passwords are
    // likewise never logged.
    const queryStart = rawUrl.indexOf('?');
    const urlPath = queryStart === -1 ? rawUrl : rawUrl.slice(0, queryStart);

    // Emit a single concise access-log line: method, URL path, final status
    // code, and duration in milliseconds. The ISO-8601 timestamp and level
    // prefix are supplied by the logger itself.
    logger.info(`${req.method} ${urlPath} ${res.statusCode} ${durationMs}ms`);
  });

  // Continue the middleware/route chain immediately — do not block on logging.
  next();
}

module.exports = requestLogger;
