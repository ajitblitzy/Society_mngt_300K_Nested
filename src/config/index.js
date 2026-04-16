/**
 * Centralized Environment Configuration Module
 *
 * This module is the SINGLE source of truth for all environment-driven settings
 * in the application. It loads variables from the `.env` file via the `dotenv`
 * package and exports a structured, validated configuration object consumed by
 * every other module in the project (server.js, app.js, logger, middleware, etc.).
 *
 * IMPORTANT: `require('dotenv').config()` MUST remain the very first executable
 * statement so that all `process.env` reads below pick up values defined in `.env`.
 *
 * This file has ZERO internal project dependencies — it sits at the bottom of the
 * dependency graph and is imported by virtually every other module.
 *
 * @module config
 */

// ---------------------------------------------------------------------------
// 1. Load .env file into process.env — MUST be the first executable statement
// ---------------------------------------------------------------------------
require('dotenv').config();

// ---------------------------------------------------------------------------
// 2. Resolve NODE_ENV first — other defaults (e.g. logLevel) depend on it
// ---------------------------------------------------------------------------
const nodeEnv = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// 3. Build and export the configuration object
// ---------------------------------------------------------------------------
module.exports = {
  /**
   * HTTP port the server listens on.
   * Sourced from the PORT environment variable; defaults to 3000 for local dev.
   * @type {number}
   */
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Current runtime environment identifier.
   * Accepted values: 'development', 'staging', 'production'.
   * Defaults to 'development' when NODE_ENV is not set.
   * @type {string}
   */
  nodeEnv,

  /**
   * Minimum severity level for Winston log output.
   * Sourced from LOG_LEVEL; when unset, defaults to 'debug' in development
   * and 'info' in production to reduce noise in prod log streams.
   * Valid Winston levels: error, warn, info, http, verbose, debug, silly.
   * @type {string}
   */
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),

  /**
   * Allowed CORS origin(s) passed to the `cors` middleware.
   * Defaults to '*' (all origins) for development convenience.
   * In production, set to the specific domain(s) that should be permitted.
   * @type {string}
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',

  /**
   * Time window (in milliseconds) used by express-rate-limit to track requests.
   * Defaults to 900 000 ms (15 minutes).
   * @type {number}
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests allowed per IP within the rate-limit window.
   * Defaults to 100 requests per window.
   * @type {number}
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
};
