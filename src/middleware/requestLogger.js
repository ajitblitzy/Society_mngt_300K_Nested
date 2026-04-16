/**
 * Morgan-to-Winston HTTP Request Logging Bridge
 *
 * Configures Morgan (HTTP request logger) with environment-aware format
 * selection and pipes all HTTP request log output through a custom stream
 * into the Winston logger. This ensures unified log management where both
 * application-level logs (Winston) and HTTP request logs (Morgan) flow
 * through the same logging infrastructure.
 *
 * Log flow:
 *   HTTP request → Morgan captures request/response details
 *     → Morgan writes to custom stream
 *       → stream.write() calls logger.http()
 *         → Winston processes via configured transports
 *
 * Format strategy:
 * ┌─────────────┬────────────┬─────────────────────────────────────────────────┐
 * │ Environment │ Format     │ Output                                          │
 * ├─────────────┼────────────┼─────────────────────────────────────────────────┤
 * │ production  │ combined   │ Apache combined log format (verbose, parseable) │
 * │ development │ dev        │ Concise, colorized status codes                 │
 * └─────────────┴────────────┴─────────────────────────────────────────────────┘
 *
 * Consumed by: src/app.js — registered via app.use(requestLogger) after body
 * parsing and before rate limiting and routes.
 *
 * @module middleware/requestLogger
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. External dependency — Morgan HTTP request logger middleware (^1.10.1)
// ---------------------------------------------------------------------------
const morgan = require('morgan');

// ---------------------------------------------------------------------------
// 2. Internal dependency — Winston logger singleton
//    Provides logger.http() used by the custom stream to pipe Morgan output
//    into the Winston logging infrastructure at the 'http' log level.
// ---------------------------------------------------------------------------
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// 3. Internal dependency — Centralized environment configuration
//    Provides config.nodeEnv for environment-based Morgan format selection.
//    Environment detection goes through the config module — never hardcoded.
// ---------------------------------------------------------------------------
const config = require('../config');

// ---------------------------------------------------------------------------
// 4. Custom Winston stream — bridges Morgan output into Winston
// ---------------------------------------------------------------------------

/**
 * Custom writable stream object consumed by Morgan as its output destination.
 *
 * Morgan appends a trailing newline character ('\n') to every log line it
 * produces. The .trim() call strips that newline so that log entries remain
 * clean and consistently formatted when processed by Winston transports.
 *
 * The 'http' log level (priority 3 in Winston's npm levels) is the
 * semantically appropriate level for HTTP request/response log entries:
 *   { error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6 }
 *
 * HTTP logs are visible when LOG_LEVEL is set to 'http', 'verbose', 'debug',
 * or 'silly'. In development (LOG_LEVEL=debug), they are visible by default.
 * In production (LOG_LEVEL=info), they are filtered unless explicitly enabled.
 *
 * @type {{ write: Function }}
 */
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// ---------------------------------------------------------------------------
// 5. Morgan middleware configuration — environment-aware format selection
// ---------------------------------------------------------------------------

/**
 * Configured Morgan middleware instance ready for Express registration.
 *
 * Format selection:
 *   - 'combined' (production): Apache combined log format including
 *     remote-addr, remote-user, date, method, url, http-version, status,
 *     content-length, referrer, and user-agent. Ideal for production log
 *     analysis, parsing by log aggregation tools, and compliance auditing.
 *
 *   - 'dev' (development/staging/all others): Concise output with
 *     method, url, status (colorized by response status class),
 *     response-time, and content-length. Optimised for developer readability
 *     during local development and debugging.
 *
 * The { stream } option redirects Morgan's output from stdout to the custom
 * Winston stream defined above, ensuring all HTTP logs are captured, formatted,
 * and routed through Winston's transport pipeline.
 *
 * @type {Function} Express middleware with signature (req, res, next)
 */
const requestLogger = morgan(
  config.nodeEnv === 'production' ? 'combined' : 'dev',
  { stream }
);

// ---------------------------------------------------------------------------
// 6. Module export — the configured Morgan middleware instance
// ---------------------------------------------------------------------------
module.exports = requestLogger;
