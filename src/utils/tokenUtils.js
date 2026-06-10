// tokenUtils.js - JWT sign/verify helpers around the `jsonwebtoken` library.
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login feature's dependency graph, alongside the other src/utils helpers (and is
// the JWT analog of passwordUtils.js). It is a thin, focused wrapper around the
// `jsonwebtoken` package that exposes exactly two operations stateless
// authentication needs: issuing a signed JWT access token from a payload
// (`sign`, used at login) and verifying/decoding a presented token (`verify`, used
// to guard protected routes). It contains no business logic, holds no state, and
// makes no policy decisions of its own.
//
// SINGLE DEPENDENCY BY DESIGN (AAP 0.2.3 / 0.3.1): the ONLY thing this file
// requires is the `jsonwebtoken` npm package (^9.0.3, already declared in the root
// package.json). This module imports NO application config and NO other repository
// module: the signing `secret` and the token lifetime (`expiresIn`) are ALWAYS
// supplied by the caller. src/services/authService.js and src/middleware/
// authMiddleware.js read JWT_SECRET and JWT_EXPIRES_IN from config and pass them
// in, so this helper stays config-agnostic and trivially reusable/testable. It
// MUST NOT hardcode the secret, an expiry default, or any secret fallback - that is
// strictly config's responsibility.
//
// SYNCHRONOUS API (jsonwebtoken v9): unlike the CPU-intensive bcrypt hashing in
// passwordUtils, JWT signing/verification with an HMAC secret is fast and is used
// here in its synchronous form. When invoked WITHOUT a callback, `jwt.sign` returns
// the encoded token string directly and `jwt.verify` returns the decoded payload
// directly (throwing on failure). No callbacks and no Promises are involved.
//
// ERROR PROPAGATION IS INTENTIONAL (security-critical - AAP 0.5.2): `verify` does
// NOT swallow errors and NEVER returns `null`/`undefined` on failure. A token that
// is malformed, tampered with, or signed with the wrong secret causes
// `jwt.verify` to throw a `JsonWebTokenError`; an otherwise-valid token whose
// `exp` claim has passed throws a `TokenExpiredError`. These native errors are
// surfaced unchanged to the caller (authMiddleware) so it can distinguish failure
// modes and respond with a generic 401. Wrapping verification in a try/catch that
// hides the error - or returning a falsy value - would let an unauthenticated
// request slip through, so it is deliberately avoided here.
//
// SECURITY (AAP 0.8 / C6): this module performs NO logging whatsoever. It never
// writes the signing secret, the payload, or the produced/parsed token to
// `console` or any stream. Tokens are signed with a caller-provided secret and -
// when the caller passes `options.expiresIn` - carry an expiry, matching the
// "tokens are signed with a configured secret and carry an expiry" baseline.
// Callers must likewise avoid logging these inputs/outputs.
//
// CommonJS only: wiring is via `module.exports` (no ESM `import`/`export`). The
// existing scaffold `file_*.js` / `src/utils/filler.js` modules are read-only filler
// and are neither referenced nor imported here (AAP 0.6.2).
//
// Consumers load this module by its utils path '../utils/tokenUtils':
//   - src/services/authService.js -> `sign(payload, secret, options)` to issue an
//     access token after credentials are verified during login.
//   - src/middleware/authMiddleware.js -> `verify(token, secret)` to validate the
//     Bearer token on every protected route (including all /api/reports/*),
//     catching thrown errors to return a 401.

'use strict';

// The sole dependency: the `jsonwebtoken` library. Required by its bare package
// name so Node resolves it from node_modules. Only its synchronous `sign`/`verify`
// surface is used here - see the SYNCHRONOUS API note above.
const jwt = require('jsonwebtoken');

