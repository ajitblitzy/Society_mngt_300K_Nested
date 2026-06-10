// authConfig.js - Authentication (JWT + bcrypt) configuration for the Society Management API.
//
// Centralizes the authentication-specific settings read from environment variables so that the
// auth service, auth middleware, token utilities, and password utilities all consume a single,
// consistent source of truth. This is the FOUNDATIONAL configuration module for the Login
// feature: it is a dependency-free leaf module - it imports NOTHING (not even dotenv) and reads
// its values directly from process.env. It is therefore safe to require before any other config
// module - notably src/config/index.js, which performs the single canonical dotenv load and then
// re-exports these values. To avoid a circular dependency this module must never depend on the
// index config module.
//
// Module system: CommonJS (require / module.exports), consistent with the feature's wiring.
// Environment contract (see .env.example): JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS.

'use strict';

// ---------------------------------------------------------------------------
// Environment source: process.env only (NO dotenv load here).
// ---------------------------------------------------------------------------
// This module deliberately does NOT call require('dotenv').config(). Loading the
// .env file is the SINGLE, canonical responsibility of src/config/index.js, which
// calls dotenv.config() exactly once and only then requires this module - so by the
// time authConfig is evaluated through the normal application path, process.env is
// already populated. Concentrating the load in exactly one place removes the
// ambiguity of multiple load points and keeps this leaf module dependency-free.
//
// Direct importers that bypass src/config/index.js (for example an isolated unit
// test that requires this file on its own) are responsible for ensuring the
// relevant variables are present in process.env first - either by setting them
// explicitly on process.env before requiring this module, or by importing through
// src/config/index.js so the canonical dotenv load runs.

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

// ---------------------------------------------------------------------------
// bcrypt cost factor (salt rounds).
// ---------------------------------------------------------------------------
// Used by the asynchronous bcryptjs password hashing in passwordUtils. bcryptjs
// only honors a cost factor in the range [4, 31] and silently CLAMPS anything
// outside it (e.g. BCRYPT_ROUNDS=-1 would otherwise yield a weak `$2b$04$` hash),
// so an unvalidated value can quietly weaken the password-hashing baseline. To
// prevent that, BCRYPT_ROUNDS is accepted only when it parses to an integer within
// the secure range below; every other value falls back to the documented default.

/**
 * Documented default bcrypt cost factor, and the secure minimum we will hash with.
 * Matches the value documented in .env.example (BCRYPT_ROUNDS=10).
 *
 * @type {number}
 */
const DEFAULT_BCRYPT_ROUNDS = 10;

/**
 * Lowest bcrypt cost factor accepted from configuration. Pinned to the documented
 * baseline (10) so a misconfigured, sub-baseline value can never silently weaken
 * password hashing; any lower request falls back to {@link DEFAULT_BCRYPT_ROUNDS}.
 *
 * @type {number}
 */
const MIN_BCRYPT_ROUNDS = 10;

/**
 * Highest bcrypt cost factor bcryptjs supports. Values above this are invalid
 * (bcryptjs would clamp them), so they are rejected in favor of the default.
 *
 * @type {number}
 */
const MAX_BCRYPT_ROUNDS = 31;

// Parse BCRYPT_ROUNDS as a base-10 integer. parseInt yields NaN when the variable
// is absent or non-numeric, which is treated as "invalid" by the guard below.
const parsedRounds = parseInt(process.env.BCRYPT_ROUNDS, 10);

// A configured value is accepted ONLY when it is a true integer inside
// [MIN_BCRYPT_ROUNDS, MAX_BCRYPT_ROUNDS]. Everything else - NaN/absent, non-integer,
// zero, negative, below the secure minimum, or above bcrypt's maximum - is rejected.
const bcryptRoundsAreValid =
  Number.isInteger(parsedRounds) &&
  parsedRounds >= MIN_BCRYPT_ROUNDS &&
  parsedRounds <= MAX_BCRYPT_ROUNDS;

/**
 * bcrypt salt rounds as a validated integer within
 * [{@link MIN_BCRYPT_ROUNDS}, {@link MAX_BCRYPT_ROUNDS}]. Falls back to
 * {@link DEFAULT_BCRYPT_ROUNDS} (10) for any absent, invalid, or unsafe value so the
 * password-hashing cost can never drop below the documented baseline.
 *
 * @type {number}
 */
const bcryptRounds = bcryptRoundsAreValid ? parsedRounds : DEFAULT_BCRYPT_ROUNDS;

// Surface a misconfiguration: when an explicit BCRYPT_ROUNDS was provided but had to
// be rejected, warn once at import time so the operator notices. BCRYPT_ROUNDS is a
// cost factor, not a secret, so echoing it is safe; no secret material is logged.
const rawBcryptRounds = process.env.BCRYPT_ROUNDS;
if (rawBcryptRounds !== undefined && rawBcryptRounds !== '' && !bcryptRoundsAreValid) {
  // eslint-disable-next-line no-console
  console.warn(
    `[config] BCRYPT_ROUNDS="${rawBcryptRounds}" is not an integer in ` +
      `[${MIN_BCRYPT_ROUNDS}, ${MAX_BCRYPT_ROUNDS}]; falling back to ${DEFAULT_BCRYPT_ROUNDS}.`,
  );
}

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
 * @property {number}           bcryptRounds - bcrypt salt rounds (validated integer in [10, 31], default 10).
 *
 * @type {Readonly<AuthConfig>}
 */
module.exports = Object.freeze({
  jwtSecret,
  jwtExpiresIn,
  bcryptRounds,
});
