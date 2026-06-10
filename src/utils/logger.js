// logger.js - Minimal, dependency-free logging helper (no external packages, no I/O wiring).
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login + Reporting feature's dependency graph, alongside the other src/utils
// helpers. It is a thin wrapper around the Node.js global `console` object that
// stamps every emitted line with an ISO-8601 UTC timestamp and an uppercase level
// label, giving the feature one consistent, greppable log format.
//
// ZERO DEPENDENCIES BY DESIGN (AAP 0.3.1 - logging stays vanilla): this file
// imports NOTHING. It requires no npm package and no other repository module, and
// it deliberately does NOT load application config - keeping it safe to use at the
// earliest stages of boot, before configuration is available. It is synchronous,
// stateless, and side-effect-free apart from writing to the console streams.
//
// CommonJS only: wiring is via `module.exports` (no ESM `import`/`export`). The
// existing scaffold `file_*.js` / `src/utils/filler.js` modules are read-only
// filler and are neither referenced nor imported here (AAP 0.6.2).
//
// Consumers load this module by its utils path '../utils/logger':
//   - src/middleware/requestLogger.js -> per-request access logging.
//   - src/middleware/errorHandler.js  -> centralized error logging.
//   - src/server.js (optional)        -> boot / lifecycle messages.
//
// SECURITY (AAP 0.8 / C6 - NEVER log secrets): do NOT pass secrets, JWTs/tokens,
// passwords, password hashes, raw `Authorization` headers, or entire request
// bodies to these functions. This helper is a transparent pass-through to
// `console`; it does NOT (and must not) inspect, redact, or auto-serialize its
// arguments looking for sensitive data. Avoiding sensitive material is therefore
// the caller's responsibility at each call site.

'use strict';

/**
 * Build the leading prefix shared by every log line emitted by this module.
 *
 * The timestamp is produced with `new Date().toISOString()` at the moment this
 * function runs (i.e. at call time, never cached at module load), so it always
 * reflects when the log statement actually executed. `toISOString()` yields a
 * fixed-width ISO-8601 UTC string such as `2026-06-10T18:20:00.000Z`, which sorts
 * lexicographically in chronological order and is easy to parse downstream.
 *
 * The level label is emitted verbatim and is expected to already be an uppercase
 * token (`INFO`, `WARN`, `ERROR`, `DEBUG`). Keeping the two bracketed segments in
 * a single, consistent shape - `[<ISO timestamp>] [<LEVEL>]` - lets log consumers
 * reliably split or filter on either field.
 *
 * @param {string} level - Uppercase level label to embed (e.g. `'INFO'`).
 * @returns {string} The formatted prefix, e.g. `[2026-06-10T18:20:00.000Z] [INFO]`.
 */
function prefix(level) {
  return `[${new Date().toISOString()}] [${level}]`;
}

/**
 * Emit an informational log line on the standard output stream.
 *
 * Delegates to `console.log` (stdout), forwarding the shared timestamped prefix
 * followed by every caller-supplied argument unchanged. Because the arguments are
 * spread straight through, callers may pass a message plus structured context
 * (objects, arrays, `Error` instances) and rely on Node's normal `console`
 * formatting - this helper adds the prefix only and never reshapes the payload.
 *
 * Use for routine, expected lifecycle events (server started, request handled,
 * report generated). Do not pass sensitive values (see the file-level security
 * note).
 *
 * @param {...*} args - Variadic values forwarded verbatim to `console.log`.
 * @returns {void}
 */
function info(...args) {
  console.log(prefix('INFO'), ...args);
}

/**
 * Emit a warning log line on the standard error stream.
 *
 * Delegates to `console.warn` (stderr), forwarding the shared timestamped prefix
 * followed by every caller-supplied argument unchanged. Use for recoverable or
 * suspicious conditions that do not abort the operation - for example a rejected
 * login attempt, a near-lockout threshold, or a deprecated request shape.
 *
 * @param {...*} args - Variadic values forwarded verbatim to `console.warn`.
 * @returns {void}
 */
function warn(...args) {
  console.warn(prefix('WARN'), ...args);
}

/**
 * Emit an error log line on the standard error stream.
 *
 * Delegates to `console.error` (stderr), forwarding the shared timestamped prefix
 * followed by every caller-supplied argument unchanged. Use for failures and
 * forwarded exceptions (e.g. from the centralized error handler). Passing an
 * `Error` instance is supported and recommended so its message and stack are
 * rendered by Node's default formatting.
 *
 * @param {...*} args - Variadic values forwarded verbatim to `console.error`.
 * @returns {void}
 */
function error(...args) {
  console.error(prefix('ERROR'), ...args);
}

/**
 * Emit a debug/diagnostic log line (optional convenience beyond the mandatory three).
 *
 * Delegates to `console.debug`, which in Node.js is an alias of `console.log`
 * (stdout). Intended for verbose, developer-facing diagnostics during local
 * troubleshooting. Provided purely with built-ins - it adds no dependency. The
 * same security note applies: never pass secrets here either.
 *
 * @param {...*} args - Variadic values forwarded verbatim to `console.debug`.
 * @returns {void}
 */
function debug(...args) {
  console.debug(prefix('DEBUG'), ...args);
}

/**
 * The default logger object. In CommonJS, `module.exports` itself is the default
 * export, so `const logger = require('../utils/logger')` yields this object with
 * `.info`, `.warn`, `.error`, and `.debug` methods available directly.
 *
 * @type {{ info: Function, warn: Function, error: Function, debug: Function }}
 */
const logger = { info, warn, error, debug };

// Export the assembled object as the module's default export. The same object's
// own properties (`info`, `warn`, `error`, `debug`) double as named exports, so
// both `const logger = require('../utils/logger')` and
// `const { info, warn, error } = require('../utils/logger')` resolve correctly.
module.exports = logger;

// Convenience named alias so callers preferring `const { logger } = require(...)`
// also receive the same object. Harmless self-reference; keeps every common
// import style working across the feature's modules.
module.exports.logger = logger;
