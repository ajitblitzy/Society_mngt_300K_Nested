'use strict';

/**
 * src/config/index.js
 *
 * Central runtime configuration for the Society Management API
 * (Login + Reporting feature). This module is the SINGLE SOURCE OF CONFIG
 * TRUTH for the application: it performs the one canonical load of environment
 * variables via `dotenv` and exposes a frozen (immutable), typed configuration
 * object that every other layer reads from.
 *
 * Consumers:
 *   - `src/server.js`              -> reads `config.port` to bind the HTTP server.
 *   - `src/app.js`                 -> may read `config.env` / `config.nodeEnv`.
 *   - auth/report services,
 *     middleware and utilities     -> read `config.jwt.secret`, `config.jwt.expiresIn`,
 *                                     and `config.bcryptRounds`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DESIGN CONSTRAINTS (per Technical Specification / Agent Action Plan):
 *  - CANONICAL SINGLE LOAD: `dotenv.config()` is invoked exactly once here, and
 *    ONLY here. `src/config/authConfig.js` is a PURE env-normalization module
 *    that does NOT load dotenv; this file loads dotenv BEFORE requiring it, so
 *    the whole application performs exactly one `.env` load (no duplicate dotenv
 *    side effects or repeated "injected env" log lines).
 *  - SINGLE SOURCE FOR AUTH SETTINGS: the JWT and bcrypt values are NOT re-read
 *    from `process.env` here; they are re-exported from `./authConfig`, so there
 *    is exactly one place that interprets those variables.
 *  - IMMUTABLE: the exported object (and its nested `jwt` object) is frozen so
 *    configuration cannot be mutated at runtime.
 *  - CommonJS only (`require` / `module.exports`); no ESM `import` / `export`.
 *  - Additive feature wiring only: this module never imports or references any
 *    existing `file_*.js` / `filler.js` scaffold module.
 *  - No database / connection settings (the feature uses an in-memory data
 *    layer — AAP §0.6.2).
 *  - Strictly one-way dependency: `index.js` -> `authConfig.js`. This module is
 *    never required by `authConfig.js` (no circular import).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Environment variables (names match `.env.example` character-for-character):
 *   - PORT            HTTP port for `app.listen()`              (default: 3000)
 *   - NODE_ENV        runtime environment label                (default: 'development')
 *   - JWT_SECRET      JWT signing secret  (via authConfig — no default)
 *   - JWT_EXPIRES_IN  JWT token lifetime  (via authConfig — default: '1h')
 *   - BCRYPT_ROUNDS   bcrypt cost factor  (via authConfig — default: 10)
 *
 * Exported shape:
 *   {
 *     port: number,
 *     env: string,
 *     nodeEnv: string,        // alias of `env`
 *     jwt: { secret: string|undefined, expiresIn: string },
 *     bcryptRounds: number,
 *   }
 *
 * Module system: CommonJS (`require` / `module.exports`). No ESM.
 */

// Canonical single load point for the whole application. `dotenv.config()`
// reads the local `.env` file (when present) into `process.env`. It is invoked
// exactly ONCE here — and nowhere else — and crucially BEFORE `./authConfig` is
// required just below, so the pure `authConfig` module observes a fully
// populated `process.env`. Because no other module loads dotenv, there is a
// single `.env` load with no duplicate dotenv "injected env" log lines.
require('dotenv').config();

// Re-use the already-normalized JWT/bcrypt settings rather than re-reading those
// environment variables here, keeping ONE authoritative source for auth config.
// Dependency direction is strictly one-way: index.js -> authConfig.js.
const authConfig = require('./authConfig');

/**
 * HTTP port the server binds to.
 *
 * `parseInt` is guarded with `Number.isNaN` so that a missing or non-numeric
 * `PORT` falls back to the documented default of `3000`. The result is always a
 * `number`, so `app.listen(config.port)` receives the correct type.
 */
const parsedPort = parseInt(process.env.PORT, 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

/**
 * Runtime environment label (e.g. 'development', 'test', 'production').
 *
 * `NODE_ENV` is a conventional Node.js variable and is not required to be
 * present in `.env.example`, so it defaults to `'development'`.
 */
const env = process.env.NODE_ENV || 'development';

/**
 * The frozen, typed configuration object — the single source of config truth.
 *
 * The nested `jwt` object is frozen as well, so the entire structure is
 * immutable at runtime. The JWT secret/expiry and bcrypt rounds are sourced
 * exclusively from `authConfig`, ensuring a single interpretation of those
 * environment variables across the application.
 */
module.exports = Object.freeze({
  port,
  env,
  // `nodeEnv` is a convenience alias of `env` so consumers may use either name.
  nodeEnv: env,
  jwt: Object.freeze({
    secret: authConfig.jwtSecret,
    expiresIn: authConfig.jwtExpiresIn,
  }),
  bcryptRounds: authConfig.bcryptRounds,
});
