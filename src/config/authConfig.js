// authConfig.js - Authentication (JWT + bcrypt) configuration for the Society Management API.
//
// Centralizes the authentication-specific settings read from environment variables so that the
// auth service, auth middleware, token utilities, and password utilities all consume a single,
// consistent source of truth. This is the FOUNDATIONAL configuration module for the Login
// feature: it has no internal/project dependencies and is therefore safe to require before any
// other config module - notably src/config/index.js, which re-exports these values. To avoid a
// circular dependency this module must never depend on the index config module.
//
// Module system: CommonJS (require / module.exports), consistent with the feature's wiring.
// Environment contract (see .env.example): JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS.

'use strict';

// ---------------------------------------------------------------------------
// Defensive, idempotent environment load.
// ---------------------------------------------------------------------------
// dotenv.config() reads the project's .env file into process.env *without*
// overwriting variables that are already present. The canonical, single load
// of the environment is performed by src/config/index.js, but calling config()
// here as well is harmless: it guarantees this module reads .env correctly even
// when it is imported *directly* - for example by isolated unit tests that
// bypass index.js. Because dotenv never overwrites existing values, repeated
// calls across modules are safe and produce a consistent result.
//
// `quiet: true` suppresses dotenv v17's informational startup banner so that
// importing this module (including in test runs and server logs) produces no
// spurious stdout. It does not change which variables are loaded.
require('dotenv').config({ quiet: true });

/**
 * Secret used to sign and verify JWT access tokens.
 *
 * Intentionally has NO fallback default: a real secret must be supplied via the
 * environment (see .env.example -> JWT_SECRET). When it is missing we warn
 * (below) rather than throw, so that modules importing this config - and the
 * unit tests that do so - remain loadable. The token sign/verify call sites
 * (tokenUtils) will surface a clear error if the secret is genuinely absent at
 * the point a token operation is attempted.
 *
 * @type {string|undefined}
 */
const jwtSecret = process.env.JWT_SECRET;

/**
 * Access-token lifetime forwarded verbatim to jsonwebtoken's `expiresIn` option.
 * Kept as a string (e.g. '15m', '1h', '7d') because that is the format the JWT
 * library accepts; defaults to '1h' when JWT_EXPIRES_IN is unset or empty.
 *
 * @type {string}
 */
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

// bcrypt cost factor (salt rounds) used by the asynchronous bcryptjs password
// hashing in passwordUtils. Parse as a base-10 integer with a NaN-safe fallback
// of 10, which guarantees a numeric, integer value even when BCRYPT_ROUNDS is
// absent or non-numeric.
const parsedRounds = parseInt(process.env.BCRYPT_ROUNDS, 10);

/**
 * bcrypt salt rounds as a positive integer (defaults to 10).
 *
 * @type {number}
 */
const bcryptRounds = Number.isNaN(parsedRounds) ? 10 : parsedRounds;

if (!jwtSecret) {
  // Warn once, but never throw at import time: throwing here would break any
  // module - and any unit test - that imports this config without a configured
  // secret. The secret value itself is deliberately never logged.
  // eslint-disable-next-line no-console
  console.warn('[config] JWT_SECRET is not set. Set it in your .env (see .env.example).');
}

/**
 * Frozen, flat authentication configuration consumed by authService,
 * authMiddleware, tokenUtils and passwordUtils, and re-exported by
 * src/config/index.js. The property names form a stable contract and must not
 * be renamed. The object is frozen to prevent accidental mutation at runtime.
 *
 * @typedef  {Object} AuthConfig
 * @property {string|undefined} jwtSecret    - JWT signing/verification secret (no default).
 * @property {string}           jwtExpiresIn - Token lifetime for jsonwebtoken `expiresIn`.
 * @property {number}           bcryptRounds - bcrypt salt rounds (integer, default 10).
 *
 * @type {Readonly<AuthConfig>}
 */
module.exports = Object.freeze({
  jwtSecret,
  jwtExpiresIn,
  bcryptRounds,
});
