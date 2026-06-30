'use strict';

/**
 * src/utils/logger.js
 *
 * Minimal, dependency-free logging helper for the Society Management backend
 * (Login + Reporting feature). It wraps the built-in Node.js `console` object
 * and prefixes every message with an ISO-8601 timestamp and an uppercase level
 * label, giving the new feature a single, consistent log format.
 *
 * Consumed by `src/middleware/requestLogger.js`, `src/middleware/errorHandler.js`,
 * and optionally `src/server.js`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DESIGN CONSTRAINTS (per Technical Specification / Agent Action Plan):
 *  - VANILLA ONLY: this module requires NO npm package and NO other repo file.
 *    It uses only the global `console` and `Date`. (AAP §0.3.1 keeps logging
 *    deliberately dependency-free.)
 *  - CommonJS: the public API is exposed via `module.exports`. No ESM syntax.
 *  - SELF-CONTAINED: it must not load configuration or any sibling module.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SECURITY (AAP §0.8 / acceptance criterion C6): NEVER pass secrets, tokens,
 * passwords, password hashes, raw request bodies, or `Authorization` headers to
 * these functions. This helper is a PURE PASS-THROUGH: it does not inspect,
 * serialize, redact, or otherwise transform the arguments it receives — it
 * simply forwards them to the underlying `console` method. Avoiding the logging
 * of sensitive data is therefore the responsibility of every caller.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Output format (consistent across all levels):
 *   [<ISO-8601 timestamp>] [<LEVEL>] <...caller arguments>
 * Example:
 *   [2026-06-30T08:15:42.123Z] [INFO] server listening on port 3000
 *
 * Usage (CommonJS):
 *   // Load this module with Node's standard module loader, then call a helper.
 *   //   const logger = ...('./utils/logger');
 *   logger.info('server started', { port: 3000 });
 *   logger.warn('cache miss for key', key);
 *   logger.error('request failed', err);
 */

/**
 * Build the standard log-line prefix.
 *
 * The timestamp is generated at call time (inside this function) so that it
 * reflects the exact moment the log entry is emitted rather than the moment the
 * module was loaded. `Date#toISOString` always yields a UTC ISO-8601 string
 * (e.g. `2026-06-30T08:15:42.123Z`).
 *
 * @param {string} level - Uppercase level label (e.g. 'INFO', 'WARN', 'ERROR').
 * @returns {string} A prefix of the shape `[<ISO timestamp>] [<LEVEL>]`.
 */
function prefix(level) {
  return `[${new Date().toISOString()}] [${level}]`;
}

/**
 * Log an informational message. Forwards every argument to `console.log`.
 *
 * @param {...*} args - Arbitrary values to log (message, objects, etc.).
 *                      Do NOT pass secrets/tokens/passwords/hashes.
 * @returns {void}
 */
function info(...args) {
  console.log(prefix('INFO'), ...args);
}

/**
 * Log a warning. Forwards every argument to `console.warn`.
 *
 * @param {...*} args - Arbitrary values to log (message, objects, etc.).
 *                      Do NOT pass secrets/tokens/passwords/hashes.
 * @returns {void}
 */
function warn(...args) {
  console.warn(prefix('WARN'), ...args);
}

/**
 * Log an error. Forwards every argument to `console.error`.
 *
 * @param {...*} args - Arbitrary values to log (message, Error, etc.).
 *                      Do NOT pass secrets/tokens/passwords/hashes.
 * @returns {void}
 */
function error(...args) {
  console.error(prefix('ERROR'), ...args);
}

/**
 * Log a debug message. Forwards every argument to `console.debug`
 * (which, in Node.js, writes to stdout like `console.log`). Optional helper —
 * provided for convenience and kept fully vanilla (no external dependency).
 *
 * @param {...*} args - Arbitrary values to log (message, objects, etc.).
 *                      Do NOT pass secrets/tokens/passwords/hashes.
 * @returns {void}
 */
function debug(...args) {
  console.debug(prefix('DEBUG'), ...args);
}

module.exports = { info, warn, error, debug };
