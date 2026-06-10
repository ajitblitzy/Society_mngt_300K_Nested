// authMiddleware.js - JWT authentication & role authorization guards (CommonJS). Reused by auth + reporting.
//
// MIDDLEWARE LAYER (cross-cutting): this module is THE single cross-feature
// coupling of the Society Management feature. It exposes two Express middlewares
// that protect privileged endpoints:
//   - `authenticate`  -> verifies the `Authorization: Bearer <jwt>` header, decodes
//     the token, and attaches the decoded payload to `req.user`.
//   - `requireRole`   -> a guard factory that authorizes a request only when the
//     authenticated user's role is in the permitted set.
//
// REUSED BY BOTH FEATURES (AAP 0.4.1 / 0.8): the Login feature mounts
// `authenticate` on its session-bound endpoints (e.g. `GET /api/auth/me`, logout),
// and EVERY Reporting endpoint (`/api/reports/*`) is access-controlled by these
// same guards - realizing the "Reporting depends on Login" prerequisite. Routers
// consume the named exports as:
//   const { authenticate, requireRole } = require('../middleware/authMiddleware');
//   router.get('/me', authenticate, handler);
//   router.get('/admin', authenticate, requireRole('admin'), handler);
//
// STRICTLY ADDITIVE (non-regression mandate, AAP 0.6.2 / C1-C2): this is a net-new
// CommonJS module. It does NOT modify, import, reference, or copy logic from any of
// the pre-existing read-only scaffold modules (synthetic arithmetic padding that
// export nothing). All wiring here is brand-new `require`/`module.exports`.
//
// SECURITY (AAP 0.8 / C6): authentication failures return GENERIC messages so a
// caller cannot distinguish "no token" from "expired" from "tampered" (no user or
// token enumeration). This module performs NO logging whatsoever: it never writes
// the token, the signing secret, the decoded payload, or the underlying error to
// `console` or any stream, and never echoes `err.message`/stack to the client.
//
// CONTRACT WITH SIBLINGS: JWT verification is delegated ONLY to
// `src/utils/tokenUtils.verify` (this file never `require`s `jsonwebtoken`
// directly), and the signing secret is read ONLY from the central config
// (`config.jwt.secret`) - never hardcoded and never defaulted here. The error
// envelope `{ error: { message, status } }` is identical to the shape produced by
// `src/middleware/errorHandler.js`, so clients see one consistent error format.

'use strict';

// ---------------------------------------------------------------------------
// Dependencies (CommonJS; net-new wiring only).
// ---------------------------------------------------------------------------
// JWT helper: `tokenUtils.verify(token, secret)` returns the decoded payload on
// success and THROWS (`JsonWebTokenError` / `TokenExpiredError`) on a malformed,
// tampered, or expired token. It never returns null and never swallows errors, so
// the `authenticate` guard MUST wrap the call in try/catch and translate any throw
// into a generic 401. JWT verification goes through this util exclusively - this
// module deliberately does NOT require `jsonwebtoken` directly.
const tokenUtils = require('../utils/tokenUtils');

// Central, frozen application config (single source of config truth). The JWT
// signing/verification secret is read as `config.jwt.secret`; it originates from
// the environment (JWT_SECRET) via config/authConfig and is never hardcoded or
// given a fallback in this file.
const config = require('../config');

// Domain role constants. `ROLE_VALUES` is the frozen array of every valid role
// (`['admin', 'member']`) and is used by `requireRole` as the default permitted
// set when a route does not name any specific role (i.e. "any authenticated user
// holding a valid role"). Only ROLE_VALUES is imported because it is the sole
// binding genuinely used here.
const { ROLE_VALUES } = require('../domain/user');

// ---------------------------------------------------------------------------
// Shared error envelope helpers.
// ---------------------------------------------------------------------------
// Build the consistent `{ error: { message, status } }` JSON body used by every
// failure response. Centralizing it guarantees auth responses match the shape
// emitted by errorHandler.js and keeps the messages generic by construction.

/** Generic message for any unauthenticated request (missing/malformed credentials). */
const MSG_AUTH_REQUIRED = 'Authentication required';
/** Generic message for a present-but-unusable token (invalid signature/expired/tampered). */
const MSG_INVALID_TOKEN = 'Invalid or expired token';
/** Message for an authenticated user whose role is not permitted for the route. */
const MSG_FORBIDDEN = 'Insufficient permissions';

/**
 * Send a standardized error response.
 *
 * Produces the single, consistent envelope `{ error: { message, status } }` (the
 * same shape as errorHandler.js) and returns the result of `res.json(...)` so the
 * caller can `return sendError(...)` to both respond and short-circuit the chain.
 * The body intentionally carries only a generic message and the numeric status -
 * never token/secret/payload detail.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {number} status - HTTP status code (e.g. 401 or 403).
 * @param {string} message - Generic, information-free client message.
 * @returns {import('express').Response} The result of `res.status(status).json(...)`.
 */
function sendError(res, status, message) {
  return res.status(status).json({ error: { message, status } });
}

