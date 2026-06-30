// passwordUtils.js - Async bcryptjs password hashing and comparison helpers.
'use strict';

/**
 * @module utils/passwordUtils
 *
 * Asynchronous password hashing helpers for the Society Management Login feature.
 *
 * This module is a deliberately thin, single-responsibility wrapper around the
 * pure-JavaScript {@link https://www.npmjs.com/package/bcryptjs|bcryptjs} library.
 * It is consumed by `src/services/authService.js` to hash passwords during
 * registration and to verify credentials during login. Passwords are persisted
 * ONLY as bcrypt hashes — plaintext passwords are never stored (security
 * baseline C6).
 *
 * Design contract:
 * - ASYNC ONLY. Only the promise-returning bcrypt APIs are used. The synchronous
 *   `*Sync` variants are intentionally avoided because bcrypt is CPU-intensive
 *   and the synchronous forms block the Node.js event loop, degrading throughput
 *   under concurrency.
 * - The cost factor (`rounds`) is always supplied by the caller (which reads it
 *   from configuration, e.g. the `BCRYPT_ROUNDS` environment variable). This
 *   module never imports configuration and never hardcodes a default that would
 *   override the caller's choice.
 * - Errors are propagated, not swallowed. bcryptjs rejects its returned promise
 *   on invalid input (for example a non-string password or an unusable salt/cost
 *   factor); those rejections flow straight through to the caller, which is the
 *   correct behaviour for a thin wrapper. Request-level input validation is the
 *   responsibility of the calling layer (see `src/utils/validation.js`).
 * - SECURITY: this module never logs passwords, hashes, or any other secret, and
 *   performs no console output of any kind.
 *
 * CommonJS module — exposes its API via `module.exports`.
 */

const bcrypt = require('bcryptjs');

/**
 * Hash a plaintext password using bcrypt with the caller-supplied cost factor.
 *
 * A unique, cryptographically random salt is generated automatically by bcryptjs
 * when a numeric cost factor is passed to `bcrypt.hash`; the salt is embedded in
 * the returned hash string, so no separate salt-generation step is required.
 *
 * @param {string} password - The plaintext password to hash.
 * @param {number|string} rounds - The bcrypt cost factor (work factor) supplied
 *   by the caller. Environment-derived values may arrive as strings, so the value
 *   is coerced with `Number(rounds)` before being handed to bcrypt. Higher values
 *   are exponentially more expensive to compute.
 * @returns {Promise<string>} Resolves with the bcrypt hash (salt included). The
 *   promise rejects if bcryptjs cannot process the supplied arguments.
 */
async function hash(password, rounds) {
  // `rounds` is provided by the caller (from BCRYPT_ROUNDS in config). Coerce
  // defensively because environment variables are strings. Passing a numeric
  // cost factor lets bcryptjs generate the salt internally — the single-call
  // form is preferred over an explicit genSalt step.
  return bcrypt.hash(password, Number(rounds));
}

/**
 * Verify a plaintext password against a previously stored bcrypt hash.
 *
 * The cost factor and salt are read from the stored hash itself, so only the
 * candidate password and the stored hash are required. The comparison is
 * performed in constant time by bcryptjs to mitigate timing attacks.
 *
 * @param {string} password - The candidate plaintext password to verify.
 * @param {string} hashedPassword - The previously stored bcrypt hash to compare
 *   against (this is the second positional argument of the documented
 *   `compare(password, hash)` signature).
 * @returns {Promise<boolean>} Resolves `true` when the password matches the
 *   stored hash, otherwise `false`. The promise rejects if bcryptjs cannot
 *   process the supplied arguments.
 */
async function compare(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = { hash, compare };
