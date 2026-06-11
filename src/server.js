// server.js - HTTP bootstrap / runtime entry point for the Society Management API.
//
// RUNTIME ENTRY POINT (AAP 0.5.1 Group 1 / 0.5.2). This is the file that
// `node src/server.js` runs; the root package.json points at it via both
// `"main": "src/server.js"` and `"scripts": { "start": "node src/server.js" }`.
// Its single job is to take the fully-assembled Express application and bind it to
// a TCP port so the HTTP API becomes reachable. Before this file existed the
// repository had NO runnable entry point; together with src/app.js it gives the
// project a runtime (acceptance criterion C4) without disturbing any prior content.
//
// THE ONE AND ONLY `listen` SEAM (critical design constraint - AAP 0.2.2 / 0.5.2).
// src/app.js deliberately builds and EXPORTS the configured `app` without ever
// calling `listen`; binding a socket is the sole responsibility of THIS module.
// Concentrating the listen call here is exactly what lets the Supertest
// integration tests `require('../../src/app')` and drive the routes in-process,
// without binding a port or racing on a socket. Therefore `app.listen(...)` must
// appear exactly once in the whole codebase, and it lives here.
//
// THIN BY DESIGN. This file contains bootstrap concerns only: import the app,
// import the central config, resolve the port, start listening, and wire a few
// process-level lifecycle handlers for clean startup/shutdown logging. It holds NO
// business logic, NO route definitions, and NO middleware - all of that belongs to
// src/app.js and the feature layers it composes.
//
// STRICTLY ADDITIVE (non-regression mandate - AAP 0.1.2 / 0.6.2, criteria C1/C2).
// This is a net-new CommonJS module. It requires ONLY new feature modules it is
// allowed to depend on - ./app and ./config for bootstrap, plus ./utils/passwordUtils
// solely so graceful shutdown can terminate that module's bcrypt worker-thread pool -
// and never imports, references, or mutates any pre-existing read-only scaffold module
// (the synthetic `file_*.js` / `filler.js` padding files), which remain byte-identical
// and standalone.
//
// WORKER-POOL LIFECYCLE. The password-hashing helper (src/utils/passwordUtils.js) runs
// bcrypt work in a small pool of worker threads to keep the event loop responsive
// under concurrent auth load. Those workers are unref()'d when idle, so they never
// block process exit on their own; nonetheless, the graceful-shutdown path below
// explicitly terminates the pool (passwordUtils.shutdown()) after the HTTP server has
// drained, for a clean, deterministic teardown with no lingering threads.
//
// CONFIG OWNERSHIP. src/config/index.js performs the application's single dotenv
// load and exposes a frozen, typed config object. This module therefore does NOT
// call dotenv itself; it simply reads the already-resolved `config.port`.
//
// MODULE SYSTEM: CommonJS only (`require` / `module.exports`); never ESM.

'use strict';

// ---------------------------------------------------------------------------
// Internal dependencies (the ONLY two modules this entry point is allowed to use).
// Both expose a single default export via `module.exports`, so a plain
// `const X = require(...)` binds exactly what is needed - no destructuring.
// ---------------------------------------------------------------------------

// The fully-configured Express application. It has every router and middleware
// already mounted but is NOT yet listening - we start it below. `app.listen()`
// is a standard Express method that returns a Node `http.Server` instance, which
// we capture so the lifecycle handlers can shut it down gracefully.
const app = require('./app');

// The frozen, central runtime configuration (single source of config truth). We
// read `config.port` (already parsed to a number with a NaN-safe default of 3000)
// and `config.nodeEnv` (for an informative startup log). config owns the one-time
// dotenv load, so we intentionally do not touch dotenv here.
const config = require('./config');

// The password-hashing helper, imported here for ONE reason only: lifecycle cleanup.
// It manages a pool of bcrypt worker threads; `passwordUtils.shutdown()` terminates
// that pool during graceful shutdown so the process tears down deterministically.
// No hashing logic lives here - this module never calls hash()/compare().
const passwordUtils = require('./utils/passwordUtils');

