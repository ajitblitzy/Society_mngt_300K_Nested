// server.js - HTTP bootstrap / runtime entry point (imports the configured app and binds the port).
'use strict';

/**
 * src/server.js
 *
 * THE runtime entry point of the Society Management backend (Login + Reporting
 * feature). It is invoked via `node src/server.js` — the root `package.json`
 * `main` field and both the `start` and `dev` scripts point here. This module
 * performs exactly one job: take the fully-assembled Express application
 * exported by `./app`, resolve the listening port from the central
 * configuration, and bind the HTTP server by calling `app.listen(...)`.
 *
 * ── Why bootstrap is separated from app assembly ────────────────────────────
 * `src/app.js` builds and exports the configured Express `app` WITHOUT ever
 * calling `listen`. Starting the HTTP server is intentionally isolated here so
 * that the Supertest HTTP integration tests can `require('../../src/app')` and
 * drive the application in-process — without the process ever binding a real TCP
 * port. This file is therefore the ONE AND ONLY place in the codebase where
 * `app.listen(...)` is invoked (Technical Spec acceptance criteria C3/C4,
 * AAP §0.5.2).
 *
 * ── Configuration source ────────────────────────────────────────────────────
 * The listening port comes exclusively from `./config` (src/config/index.js),
 * which performs the application's single canonical `dotenv` load and exposes a
 * frozen, typed config object. `config.port` is already a validated number
 * (env var `PORT`, documented in `.env.example`, default `3000`). `dotenv` is
 * deliberately NOT loaded here — requiring `./config` (directly, and
 * transitively via `./app`) is what populates `process.env`.
 *
 * ── Scope / non-regression ──────────────────────────────────────────────────
 * Thin by design: import the app, import the config, listen. No routes, no
 * middleware, and no business logic live here. CommonJS only (`require`). This
 * file is net-new and STRICTLY ADDITIVE — it does not import, reference, or
 * mutate any pre-existing `file_*.js` / `filler.js` scaffold module, preserving
 * the non-regression mandate (AAP §0.6 / acceptance criterion C1).
 *
 * @module server
 */

// ── In-repository dependencies (verified depends_on_files whitelist) ────────
// The fully-configured Express application. Requiring it also transitively
// requires `./config`, which performs the single canonical `dotenv` load, so
// `process.env` is fully populated by the time this module reads any config.
const app = require('./app');

// Central, frozen, typed configuration (the single source of config truth).
// Exposes the already-validated numeric `port`. The bare `require('./config')`
// resolves to `src/config/index.js`; it is idempotent and returns the cached
// frozen object (no second `dotenv` load).
const config = require('./config');

// ── Port resolution ──────────────────────────────────────────────────────────
// Prefer the typed value from the central config (always a valid number,
// defaulting to 3000). The subsequent fallbacks are purely defensive so the
// process can still boot if the config object were ever reshaped: an explicit
// `PORT` environment variable, then the documented default of 3000. The env var
// name (`PORT`) matches `.env.example` and `src/config/index.js` exactly.
const PORT = config.port || process.env.PORT || 3000;

// ── Start the HTTP server ─────────────────────────────────────────────────────
// This is the SOLE `app.listen(...)` call in the entire codebase. The returned
// `http.Server` instance is retained so it can be closed gracefully on the
// shutdown signals handled below.
const server = app.listen(PORT, () => {
  // Concise, secret-free startup banner for operator convenience. The route
  // bases below mirror the mounts performed in `src/app.js`.
  console.log(`Server listening on port ${PORT} (env: ${config.env})`);
  console.log('  - Auth endpoints   -> /api/auth');
  console.log('  - Report endpoints -> /api/reports');
});

// Surface bind-time failures (e.g. EADDRINUSE, EACCES) with a clear, actionable
// message instead of an opaque stack trace, then exit non-zero so a process
// supervisor can react. Listen errors are emitted as `error` events on the
// server (they are not passed to the `listen` callback above).
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is the server already running?`);
  } else if (err && err.code === 'EACCES') {
    console.error(`Insufficient privileges to bind port ${PORT}. Try a port above 1024.`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});

/**
 * Gracefully shut the HTTP server down in response to a termination signal.
 *
 * Stops accepting new connections and lets in-flight requests drain before the
 * process exits cleanly. A short, `unref()`-ed safety timer forces exit if the
 * server fails to close in time, so the process never hangs in orchestrated
 * environments (containers, CI).
 *
 * @param {string} signal - The POSIX signal that triggered the shutdown.
 * @returns {void}
 */
function shutdown(signal) {
  console.log(`\n${signal} received - shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
      return;
    }
    console.log('HTTP server closed. Goodbye.');
    process.exit(0);
  });

  // Failsafe: never let a stuck connection block shutdown indefinitely. `unref()`
  // ensures this timer itself does not keep the event loop alive.
  setTimeout(() => {
    console.error('Forced shutdown after timeout (open connections did not drain).');
    process.exit(1);
  }, 10000).unref();
}

// Register graceful-shutdown handlers for the standard termination signals.
['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// ── Last-resort process safety nets ───────────────────────────────────────────
// Express 5 forwards rejected async-handler promises to the centralized error
// handler in `src/app.js`, so these guards catch only truly unexpected,
// out-of-band failures. We log with enough detail to diagnose, then exit
// non-zero so a supervisor can restart the process in a known-good state
// (crash-only design).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// ── Export ───────────────────────────────────────────────────────────────────
// Export the `http.Server` instance. No in-repository module imports this entry
// point (the integration tests drive the exported `app` instead), but exposing
// the bound server is a harmless, standard convenience that lets tooling or an
// embedding process close it programmatically. It does NOT introduce a second
// `listen` call or any business logic.
module.exports = server;