// ---------------------------------------------------------------------------
// authenticate - JWT authentication guard.
// ---------------------------------------------------------------------------
/**
 * Express middleware that authenticates a request using a Bearer JWT.
 *
 * Behavior:
 *   1. Reads the `Authorization` header (Express lower-cases header keys, so it is
 *      accessed as `req.headers.authorization`). A missing header is treated as
 *      unauthenticated.
 *   2. Parses the header as `"<scheme> <token>"`. The request is accepted for
 *      verification only when the scheme is exactly `Bearer` and a non-empty token
 *      is present; anything else (missing header, wrong scheme, empty token) yields
 *      a generic 401 and the chain is short-circuited (no `next` call).
 *   3. Verifies the token via `tokenUtils.verify(token, config.jwt.secret)` inside a
 *      try/catch. On success the decoded payload (e.g. `{ sub, email, role, iat,
 *      exp }`) is attached to `req.user` and control passes to `next()`. On any
 *      thrown verification error the request gets a generic 401.
 *
 * Security: every failure path returns a generic message so callers cannot tell a
 * missing token from an expired or tampered one (no enumeration). The token, the
 * secret, the decoded payload, and the caught error are never logged or returned.
 *
 * @param {import('express').Request} req - Express request; `req.headers.authorization`
 *   is read and, on success, `req.user` is set to the decoded token payload.
 * @param {import('express').Response} res - Express response used to emit a 401 on failure.
 * @param {import('express').NextFunction} next - Called with no arguments on success.
 * @returns {*} The result of `next()` on success, or of the 401 response on failure.
 */
function authenticate(req, res, next) {
  // Express normalizes header names to lower-case; `authorization` is the canonical
  // key. Coerce a missing header to '' so the split below is always safe.
  const authHeader = req.headers && req.headers.authorization;
  const [scheme, token] = (authHeader || '').split(' ');

  // Require the exact `Bearer` scheme AND a non-empty token. This single guard
  // covers the missing-header, wrong-scheme, "Bearer" with no token, and trailing-
  // space (empty token) cases - all of which are unauthenticated.
  if (scheme !== 'Bearer' || !token) {
    return sendError(res, 401, MSG_AUTH_REQUIRED);
  }

  try {
    // Delegate verification to the util. Returns the decoded payload on success;
    // throws JsonWebTokenError/TokenExpiredError otherwise. The secret comes solely
    // from central config and is never logged.
    const decoded = tokenUtils.verify(token, config.jwt.secret);

    // Attach the decoded payload so downstream handlers (e.g. GET /api/auth/me,
    // report controllers) and requireRole can read req.user.role.
    req.user = decoded;
    return next();
  } catch (err) {
    // Generic 401 - deliberately does NOT reveal whether the token was malformed,
    // expired, or signed with the wrong secret, and never echoes err.message/stack.
    return sendError(res, 401, MSG_INVALID_TOKEN);
  }
}

// ---------------------------------------------------------------------------
// requireRole - role authorization guard factory.
// ---------------------------------------------------------------------------
/**
 * Build an Express middleware that authorizes a request by the user's role.
 *
 * This is a FACTORY: it accepts zero or more allowed role strings and returns the
 * actual `(req, res, next)` middleware. The permitted set is resolved once, at
 * registration time:
 *   - when one or more roles are passed, only those roles are permitted;
 *   - when called with no arguments, it defaults to every valid domain role
 *     (`ROLE_VALUES`), i.e. "any authenticated user holding a recognized role".
 *
 * The returned middleware is intended to run AFTER `authenticate` in a route's
 * chain (e.g. `router.get('/admin', authenticate, requireRole('admin'), handler)`),
 * so it can read `req.user.role`. It still defends against misuse: if no
 * authenticated user/role is present it responds with a generic 401 rather than
 * assuming a role. A present-but-unpermitted role yields a 403.
 *
 * @param {...string} allowedRoles - Zero or more roles permitted for the route.
 *   When omitted, all roles in `ROLE_VALUES` are permitted.
 * @returns {import('express').RequestHandler} An Express middleware enforcing the
 *   role policy: 401 when unauthenticated, 403 when the role is not permitted, and
 *   `next()` otherwise.
 */
function requireRole(...allowedRoles) {
  // Resolve the permitted set once at factory time. Explicit roles win; otherwise
  // fall back to the full set of valid domain roles. This is the genuine use of the
  // domain import - the "any valid role" default when no specific role is required.
  const permitted = allowedRoles.length > 0 ? allowedRoles : ROLE_VALUES;

  return (req, res, next) => {
    // Read the role from the payload attached by `authenticate`. If it is absent,
    // the request is effectively unauthenticated (authenticate did not run / set it).
    const role = req.user && req.user.role;
    if (!role) {
      return sendError(res, 401, MSG_AUTH_REQUIRED);
    }

    // Authenticated but not permitted -> forbidden. 403 distinguishes "I know who
    // you are, but you may not do this" from the 401 "I don't know who you are".
    if (!permitted.includes(role)) {
      return sendError(res, 403, MSG_FORBIDDEN);
    }

    // Authorized: hand off to the next middleware/handler.
    return next();
  };
}

// ---------------------------------------------------------------------------
// CommonJS named exports (exact contract consumed by the routers).
// ---------------------------------------------------------------------------
// Route files destructure precisely these two names:
//   const { authenticate, requireRole } = require('../middleware/authMiddleware');
// No default export and no additional exports are part of the contract.
module.exports = {
  authenticate,
  requireRole,
};
