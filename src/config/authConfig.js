// authConfig.js - Authentication (JWT + bcrypt) configuration for the Society Management API.
//
// This is the FOUNDATIONAL configuration module for the Login (authentication)
// feature. It centralizes the authentication-specific settings — the JWT signing
// secret, the JWT token lifetime, and the bcrypt cost factor — by reading them
// from environment variables and normalizing them into a small, immutable,
// flat-shaped object.
//
// Consumers (authored in other layers) read these values from here so that a
// single, consistent source of truth governs token policy and password hashing:
//   - src/services/authService.js      -> jwtSecret + jwtExpiresIn (token issuance)
//                                          and bcryptRounds (password hashing on register)
//   - src/middleware/authMiddleware.js -> jwtSecret (token verification on protected routes)
//   - src/utils/tokenUtils.js          -> receives jwtSecret / jwtExpiresIn from the caller
//   - src/utils/passwordUtils.js       -> receives bcryptRounds from the caller
//   - src/config/index.js              -> re-exports this object as part of the typed config
//
// Build-order / dependency note: this module has NO internal/project requires and
// MUST remain loadable before src/config/index.js (which depends on THIS module).
// It therefore intentionally does NOT load its sibling './index' module — doing
// so would create a circular dependency. Its only external dependency is
// `dotenv` (declared in the root package.json).
//
// Module system: CommonJS (require / module.exports). No ESM syntax is used here.
// Additive-only: this module references no pre-existing scaffold module and
// introduces only new authentication wiring.

'use strict';

// ---------------------------------------------------------------------------
// Defensive, idempotent environment load.
//
// `dotenv.config()` parses the project `.env` file (when present) and copies any
// variables it defines into `process.env` WITHOUT overwriting variables that are
// already set. Because of that non-overwriting behavior, calling it here is safe
// and harmless even though `src/config/index.js` performs the canonical, single
// application-wide load: if `index.js` (or the host environment / process
// manager) has already populated `process.env`, this call is effectively a no-op.
//
// The reason we still load here is robustness in isolation: when this module is
// require()'d directly — most notably by focused unit tests that do not go
// through `index.js` — this guard ensures the `.env` values are still available,
// so the exported configuration is correct on every code path.
require('dotenv').config();

// ---------------------------------------------------------------------------
// Read & normalize the authentication settings from the environment.
//
// Environment variable names MUST match the committed `.env.example` template
// character-for-character: JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS.

/**
 * JWT signing/verification secret.
 *
 * Sourced verbatim from `process.env.JWT_SECRET` with NO fallback default: a
 * secret is security-critical and must be supplied explicitly by the environment
 * (see `.env.example`). It may be `undefined` here when unset; that is tolerated
 * at load time (see the warning below) and will surface as a clear failure at the
 * token sign/verify call sites if it is genuinely missing in a running server.
 *
 * @type {string|undefined}
 */
const jwtSecret = process.env.JWT_SECRET;

/**
 * JWT access-token lifetime, forwarded to `jsonwebtoken`'s `expiresIn` option.
 *
 * Kept as a string so the full range of `jsonwebtoken` duration syntax is
 * supported (e.g. '15m', '1h', '7d', or a numeric-seconds string). Defaults to
 * '1h' when `JWT_EXPIRES_IN` is unset or empty.
 *
 * @type {string}
 */
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

/**
 * bcrypt cost factor (work / salt rounds) used by `bcryptjs` when hashing
 * passwords.
 *
 * Parsed to an integer with a NaN-safe guard so the exported value is ALWAYS a
 * usable number: when `BCRYPT_ROUNDS` is absent, empty, or non-numeric,
 * `parseInt` yields `NaN` and we fall back to a sensible default of 10 (a common,
 * balanced cost factor). Higher values increase resistance to brute-force attacks
 * at the expense of CPU time per hash.
 *
 * @type {number}
 */
const parsedRounds = parseInt(process.env.BCRYPT_ROUNDS, 10);
const bcryptRounds = Number.isNaN(parsedRounds) ? 10 : parsedRounds;

// ---------------------------------------------------------------------------
// Missing-secret safety.
//
// If the signing secret is absent we emit a single, non-fatal warning rather
// than throwing. Throwing at module-load time would make this module impossible
// to require in isolation (for example in unit tests that never set a secret),
// which would be hostile to testing. The warning is deliberately generic and
// NEVER includes the secret value itself.
if (!jwtSecret) {
  // eslint-disable-next-line no-console
  console.warn('[config] JWT_SECRET is not set. Set it in your .env (see .env.example).');
}

// ---------------------------------------------------------------------------
// Export the normalized, immutable authentication configuration.
//
// The property names (jwtSecret, jwtExpiresIn, bcryptRounds) are the stable
// contract consumed by authService, authMiddleware, tokenUtils, passwordUtils,
// and re-exported by src/config/index.js. They must not be renamed.
//
// The object is frozen to prevent accidental mutation of shared configuration at
// runtime, making the settings effectively read-only for every consumer.
module.exports = Object.freeze({
  jwtSecret,
  jwtExpiresIn,
  bcryptRounds,
});
