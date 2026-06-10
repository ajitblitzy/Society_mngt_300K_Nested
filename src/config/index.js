// index.js - central runtime configuration for the Society Management API.
//
// This module is the SINGLE SOURCE OF CONFIG TRUTH for the application. It loads
// environment variables exactly once (the canonical dotenv load point) and exposes
// a frozen, typed configuration object that every other layer consumes:
//   - src/server.js      reads `config.port` to bind the HTTP listener.
//   - src/app.js         may import it for environment-aware behavior.
//   - services/middleware/utils read the JWT + bcrypt settings (via `config.jwt`
//     and `config.bcryptRounds`).
//
// Design notes:
//   * Authentication settings (JWT secret/TTL, bcrypt rounds) are NOT re-read from
//     the environment here. They are imported from ./authConfig so there is exactly
//     ONE place that interprets JWT_SECRET / JWT_EXPIRES_IN / BCRYPT_ROUNDS. The
//     dependency direction is strictly one-way: index.js -> authConfig.js. Never
//     make authConfig.js depend on this module (that would create a require cycle).
//   * Only non-secret, app-level values (PORT, NODE_ENV) are resolved here, each
//     with a safe default. No default is invented for JWT_SECRET - it flows through
//     from authConfig.js, which deliberately has no fallback.
//   * The exported object (and its nested `jwt` object) is frozen so configuration
//     is immutable at runtime and cannot be mutated by accident from a consumer.
//
// Module system: CommonJS (require / module.exports), consistent with the feature's
// wiring. Environment contract (see .env.example): PORT, NODE_ENV, and - indirectly
// through authConfig - JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS.

'use strict';

// ---------------------------------------------------------------------------
// Canonical, single environment load.
// ---------------------------------------------------------------------------
// This is the application-wide single load point for environment variables:
// require('dotenv').config() reads the project's .env file into process.env so
// that every value resolved below (and every value read indirectly via
// authConfig) reflects the runtime environment. It is intentionally called here,
// exactly once, in the central config module.
//
// `quiet: true` suppresses dotenv v17's informational startup banner so that
// booting the server, running the test suite, or importing this module produces
// no spurious stdout. It does not change which variables are loaded. (The sibling
// authConfig.js applies the same option for the same reason.) dotenv never
// overwrites variables that are already present in process.env, so values exported
// by the real shell environment always take precedence over the .env file.
require('dotenv').config({ quiet: true });

// Centralized authentication settings (JWT signing secret, token TTL, bcrypt cost
// rounds). Re-using these values - rather than re-reading the env vars - keeps a
// single source of truth for auth configuration across the whole application.
const authConfig = require('./authConfig');

// ---------------------------------------------------------------------------
// HTTP port.
// ---------------------------------------------------------------------------
// Parse PORT as a base-10 integer with a NaN-safe fallback of 3000. This
// guarantees `port` is always a number (never a string or NaN), which is what
// app.listen() expects, even when PORT is unset or non-numeric.
const parsedPort = parseInt(process.env.PORT, 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

// ---------------------------------------------------------------------------
// Runtime environment name.
// ---------------------------------------------------------------------------
// NODE_ENV is a conventional Node.js variable that is not necessarily present in
// .env.example; default it to 'development'. `nodeEnv` is exposed as an alias of
// `env` so consumers can use either name interchangeably.
const env = process.env.NODE_ENV || 'development';

/**
 * Frozen, typed runtime configuration for the Society Management API.
 *
 * The property names below form a stable contract consumed by src/server.js
 * (`config.port`), src/app.js, and the authentication/reporting layers
 * (`config.jwt`, `config.bcryptRounds`); they must not be renamed. Both the
 * top-level object and the nested `jwt` object are frozen to prevent accidental
 * mutation at runtime.
 *
 * @typedef  {Object} AppConfig
 * @property {number}           port         - HTTP port for app.listen (default 3000).
 * @property {string}           env          - Runtime environment name (default 'development').
 * @property {string}           nodeEnv      - Alias of `env` for consumer convenience.
 * @property {Object}           jwt          - JWT settings (frozen).
 * @property {string|undefined} jwt.secret   - JWT signing/verification secret (from authConfig; no default).
 * @property {string}           jwt.expiresIn- Token lifetime for jsonwebtoken `expiresIn` (from authConfig; default '1h').
 * @property {number}           bcryptRounds - bcrypt salt rounds (from authConfig; integer, default 10).
 *
 * @type {Readonly<AppConfig>}
 */
module.exports = Object.freeze({
  port,
  env,
  nodeEnv: env,
  jwt: Object.freeze({
    secret: authConfig.jwtSecret,
    expiresIn: authConfig.jwtExpiresIn,
  }),
  bcryptRounds: authConfig.bcryptRounds,
});
