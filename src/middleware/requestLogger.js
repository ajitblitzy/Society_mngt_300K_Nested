// requestLogger.js - per-request access-logging middleware (CommonJS).
//
// MIDDLEWARE LAYER (cross-cutting, request-entry): this module emits exactly ONE
// concise log line per HTTP request for the new Login + Reporting feature. It is
// registered EARLY in src/app.js - via `app.use(requestLogger)`, BEFORE both
// feature routers (`/api/auth`, `/api/reports`) and before the terminal
// errorHandler - so every request that enters the application is observed, whether
// it ultimately succeeds, is rejected (e.g. 401 from authMiddleware), or fails.
//
// WHAT IS LOGGED (stable, greppable shape): a single line of the form
//   <METHOD> <URL> <STATUS> <DURATION>ms      e.g.  `GET /api/reports/dues 200 4ms`
// The status code and duration are only meaningful once the response is complete,
// so the line is emitted from the response 'finish' event (fired after the headers
// and body have been sent). At that point `res.statusCode` is final and the elapsed
// time since request entry is the full server-side handling duration.
//
// NON-BLOCKING BY DESIGN: the middleware does NO asynchronous work on the request
// path. It records a start timestamp, registers a one-shot 'finish' listener, and
// immediately calls `next()` so the request proceeds through the rest of the
// middleware/route chain without waiting on logging. The single log line is written
// later, when the response finishes.
//
// SECURITY (AAP 0.8 / criterion C6 - NEVER log secrets): this logger records ONLY
// the request method, the request URL, the final response status code, and the
// handling duration. It NEVER logs request bodies, request headers (in particular
// the `Authorization` header), JWTs/tokens, passwords, or password hashes. Auth
// credentials in this API travel in the `Authorization: Bearer` header (never in
// the URL), so they are not exposed by logging the URL here. Avoiding sensitive
// material is enforced at this single call site by simply not reading those fields.
//
// MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM
// `import`/`export`. The sole dependency is the project's dependency-free logger.
// The pre-existing scaffold modules are read-only and export nothing; they are
// neither referenced nor imported here (strictly additive change set - AAP 0.6.2,
// criteria C1/C2).

'use strict';

// Sole dependency: the project's dependency-free logging helper. It exposes
// `.info` / `.warn` / `.error` / `.debug`, each stamping an ISO-8601 UTC timestamp
// and an uppercase level label. We use `logger.info(...)` for the per-request line;
// the timestamp/level prefix on each emitted line is supplied by the logger itself.
const logger = require('../utils/logger');

// Fallback tokens used only when a (malformed or absent) request object does not
// carry the expected fields. The logger must never throw on the request path, so
// every field read below is defensive; these constants keep the emitted line
// well-formed even in those edge cases.
const UNKNOWN_METHOD = 'UNKNOWN';
const UNKNOWN_URL = 'unknown';

/**
 * Derive the non-sensitive "<METHOD> <URL>" prefix for the access-log line.
 *
 * Only the HTTP method and the request URL are read - never headers, bodies,
 * cookies, or credentials. `req.originalUrl` is preferred because Express preserves
 * the full, mount-aware request target on it (it remains correct even inside a
 * mounted router where `req.url` has been rewritten); `req.url` is used as a
 * fallback, and a literal placeholder is the last resort. Access is fully
 * defensive so a malformed or absent `req` can never make the middleware throw.
 *
 * @param {object} [req] - The Express request object (defensively optional).
 * @returns {string} A compact, secret-free label, e.g. `GET /api/reports/dues`.
 */
function describeRequest(req) {
  const method = (req && req.method) || UNKNOWN_METHOD;
  const url = (req && (req.originalUrl || req.url)) || UNKNOWN_URL;
  return `${method} ${url}`;
}

/**
 * Per-request access-logging middleware.
 *
 * Registered EARLY in `src/app.js` (`app.use(requestLogger)`), ahead of the feature
 * routers and the terminal error handler, so it observes every inbound request. It
 * performs three steps:
 *   1. Capture a high-level start timestamp at request entry.
 *   2. Register a one-shot `'finish'` listener on the response; when the response
 *      completes, emit exactly one line - method, URL, final status, and elapsed
 *      duration - via {@link logger.info}.
 *   3. Call `next()` synchronously so the request continues down the chain without
 *      blocking on logging.
 *
 * The 3-argument signature `(req, res, next)` is the standard Express middleware
 * shape and is REQUIRED by the consumer (`app.use(requestLogger)`); `next` is always
 * invoked exactly once. The `'finish'` event (rather than, say, `'close'`) is used
 * because it fires precisely when the response has been fully sent, guaranteeing
 * that `res.statusCode` reflects the final status and that the measured duration
 * covers the complete server-side handling of the request.
 *
 * @param {object} req - The Express request (read for method and URL only).
 * @param {object} res - The Express response (an EventEmitter); we listen for
 *                        its `'finish'` event and read its final `statusCode`.
 * @param {Function} next - Express continuation callback; invoked once, synchronously.
 * @returns {void}
 */
function requestLogger(req, res, next) {
  // Phase 1 - record request-entry time. `Date.now()` (epoch milliseconds) is
  // sufficient for a coarse per-request duration and avoids any extra dependency.
  const start = Date.now();

  // Phase 2 - register a one-shot listener that emits the access line once the
  // response is fully sent. Guarded with a typeof check so that even a non-standard
  // response object (one lacking `.on`) cannot make this middleware throw on the
  // request path; in normal Express usage `res` is always an EventEmitter.
  if (res && typeof res.on === 'function') {
    res.on('finish', () => {
      // The response is complete here: `res.statusCode` is final and the elapsed
      // time is the full server-side handling duration. Every value below is read
      // defensively (`describeRequest` never throws), so the listener cannot
      // disturb the already-sent response lifecycle.
      const durationMs = Date.now() - start;
      const status = res.statusCode;
      // Single, concise, secret-free line: "<METHOD> <URL> <STATUS> <DURATION>ms".
      // Logged exclusively via `logger.info` - method, URL, status, and duration
      // only; no bodies, headers, tokens, or passwords ever reach the log.
      logger.info(`${describeRequest(req)} ${status} ${durationMs}ms`);
    });
  }

  // Phase 3 - continue the middleware/route chain immediately. Logging happens
  // later (on 'finish'); the request path itself does no asynchronous work.
  next();
}

// Single DEFAULT export: src/app.js consumes this as
//   const requestLogger = require('./middleware/requestLogger');
//   app.use(requestLogger); // registered BEFORE the routers
module.exports = requestLogger;
