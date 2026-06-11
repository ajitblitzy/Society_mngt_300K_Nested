// app.js - Express composition root for the Society Management API (CommonJS).
//
// COMPOSITION ROOT (the application's PRIMARY integration point - AAP 0.2.2 / 0.4.1).
// This is the single place where the Express application is assembled: it wires the
// built-in JSON body parser, the cross-cutting request logger, BOTH feature routers
// (Login at `/api/auth`, Reporting at `/api/reports`), and the terminal error
// handler into one configured `app` object. Every runtime seam of the new feature
// converges here; there is no other place that mounts routers or middleware.
//
// EXPORTS THE APP WITHOUT LISTENING (critical design constraint - AAP 0.5.2, C3/C4):
// this module builds and exports the `app` object but deliberately NEVER starts an
// HTTP listener. Binding a TCP port is the sole responsibility of `src/server.js`,
// which requires this module and then calls the app's `listen` method with the
// configured port. Keeping the listen call out of this file is what lets the
// Supertest integration tests `require('../../src/app')` and exercise the routes
// in-process, without binding a port or racing on a socket. Do not start an HTTP
// listener here under any circumstance.
//
// MIDDLEWARE ORDER IS SIGNIFICANT. Express runs `app.use` handlers in registration
// order, so the assembly below is deliberate:
//   1. express.json()      - parse JSON request bodies so controllers see `req.body`.
//   2. requestLogger       - observe EVERY request (logged on response 'finish'),
//                            registered BEFORE the routers so 401s and errors are
//                            still logged.
//   3. /api/auth router    - Login feature endpoints (register/login/logout/me).
//   4. /api/reports router - Reporting feature endpoints (auth-guarded inside the
//                            router; Reporting-depends-on-Login).
//   5. errorHandler        - the terminal error boundary, registered LAST so it
//                            catches synchronous throws, `next(err)` forwards, and
//                            (Express 5) rejected async-handler promises from any
//                            route above it, emitting one consistent JSON envelope.
//
// STRICTLY ADDITIVE (non-regression mandate - AAP 0.1.2 / 0.6.2, criteria C1/C2/C5):
// this is a net-new CommonJS module. It does NOT import, reference, modify, or copy
// logic from any pre-existing read-only scaffold module (the synthetic arithmetic
// padding modules that export nothing); those modules remain byte-identical and
// entirely standalone. All wiring here is brand-new `require`/`module.exports`, the
// sanctioned additive convention for this feature.
//
// MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM
// `import`/`export`. The sole external dependency is Express 5.x.

'use strict';

// ---------------------------------------------------------------------------
// External dependency (the ONLY third-party package this file needs).
// ---------------------------------------------------------------------------
// Express 5.x: provides the application factory `express()`, the built-in
// `express.json()` body-parsing middleware, and the `app.use` / `app.get`
// mounting API used to assemble the application below.
const express = require('express');

// ---------------------------------------------------------------------------
// Internal dependencies (net-new feature modules; all CommonJS default exports).
// ---------------------------------------------------------------------------
// Each module below exports its single artifact directly (`module.exports = X`),
// so a plain `const X = require(...)` binds exactly what is needed - no
// destructuring is required for any of them.

// Central, frozen runtime configuration (the single source of config truth). Used
// here for environment-aware composition: aligning Express's own environment with
// the centrally-resolved value and exposing the read-only config on `app.locals`
// for downstream handlers. It must never trigger a listen (it does not).
const config = require('./config');

// Per-request access logger (`(req, res, next)`); registered BEFORE the routers so
// every inbound request is observed, including ones that 401 or error out.
const requestLogger = require('./middleware/requestLogger');

// Centralized error-handling middleware (`(err, req, res, next)`); registered LAST,
// after all routers, as the application's terminal error boundary.
const errorHandler = require('./middleware/errorHandler');

// Authentication router (Login feature) - mounted at `/api/auth`. An express.Router
// declaring router-relative paths: POST /register, POST /login, POST /logout,
// GET /me (the last one guarded by the authentication middleware).
const authRoutes = require('./routes/authRoutes');

