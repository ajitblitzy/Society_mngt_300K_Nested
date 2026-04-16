/**
 * Winston Logger Factory Module
 *
 * Creates and exports a singleton Winston logger instance used throughout the
 * entire application for structured, environment-aware logging.
 *
 * Transport strategy:
 * ┌─────────────┬───────────────────────────┬─────────────────────────────────────┬───────────┐
 * │ Environment │ Console Transport          │ File Transports                     │ Log Level │
 * ├─────────────┼───────────────────────────┼─────────────────────────────────────┼───────────┤
 * │ development │ Enabled (colorized printf) │ Disabled                            │ debug     │
 * │ production  │ Enabled (JSON)             │ logs/error.log + logs/combined.log  │ info      │
 * └─────────────┴───────────────────────────┴─────────────────────────────────────┴───────────┘
 *
 * Consumed by: server.js, src/middleware/errorHandler.js, src/middleware/requestLogger.js
 *
 * @module utils/logger
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. External dependency — Winston structured logging library (^3.19.0)
// ---------------------------------------------------------------------------
const winston = require('winston');

// ---------------------------------------------------------------------------
// 2. Internal dependency — Centralized environment configuration
//    Provides config.nodeEnv and config.logLevel so we never hardcode env values
// ---------------------------------------------------------------------------
const config = require('../config');

// ---------------------------------------------------------------------------
// 3. Format definitions — environment-specific log formatting pipelines
// ---------------------------------------------------------------------------

/**
 * Development format — colorized, human-readable console output.
 *
 * Pipeline:
 *   1. colorize  → applies ANSI color codes to the entire output (level + message)
 *   2. timestamp → adds a human-readable timestamp (YYYY-MM-DD HH:mm:ss)
 *   3. printf    → custom template string: "TIMESTAMP LEVEL: MESSAGE"
 */
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

/**
 * Production format — structured JSON for machine parsing and log aggregation.
 *
 * Pipeline:
 *   1. timestamp → adds an ISO 8601 timestamp for precise time-series indexing
 *   2. json      → serialises the entire log entry as a JSON object
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// ---------------------------------------------------------------------------
// 4. Transport configuration — built dynamically based on config.nodeEnv
// ---------------------------------------------------------------------------

/**
 * Console transport — ALWAYS present regardless of environment.
 *
 * In development: uses the colorized printf format for developer readability.
 * In production:  uses the JSON format for structured log ingestion.
 */
const transports = [
  new winston.transports.Console({
    format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  }),
];

/**
 * File transports — PRODUCTION ONLY.
 *
 * - logs/error.log    → captures error-level messages exclusively
 * - logs/combined.log → captures ALL messages at the configured level and above
 *
 * Both use the production JSON format for consistent machine-readable output.
 */
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

// ---------------------------------------------------------------------------
// 5. Logger instance creation — singleton for the entire application
// ---------------------------------------------------------------------------

/**
 * The application-wide Winston logger instance.
 *
 * Configuration:
 *   - level:       sourced from config.logLevel (never hardcoded)
 *   - format:      production JSON format as the base/default for file transports
 *   - transports:  dynamically assembled array (console + optional file transports)
 *   - exitOnError: false — the process must NOT exit on handled logging exceptions
 *
 * Exposed methods: info(), error(), warn(), debug(), http()
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: config.logLevel,
  format: productionFormat,
  transports,
  exitOnError: false,
});

// ---------------------------------------------------------------------------
// 6. Stream interface — used by Morgan for HTTP request logging integration
//    (consumed by src/middleware/requestLogger.js)
// ---------------------------------------------------------------------------

/**
 * Writable stream adapter for Morgan HTTP logger.
 *
 * Morgan writes each log line with a trailing newline; we trim it before
 * passing the message to Winston at the 'http' level so that log entries
 * remain clean and consistently formatted.
 *
 * @type {{ write: Function }}
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// ---------------------------------------------------------------------------
// 7. Module export — singleton logger instance
// ---------------------------------------------------------------------------
module.exports = logger;
