// tokenUtils.js - JWT sign and verify helpers around jsonwebtoken.
'use strict';

/**
 * tokenUtils
 * ----------
 * Thin, stateless wrapper around the `jsonwebtoken` library used to issue and
 * verify signed JWT access tokens for the Society Management authentication
 * layer.
 *
 * Design contract (intentionally minimal — see AAP §0.5.2):
 *  - The signing secret and the token lifetime (`expiresIn`) are ALWAYS supplied
 *    by the caller. This module deliberately does NOT read configuration, does
 *    NOT import any other repository module, and does NOT hardcode a secret or a
 *    default TTL. Centralising secret/TTL resolution in the config layer keeps
 *    this helper pure and trivially testable.
 *      • `src/services/authService.js`    -> calls {@link sign} when issuing a
 *        token on successful login (secret from `JWT_SECRET`, `expiresIn` from
 *        `JWT_EXPIRES_IN`).
 *      • `src/middleware/authMiddleware.js` -> calls {@link verify} to validate
 *        the `Authorization: Bearer <token>` header on every protected route
 *        (including all `/api/reports/*` endpoints).
 *
 *  - {@link verify} purposely does NOT catch errors. `jsonwebtoken` throws
 *    typed errors (`TokenExpiredError`, `JsonWebTokenError`, `NotBeforeError`)
 *    that the caller (auth middleware) inspects to return a generic `401`
 *    response. Swallowing those errors here, or returning `null`, would hide the
 *    failure reason and break the middleware's ability to reject invalid or
 *    expired tokens — so they are surfaced unchanged.
 *
 * Security notes:
 *  - This module NEVER logs the secret or the token, and performs no `console`
 *    output of any kind.
 *  - Tokens are signed/verified synchronously by `jsonwebtoken`; the work is
 *    lightweight relative to password hashing, so no async API is required here.
 *
 * Module system: CommonJS (`require` / `module.exports`). No ESM.
 */

// The ONLY dependency of this module — no config and no other repository file
// are imported, by design (see contract above).
const jwt = require('jsonwebtoken');

/**
 * Create a signed JWT for the supplied payload.
 *
 * This is a direct, intentionally thin pass-through to `jwt.sign`. The caller
 * owns every aspect of token policy:
 *  - `payload` carries the claims (for Society Management this is typically the
 *    subject and role, e.g. `{ sub: user.id, role: user.role }`).
 *  - `secret` is the signing secret resolved by the caller from configuration
 *    (`JWT_SECRET`); it is never defaulted or stored here.
 *  - `options` carries token settings — most importantly `expiresIn` (sourced
 *    from `JWT_EXPIRES_IN`, e.g. `'1h'`). It is optional and defaults to an
 *    empty object so callers may omit it.
 *
 * Note on `jsonwebtoken` v9: when `options.expiresIn` (or any registered claim
 * option) is set, the `payload` MUST be a plain object — not a string. Callers
 * always pass an object, so the payload is forwarded as-is and never stringified.
 *
 * @param {Object} payload                 Plain object of JWT claims to encode.
 * @param {string|Buffer} secret           Symmetric signing secret (caller-provided).
 * @param {Object} [options={}]            `jsonwebtoken` sign options, e.g. `{ expiresIn: '1h' }`.
 * @returns {string}                        The encoded, signed JWT.
 * @throws {Error}                          Propagates any error thrown by `jwt.sign`
 *                                          (e.g. invalid options or a non-object
 *                                          payload combined with `expiresIn`).
 */
function sign(payload, secret, options = {}) {
  return jwt.sign(payload, secret, options);
}

/**
 * Verify a JWT and return its decoded payload.
 *
 * A thin pass-through to `jwt.verify`. On success it returns the decoded payload
 * object (the original claims plus standard registered claims such as `iat` and
 * `exp`). On failure it does NOT return a sentinel value — instead it allows
 * `jsonwebtoken`'s typed errors to propagate so the caller can map them to a
 * generic `401 Unauthorized` response:
 *  - `TokenExpiredError`  — the token's `exp` has passed.
 *  - `JsonWebTokenError`  — malformed token, invalid signature, or secret mismatch.
 *  - `NotBeforeError`     — the token's `nbf` claim is still in the future.
 *
 * @param {string} token                    The encoded JWT to validate.
 * @param {string|Buffer} secret            Symmetric secret used to sign the token (caller-provided).
 * @returns {Object|string}                 The decoded/verified token payload.
 * @throws {import('jsonwebtoken').JsonWebTokenError|import('jsonwebtoken').TokenExpiredError|import('jsonwebtoken').NotBeforeError}
 *                                          Surfaced unchanged for the caller (auth
 *                                          middleware) to handle as a 401.
 */
function verify(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = { sign, verify };