// Reporting router (Reporting feature) - mounted at `/api/reports`. An
// express.Router whose every route is guarded by the authentication middleware
// (Reporting-depends-on-Login): GET / (catalog), GET /:type (JSON or `?format=csv`).
const reportRoutes = require('./routes/reportRoutes');

// ---------------------------------------------------------------------------
// Application instance.
// ---------------------------------------------------------------------------
// `express()` creates the application object. It is configured and exported below
// but never bound to a port here (see the header note - `src/server.js` owns the
// listen call).
const app = express();

// ---------------------------------------------------------------------------
// Environment-aware composition from the central config (single source of truth).
// ---------------------------------------------------------------------------
// Align Express's internal environment (`app.get('env')`, consulted by Express for
// some default behaviors) with the centrally-resolved environment name, so the
// whole application reads its environment from one place rather than re-deriving it
// from `process.env.NODE_ENV` ad hoc. `config.nodeEnv` is always a defined string
// (it defaults to 'development'), so this is safe and side-effect-free.
app.set('env', config.nodeEnv);

// Disable the `X-Powered-By: Express` response header. It advertises the framework
// (and version surface) to clients for no functional benefit; turning it off is a
// standard, behavior-preserving security default consistent with the feature's
// security baseline (C6). This changes a response header only - never a status
// code, body, or route - so it does not affect any documented endpoint contract.
app.disable('x-powered-by');

// Expose the frozen config object on `app.locals` (a conventional, read-only,
// app-scoped store). This lets route handlers and integration tests read the same
// centralized configuration off the `app` instance without re-requiring the config
// module. The object is frozen upstream, so this cannot be mutated by consumers.
app.locals.config = config;

// ---------------------------------------------------------------------------
// Global middleware (registered BEFORE the feature routers; order matters).
// ---------------------------------------------------------------------------

// Parse `application/json` request bodies into `req.body`. Express 5 ships this
// body parser built in (no separate `body-parser` dependency). It must precede the
// routers so auth/report controllers can read parsed JSON payloads.
app.use(express.json());

// Install per-request logging ahead of the routers so that EVERY request entering
// the application is observed - including requests the routers reject with 401 or
// that fail and are converted by the error handler. The logger does no async work
// on the request path and emits its single line on the response 'finish' event.
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Liveness endpoint (sanctioned by AAP 0.5.2 as the one allowed extra route).
// ---------------------------------------------------------------------------
// A trivial, unauthenticated health check for liveness/readiness probes and for
// boot verification (C4). It is a single GET route (not a router mount) and exposes
// no domain data, so it neither adds an `/api/*` mount nor affects the auth/report
// contracts. No other unspecified endpoints are added.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// Feature routers. Mount paths are EXACTLY `/api/auth` and `/api/reports` so they
// match the route modules, README, and docs/api/endpoints.md. Express prepends
// these mount paths to each router-relative route declared inside the routers.
// ---------------------------------------------------------------------------

// Login feature: authentication endpoints under `/api/auth/*`.
app.use('/api/auth', authRoutes);

// Reporting feature: report endpoints under `/api/reports/*` (each guarded inside
// the router by the authentication middleware - Reporting-depends-on-Login).
app.use('/api/reports', reportRoutes);

// ---------------------------------------------------------------------------
// Terminal error boundary (MUST be the LAST `app.use`).
// ---------------------------------------------------------------------------
// Registered after every route so it receives errors bubbling up from all handlers
// above: synchronous throws, explicit `next(err)` forwards, and - because this is
// Express 5 - rejected promises returned by async route handlers (auto-forwarded by
// the framework). It converts them into a single, consistent JSON error envelope.
// Nothing may be registered after this handler.
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Export the fully-configured application WITHOUT starting an HTTP listener.
// ---------------------------------------------------------------------------
// `src/server.js` consumes this default export and binds the configured port to
// start the HTTP server (it requires this module, then calls the app's `listen`
// method with `config.port`). The Supertest integration tests likewise
// `require('../../src/app')` and drive the app in-process. Exporting the
// un-listened app is what makes both possible.
module.exports = app;
