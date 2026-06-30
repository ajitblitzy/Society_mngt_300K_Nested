// app.js - Express application composition root (assembles middleware + routers; exports the app WITHOUT listening).
'use strict';

/**
 * src/app.js
 *
 * THE composition root and PRIMARY integration point of the Society Management
 * backend (Login + Reporting feature). This is the single place where the
 * Express application instance is constructed, where JSON body parsing and the
 * cross-cutting request logger are installed, where the two feature routers are
 * mounted, and where the centralized error handler is registered last.
 *
 * ── Why this file exports the app WITHOUT starting a server ─────────────────
 * The fully-configured Express `app` is exported by `module.exports = app`, and
 * the HTTP server is DELIBERATELY NOT started here. Binding a TCP port is the
 * sole responsibility of `src/server.js`, which `require()`s this module and
 * starts the HTTP server on the configured port. Keeping server startup out of
 * this file lets the Supertest HTTP integration tests `require('../../src/app')`
 * and drive the app directly — issuing requests against `/api/auth/*` and
 * `/api/reports/*` without the process ever binding a real port (Technical Spec
 * acceptance criteria C3/C4, AAP §0.5.2). This module therefore never invokes
 * the Express server-start method.
 *
 * ── Middleware / router registration ORDER (significant) ────────────────────
 * Express runs middleware in registration order, so the sequence below is an
 * invariant, not a stylistic choice:
 *   1. express.json()    — parse JSON request bodies BEFORE any handler reads them.
 *   2. requestLogger     — observe EVERY request (installed before the routers).
 *   3. /api/auth router  — authentication endpoints (public + the guarded /me).
 *   4. /api/reports router — reporting endpoints (every route guarded by the auth
 *                            middleware inside that router — Reporting-depends-on-Login).
 *   5. /health (GET)     — trivial, unauthenticated liveness probe.
 *   6. errorHandler      — centralized error -> JSON envelope; MUST be the LAST
 *                          `app.use(...)` so it catches errors thrown or forwarded
 *                          (Express 5 forwards rejected async-handler promises to it
 *                          automatically) by every preceding layer.
 *
 * ── Module system & dependency boundary ────────────────────────────────────
 * CommonJS only (`require` / `module.exports`); no ESM `import`/`export`. The
 * only external dependency required directly here is `express`; every other
 * dependency is an in-repository module from the verified whitelist. This module
 * is net-new and STRICTLY ADDITIVE: it does not import, reference, mutate, or
 * otherwise depend on any pre-existing `file_*.js` / `filler.js` scaffold module
 * (those export nothing and ship only inside `society_mgmt_300k.zip`) — preserving
 * the non-regression mandate (AAP §0.6 / acceptance criteria C1/C2).
 *
 * @module app
 */

// ── External dependency ─────────────────────────────────────────────────────
// Express 5.x web framework. `express.json()` body parsing is built in (no
// separate body-parser package is required).
const express = require('express');

// ── In-repository dependencies (verified depends_on_files whitelist) ────────
// Central typed configuration. Requiring this module performs the application's
// single, canonical `dotenv` load (it reads `.env` into `process.env` exactly
// once). It is intentionally required FIRST — before the routers/controllers/
// services below — so that `process.env` is fully populated before any module in
// the require graph reads an environment-derived value at load time. It never
// binds a port or starts a server. The frozen object it exports exposes
// `{ port, env, nodeEnv, jwt: { secret, expiresIn }, bcryptRounds }`; `config.env`
// is surfaced on the `/health` response below.
const config = require('./config');

// Per-request logging middleware — a function `(req, res, next)` that emits one
// concise, secret-free access-log line after each response finishes. Installed
// before the routers so it observes every inbound request.
const requestLogger = require('./middleware/requestLogger');

// Centralized error-handling middleware — a 4-arity function
// `(err, req, res, next)` that converts thrown/forwarded errors into a consistent
// `{ error: { message, status } }` JSON envelope. Registered LAST.
const errorHandler = require('./middleware/errorHandler');

// Authentication feature router (a single `express.Router()`). Declares
// POST /register, POST /login, POST /logout, and the guarded GET /me. Mounted at
// the `/api/auth` base path below.
const authRoutes = require('./routes/authRoutes');

// Reporting feature router (a single `express.Router()`). Declares GET / (catalog)
// and GET /:type (JSON, or CSV via `?format=csv`); every route inside is guarded
// by the authentication middleware. Mounted at the `/api/reports` base path below.
const reportRoutes = require('./routes/reportRoutes');

// ── Application assembly ─────────────────────────────────────────────────────
// Construct the Express application instance that this module configures and
// exports. It is assembled but NEVER started here (no `listen`).
const app = express();

// Security hardening: suppress the framework's `X-Powered-By: Express` response
// header so the application does not advertise its server technology to clients
// (supports the feature's security baseline, AAP §0.8 / criterion C6). This is a
// settings toggle — not a route and not an `app.use(...)` — so it does not affect
// the middleware ordering invariant or the "error handler is the final
// `app.use`" guarantee documented above.
app.disable('x-powered-by');

// (1) Parse `application/json` request bodies into `req.body`. Registered before
// the feature routers so their controllers receive a populated `req.body`.
app.use(express.json());

// (2) Structured per-request logging. Registered BEFORE the routers so that every
// request — including those that 404 or error out downstream — is observed.
app.use(requestLogger);

// (3) Authentication endpoints, mounted at EXACTLY `/api/auth`. The router-relative
// paths resolve to /api/auth/register, /api/auth/login, /api/auth/logout, and the
// token-guarded /api/auth/me.
app.use('/api/auth', authRoutes);

// (4) Reporting endpoints, mounted at EXACTLY `/api/reports`. Every route within
// this router is access-controlled by the authentication middleware, realizing the
// Reporting-depends-on-Login prerequisite (AAP §0.4.1).
app.use('/api/reports', reportRoutes);

// (5) Lightweight, unauthenticated liveness probe. Useful for container/orchestrator
// health checks and for confirming the app is wired and responding. It exposes only
// a static status and the non-sensitive runtime environment label (never secrets).
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

// (6) Centralized error handler — MUST be the final `app.use(...)` registration so
// it receives errors thrown or forwarded by any preceding middleware or route
// handler. Under Express 5, rejected promises returned by `async` handlers are
// forwarded here automatically, so individual handlers need no try/catch to surface
// failures through this single envelope.
app.use(errorHandler);

// ── Export ───────────────────────────────────────────────────────────────────
// Export the fully-configured application WITHOUT starting it. `src/server.js`
// imports this object and starts the HTTP server on the configured port; the
// integration tests import this same object and drive it in-process via Supertest.
module.exports = app;