// ---------------------------------------------------------------------------
// Resolve the HTTP port.
// ---------------------------------------------------------------------------
// Prefer the typed value from the central config. The additional `process.env.PORT`
// and literal `3000` fallbacks are purely defensive: `config.port` is already
// guaranteed to be a number, so in normal operation the first operand wins. This
// mirrors the documented contract in .env.example (PORT, default 3000) and keeps
// the port out of any hardcoded divergent value.
const PORT = config.port || process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Start the HTTP server (the single `app.listen` call in the codebase).
// ---------------------------------------------------------------------------
// `app.listen` binds the resolved port and returns the underlying http.Server,
// which we retain for the 'listening' / 'error' handlers and graceful shutdown.
//
// NOTE: we deliberately do NOT pass a callback to `app.listen`. Express's
// `app.listen` wraps any callback you pass and registers it on BOTH the
// 'listening' AND the 'error' events (it does `server.once('error', cb)` in
// addition to the listen callback). That means a passed callback would fire on a
// failed bind too - printing a misleading "listening" banner immediately before an
// EADDRINUSE/EACCES failure. Subscribing to the 'listening' event directly keeps
// success and failure strictly mutually exclusive: the success banner is emitted
// ONLY on a genuine successful bind, and the 'error' handler ONLY on failure.
const server = app.listen(PORT);

// Success path: fires exactly once when the socket is bound and the server is
// accepting connections. We read the actually-bound port from `server.address()`
// (which reflects the real port even when PORT=0 requests an ephemeral one) and
// fall back to the resolved PORT for non-TCP edge cases.
server.on('listening', () => {
  const address = server.address();
  const boundPort = address && typeof address === 'object' ? address.port : PORT;
  console.log(`[server] Society Management API listening on port ${boundPort} (env: ${config.nodeEnv})`);
  // Surface the available route bases for operator convenience (boot verification).
  console.log('[server] Routes: GET /health | /api/auth/* (Login) | /api/reports/* (Reporting)');
});

// Failure path: surface listen-time failures (e.g., EADDRINUSE, EACCES) with a
// clear message instead of an opaque stack trace, then exit non-zero so process
// supervisors can react. This handler is scoped to the server socket only.
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[server] port ${PORT} is already in use - is another instance running?`);
  } else if (err && err.code === 'EACCES') {
    console.error(`[server] insufficient privileges to bind port ${PORT}.`);
  } else {
    console.error('[server] failed to start HTTP server:', err);
  }
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Process lifecycle handlers (minimal, dependency-free robustness).
// ---------------------------------------------------------------------------
// Keep these intentionally small: they log clearly and shut the server down
// cleanly. A one-shot guard prevents re-entrancy if multiple signals/errors
// arrive together, and an unref()'d safety timer force-exits if connections
// refuse to drain so the process can never hang indefinitely on shutdown.
let shuttingDown = false;

/**
 * Close the HTTP server gracefully, then exit with the given code.
 *
 * @param {string} reason   Human-readable trigger (signal name or error label).
 * @param {number} exitCode Process exit code (0 for signals, 1 for fatal errors).
 */
function gracefulShutdown(reason, exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  console.log(`[server] ${reason} received - shutting down gracefully...`);

  // Stop accepting new connections and wait for in-flight requests to finish.
  server.close((closeErr) => {
    // The HTTP server has now drained its connections (or failed to close). In-flight
    // auth requests - the only thing that schedules bcrypt work - have therefore
    // completed, so it is safe to terminate the worker-thread pool. We preserve the
    // intended exit code (1 if the close itself errored, otherwise the caller's code)
    // and ALWAYS exit after attempting pool teardown, so a teardown hiccup can never
    // wedge the shutdown.
    const finalCode = closeErr ? 1 : exitCode;
    if (closeErr) {
      console.error('[server] error while closing HTTP server:', closeErr);
    } else {
      console.log('[server] HTTP server closed cleanly.');
    }

    passwordUtils.shutdown()
      .then(() => {
        console.log('[server] password worker pool terminated.');
      })
      .catch((poolErr) => {
        console.error('[server] error terminating password worker pool:', poolErr);
      })
      .finally(() => {
        process.exit(finalCode);
      });
  });

  // Safety net: if open connections keep the server from closing in time, force
  // the exit. `unref()` ensures this timer itself does not keep the event loop
  // alive once everything else has finished.
  setTimeout(() => {
    console.error('[server] graceful shutdown timed out - forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

// Termination signals from orchestrators / Ctrl-C: shut down with success code.
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

// Unexpected fatal conditions: log and shut down with a failure code. After an
// uncaught exception the process is in an undefined state, so exiting is the
// correct, well-established Node.js behavior rather than attempting to continue.
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled promise rejection:', reason);
  gracefulShutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
  gracefulShutdown('uncaughtException', 1);
});