/**
 * Issue a signed JWT access token for the given payload.
 *
 * Delegates directly to `jwt.sign(payload, secretOrPrivateKey, options)`. Called
 * without a callback, `jwt.sign` is synchronous and returns the encoded JWT as a
 * string (a `header.payload.signature` triple). The `options` object is forwarded
 * verbatim; the authentication flow notably sets `options.expiresIn` (sourced from
 * the caller's JWT_EXPIRES_IN config, e.g. `'1h'`) so the resulting token carries an
 * `exp` claim and the library also stamps a standard `iat` (issued-at) claim.
 *
 * The `payload` MUST be a plain object (e.g. `{ sub, role }`). With jsonwebtoken v9,
 * registered-claim options such as `expiresIn` are only permitted when the payload
 * is an object literal - never a pre-serialized string - so this wrapper passes the
 * caller's object straight through and never stringifies it.
 *
 * This helper does NOT inject a secret or an expiry of its own: both the `secret`
 * and any lifetime live entirely in the caller-provided arguments, keeping the
 * util config-agnostic. The secret and the returned token are never logged.
 *
 * @param {object} payload - Plain object of claims to embed (e.g. `{ sub, role }`).
 *   Must be an object (not a string) so `expiresIn` and similar options apply.
 * @param {string} secret - The HMAC signing secret, supplied by the caller from
 *   config (JWT_SECRET). Never hardcoded or defaulted here.
 * @param {object} [options={}] - jsonwebtoken sign options, typically carrying
 *   `{ expiresIn }`. Optional; defaults to an empty object so a token with no
 *   explicit expiry can still be produced when the caller omits it.
 * @returns {string} The signed JWT as a compact, URL-safe string.
 */
function sign(payload, secret, options = {}) {
  // Thin pass-through: forward the caller's payload, secret, and options to
  // jwt.sign. No callback -> synchronous return of the token string. We add no
  // expiry default and no secret fallback - those are config's responsibility, and
  // `options` already defaults to {} so the third argument is always a valid object.
  return jwt.sign(payload, secret, options);
}

/**
 * Verify a JWT and return its decoded payload.
 *
 * Delegates directly to `jwt.verify(token, secretOrPublicKey)`. Called without a
 * callback, `jwt.verify` is synchronous: on success it returns the decoded payload
 * object (including registered claims such as `iat` and, when present, `exp`); on
 * failure it THROWS rather than returning a value.
 *
 * Error handling is intentionally left to the caller. This wrapper does NOT catch,
 * translate, or suppress verification errors and NEVER returns `null`/`undefined`
 * for an invalid token:
 *   - a malformed signature, a tampered token, or the wrong secret throws a
 *     `JsonWebTokenError`;
 *   - a token whose `exp` has elapsed throws a `TokenExpiredError` (a subclass).
 * Surfacing these native errors lets src/middleware/authMiddleware.js catch them and
 * respond with a generic 401, which is exactly the required behavior (AAP 0.5.2).
 * Neither the token nor the secret is logged.
 *
 * @param {string} token - The encoded JWT string to verify (e.g. the value of a
 *   `Authorization: Bearer <token>` header, with the scheme already stripped).
 * @param {string} secret - The HMAC secret to verify the signature against, supplied
 *   by the caller from config (JWT_SECRET).
 * @returns {object} The verified, decoded token payload.
 * @throws {jwt.TokenExpiredError} When the token's `exp` claim is in the past.
 * @throws {jwt.JsonWebTokenError} When the token is malformed, tampered with, or
 *   signed with a different secret.
 */
function verify(token, secret) {
  // Thin pass-through: return the decoded payload from jwt.verify. Deliberately NOT
  // wrapped in try/catch - TokenExpiredError / JsonWebTokenError must propagate so
  // the caller (authMiddleware) can map them to a 401. Returning null here would
  // silently let invalid tokens through, so it is never done.
  return jwt.verify(token, secret);
}

// CommonJS named exports. Each function is exported by its exact public name so
// callers can destructure precisely what they need, e.g.
// `const { sign, verify } = require('../utils/tokenUtils');`.
module.exports = {
  sign,
  verify,
};
