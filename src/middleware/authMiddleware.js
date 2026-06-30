// authMiddleware.js - JWT authentication & role authorization guards (CommonJS). Reused by auth + reporting.
'use strict';

/**
 * src/middleware/authMiddleware.js
 *
 * JWT authentication and role-authorization guards for the Society Management
 * API (Login + Reporting feature). This module is THE single cross-feature
 * coupling of the entire feature set: the guards it exports are reused by BOTH
 *   - the Login feature   (e.g. `GET /api/auth/me`, logout), and
 *   - the Reporting feature (every `/api/reports/*` endpoint must be guarded),
 * realizing the "Reporting-depends-on-Login" prerequisite (AAP §0.8).
 *
 * Consumers mount these guards in their route definitions via the CommonJS path
 * `../middleware/authMiddleware`, destructuring the exact named exports:
 *
 *     const { authenticate, requireRole } = require('../middleware/authMiddleware');
 *     router.get('/me', authenticate, handler);                       // any authenticated user
 *     router.get('/admin', authenticate, requireRole('admin'), fn);   // admin-only
 *
 * ── Security (AAP §0.8 / acceptance criterion C6) ─────────────────────────
 *  - Authentication errors are intentionally GENERIC. A response never reveals
 *    whether a token was missing, malformed, expired, or tampered with, which
 *    prevents user / credential enumeration.
 *  - This module NEVER logs (and never echoes to the client) the bearer token,
 *    the signing secret, the decoded payload, or the underlying error message /
 *    stack. Server-side diagnostics for genuine faults are the concern of
 *    `errorHandler.js`, not of this guard, which stays deliberately silent.
 *  - JWT verification is delegated EXCLUSIVELY to `utils/tokenUtils.verify`, and
 *    the signing secret is read EXCLUSIVELY from the central config
 *    (`config.jwt.secret`). No secret or token TTL is ever hardcoded here.
 *
 * ── Response envelope (consistent across the API) ─────────────────────────
 * Failures are answered DIRECTLY (never forwarded via `next(err)`), using the
 * same envelope shape emitted by `errorHandler.js`:
 *
 *     { "error": { "message": <string>, "status": <number> } }
 *
 * MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM syntax.
 * Additive-only: this module references none of the pre-existing arithmetic
 * scaffold modules and introduces only new authentication wiring.
 */

// ── Dependencies (all from the verified depends_on_files whitelist) ─────────
// JWT verification is delegated to this thin wrapper; `verify` RETURNS the
// decoded payload and THROWS typed errors on an invalid/expired token, so the
// call site below wraps it in try/catch and maps any throw to a generic 401.
const tokenUtils = require('../utils/tokenUtils');
// Single source of config truth (frozen). The signing secret is read as
// `config.jwt.secret` — never re-read from `process.env` or hardcoded here.
const config = require('../config');
// Canonical role string values (`['admin', 'member']`) from the domain layer.
// Used as the default "any valid role" permitted set when `requireRole` is
// invoked without explicit roles.
const { ROLE_VALUES } = require('../domain/user');

/**
 * Express middleware that authenticates a request via a Bearer JWT.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the token's
 * signature and expiry through `tokenUtils.verify`, and — on success — attaches
 * the decoded payload to `req.user` before calling `next()`. Any failure (a
 * missing / malformed header, an unsupported scheme, an empty token, or a token
 * that fails verification) results in a generic `401` response and `next` is NOT
 * called.
 *
 * On success `req.user` carries the decoded claims (e.g. `{ sub, email, role,
 * iat, exp }`), which downstream handlers (such as `GET /api/auth/me` and the
 * report controllers) and {@link requireRole} read to make authorization
 * decisions.
 *
 * @param {import('express').Request} req
 *        Incoming request; `req.headers.authorization` is inspected and
 *        `req.user` is set to the decoded payload on success.
 * @param {import('express').Response} res
 *        Response used to emit the generic `401` envelope on failure.
 * @param {import('express').NextFunction} next
 *        Continuation invoked only on successful authentication.
 * @returns {void}
 */
function authenticate(req, res, next) {
  // Express normalizes header names to lower-case. A missing header is coerced
  // to an empty string so the split below never throws on `undefined`.
  const authHeader = req.headers.authorization;
  const [scheme, token] = (authHeader || '').split(' ');

  // Require the `Bearer` scheme AND a non-empty token. This rejects a missing
  // header, a wrong/empty scheme, and a `Bearer` with no token — all with the
  // SAME generic message so nothing about the failure reason is leaked.
  if (scheme !== 'Bearer' || !token) {
    return res
      .status(401)
      .json({ error: { message: 'Authentication required', status: 401 } });
  }

  // Verify the token. `tokenUtils.verify` returns the decoded payload on success
  // and throws (TokenExpiredError / JsonWebTokenError / NotBeforeError) on any
  // failure; we translate EVERY throw into one generic 401 so the client cannot
  // distinguish "expired" from "tampered" from "wrong secret".
  try {
    const decoded = tokenUtils.verify(token, config.jwt.secret);
    req.user = decoded;
    return next();
  } catch (err) {
    // Intentionally ignore the error detail: never echo `err.message` / stack to
    // the client and never log the token, secret, or decoded payload.
    return res
      .status(401)
      .json({ error: { message: 'Invalid or expired token', status: 401 } });
  }
}

/**
 * Factory producing an Express middleware that authorizes by role.
 *
 * `requireRole` is intended to run AFTER {@link authenticate} in a route's
 * middleware chain, so that `req.user` (and therefore `req.user.role`) is already
 * populated, e.g.:
 *
 *     router.get('/admin', authenticate, requireRole('admin'), handler);
 *
 * Behavior of the returned middleware:
 *  - If there is no authenticated user / role on the request (i.e. `authenticate`
 *    did not run or did not set `req.user`), it responds `401` generic — a
 *    defensive guard against misuse / misordering.
 *  - The permitted set is the explicit `allowedRoles` when one or more are
 *    supplied; otherwise it defaults to every known domain role (`ROLE_VALUES`),
 *    meaning "any authenticated user with a valid role".
 *  - If the user's role is not in the permitted set, it responds `403`.
 *  - Otherwise it calls `next()`.
 *
 * @param {...string} allowedRoles
 *        Zero or more permitted role strings (e.g. `'admin'`, `'member'`). When
 *        omitted, any role present in {@link ROLE_VALUES} is accepted.
 * @returns {import('express').RequestHandler}
 *        An Express middleware `(req, res, next)` enforcing the role policy.
 */
function requireRole(...allowedRoles) {
  // Resolve the permitted set once at factory time. With no explicit roles we
  // fall back to all canonical domain roles ("any valid role"); this is the
  // genuine use of the `domain/user` import.
  const permitted = allowedRoles.length > 0 ? allowedRoles : ROLE_VALUES;

  return (req, res, next) => {
    const role = req.user && req.user.role;

    // No authenticated role present → treat as unauthenticated (generic 401).
    if (!role) {
      return res
        .status(401)
        .json({ error: { message: 'Authentication required', status: 401 } });
    }

    // Authenticated but role not permitted → forbidden (403).
    if (!permitted.includes(role)) {
      return res
        .status(403)
        .json({ error: { message: 'Insufficient permissions', status: 403 } });
    }

    return next();
  };
}

// Exact named-export contract consumed by the route layer:
//   const { authenticate, requireRole } = require('../middleware/authMiddleware');
module.exports = { authenticate, requireRole };
