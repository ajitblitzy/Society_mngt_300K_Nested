// errorHandler.js - centralized Express error-handling middleware (CommonJS).
//
// MIDDLEWARE LAYER (terminal error boundary): this module is the single, final
// stop for every error that surfaces while serving the new Login + Reporting
// feature. It is registered LAST in src/app.js - after the body parser, the
// request logger, and BOTH feature routers (`/api/auth`, `/api/reports`) - so any
// error thrown synchronously by a handler, or forwarded via `next(err)`, or
// produced by a rejected async handler promise (Express 5 auto-forwards those),
// lands here and is converted into ONE consistent JSON envelope.
//
// RESPONSE ENVELOPE (stable client contract): every error response has the shape
//   { "error": { "message": <string>, "status": <number> } }
// This is intentionally identical to the envelope emitted by
// src/middleware/authMiddleware.js, so clients parse a single, predictable error
// format across the whole API regardless of where the failure originated.
//
// SECURITY (AAP 0.8 / criterion C6): server faults (5xx) ALWAYS return a generic
// `'Internal Server Error'` message - internal exception text and stack traces are
// NEVER sent to the client, preventing information disclosure. Client faults (4xx)
// may surface `err.message` because those messages are written for callers (e.g.
// "Email is required"). Server-side logging deliberately records only the request
// method, URL, derived status and the error's diagnostic detail; it NEVER logs
// request bodies, the `Authorization` header, tokens, passwords, or password
// hashes - avoiding sensitive material is enforced here at the single call site.
//
// MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM. The only
// dependency is the project logger. The pre-existing scaffold modules are
// read-only and are neither referenced nor imported here (strictly additive
// change set - AAP 0.6.2, criteria C1/C2).

'use strict';

// Sole dependency: the project's dependency-free logging helper. It exposes
// `.info` / `.warn` / `.error` / `.debug`, each stamping an ISO-8601 timestamp and
// level label. We use `logger.error(...)` to record failures server-side.
const logger = require('../utils/logger');

// Fallback HTTP status used when the error carries no usable status code, and when
// a supplied status is not a valid HTTP status integer. A server-side fault is the
// safest assumption for an otherwise unclassified error.
const DEFAULT_STATUS = 500;

// Generic, information-free message returned to clients for ALL 5xx responses so
// internal details (exception text, stack frames) never leak off the server.
const SERVER_ERROR_MESSAGE = 'Internal Server Error';

// Last-resort client message for a 4xx error that arrives without its own message.
const FALLBACK_CLIENT_MESSAGE = 'Error';

// Inclusive bounds of the valid HTTP status-code range. `res.status()` throws a
// RangeError on out-of-range values in Express 5, so we clamp defensively below -
// an error handler must never itself throw.
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

/**
 * Coerce a raw status candidate (typically `err.status` or `err.statusCode`) into
 * a safe HTTP status code.
 *
 * The error handler is the application's last line of defense, so it must never
 * throw while trying to respond. A status that is missing, non-numeric, or outside
 * the valid HTTP range (100-599) would make `res.status(...)` throw in Express 5;
 * in every such case we fall back to {@link DEFAULT_STATUS} (500). Valid 4xx/5xx
 * codes pass through unchanged, preserving the documented behavior.
 *
 * @param {*} rawStatus - Candidate status value extracted from the error object.
 * @returns {number} A valid HTTP status integer in [100, 599], or 500 as fallback.
 */
function normalizeStatus(rawStatus) {
  const status = Number(rawStatus);
  if (Number.isInteger(status) && status >= MIN_HTTP_STATUS && status <= MAX_HTTP_STATUS) {
    return status;
  }
  return DEFAULT_STATUS;
}

/**
 * Build the non-sensitive request context label used in the server-side log line.
 *
 * Only the HTTP method and the request URL are included - never headers, bodies,
 * query secrets, or credentials. Access is defensive (`req` is normally a valid
 * Express request, but a malformed/absent `req` must not make the error handler
 * throw). `originalUrl` is preferred because Express preserves the full mounted
 * path on it; `url` is a fallback.
 *
 * @param {object} [req] - The Express request object (may be absent defensively).
 * @returns {string} A compact, secret-free context label, e.g. `GET /api/reports`.
 */
function describeRequest(req) {
  const method = (req && req.method) || 'UNKNOWN';
  const url = (req && (req.originalUrl || req.url)) || 'unknown';
  return `${method} ${url}`;
}

/**
 * Extract a server-side diagnostic detail from the error for logging ONLY.
 *
 * Prefers the full stack trace (most useful for diagnosing 5xx faults), then the
 * message, then the raw error value. This value is written exclusively to the
 * server log via {@link logger.error}; it is NEVER placed in the client response,
 * so including the stack here does not leak internals to callers.
 *
 * @param {*} err - The error forwarded to the handler (any shape, possibly null).
 * @returns {*} A loggable detail: stack string, message string, or the raw error.
 */
function describeError(err) {
  if (err && err.stack) {
    return err.stack;
  }
  if (err && err.message) {
    return err.message;
  }
  return err;
}

/**
 * Centralized Express error-handling middleware.
 *
 * Registered LAST in `src/app.js` (`app.use(errorHandler)`), this handler receives
 * every synchronous throw, every `next(err)` forward, and - under Express 5 - every
 * rejected async-handler promise. It performs three steps:
 *   1. Derive a safe HTTP status from the error (defaulting to 500).
 *   2. Log the failure server-side with request context, without any secrets.
 *   3. Send a single, consistent JSON envelope `{ error: { message, status } }`,
 *      using a generic message for 5xx (no internal leak) and `err.message` for 4xx.
 *
 * If the response headers were already sent (a partially-streamed response failed),
 * it delegates to Express's built-in handler via `next(err)` instead of attempting
 * a second, invalid write.
 *
 * The 4-argument signature is REQUIRED: Express distinguishes error-handling
 * middleware from ordinary middleware purely by function arity (4 parameters), so
 * `next` must remain in the parameter list. (`next` IS used here, in the
 * headers-sent delegation branch.)
 *
 * @param {*} err - The error thrown or forwarded by upstream middleware/handlers.
 * @param {object} req - The Express request (used only for non-sensitive context).
 * @param {object} res - The Express response used to emit the error envelope.
 * @param {Function} next - Express continuation; invoked only when headers are sent.
 * @returns {*} The result of `res.json(...)`, or the result of `next(err)` when
 *              delegating an already-started response.
 */
// 4-arg signature is REQUIRED so Express treats this as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Phase 1 - derive a safe HTTP status (defensively handles null/invalid errors).
  const status = normalizeStatus(err && (err.status || err.statusCode));

  // Phase 2 - record the failure server-side with request context only. No request
  // body, no Authorization header, no tokens/passwords are ever passed here.
  logger.error(`${describeRequest(req)} -> ${status}`, describeError(err));

  // Guard against a double-send: if the response has already begun streaming, we
  // cannot rewrite the status/body - hand the error to Express's default handler.
  if (res && res.headersSent) {
    return next(err);
  }

  // Phase 3 - choose a client-safe message: generic for 5xx (no internal leak),
  // the error's own message for 4xx (those are written for callers).
  const message = status >= 500 ? SERVER_ERROR_MESSAGE : (err && err.message) || FALLBACK_CLIENT_MESSAGE;

  // Emit the single, consistent error envelope shared across the whole API.
  return res.status(status).json({ error: { message, status } });
}

// Single DEFAULT export: src/app.js consumes this as
//   const errorHandler = require('./middleware/errorHandler');
//   app.use(errorHandler); // registered LAST, after all routers
module.exports = errorHandler;
