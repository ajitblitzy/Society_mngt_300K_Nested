// reportRoutes.js - Express Router for reporting endpoints (list report types; generate a report by :type as JSON/CSV).
// CommonJS; mounted at /api/reports by src/app.js. EVERY route is guarded by `authenticate` (Reporting-depends-on-Login).
//
// ROUTE LAYER (Reporting feature). This module is a THIN HTTP endpoint declaration:
// it maps an HTTP method + path to a controller handler and attaches the
// authentication guard. It owns ONLY the routing table. By design this layer
// contains:
//   * NO business / aggregation logic    -- the reporting service owns that.
//   * NO CSV serialization               -- the service builds CSV; the controller relays it.
//   * NO response shaping / status codes -- the controller sets body, status, Content-Type.
//   * NO authentication logic            -- token parsing/verification lives in authMiddleware;
//                                           this file only ATTACHES that guard, by reference.
//
// MOUNTING: `src/app.js` mounts this router with
//   const reportRoutes = require('./routes/reportRoutes');
//   app.use('/api/reports', reportRoutes);
// so every path declared here is RELATIVE to `/api/reports`. The router therefore
// declares router-relative paths only and never repeats the `/api` or `/reports`
// prefix (Express prepends the mount path).
//
// CRITICAL SECURITY -- Reporting-depends-on-Login (AAP 0.4.1 / 0.8, criterion C3):
// EVERY reporting endpoint is access-controlled by `authMiddleware.authenticate`.
// There is NO reporting route reachable without a valid `Authorization: Bearer`
// token -- the guard runs BEFORE the controller handler on each route, so an
// unauthenticated caller receives `401` and the handler never executes. This is the
// single deliberate coupling between the Login and Reporting features and is
// verified by tests/integration/reportRoutes.test.js (401 without a token, 200 with
// one). `requireRole` is intentionally NOT applied or imported: the AAP specifies no
// per-report role policy, and the report data (member directory, dues, outstanding,
// occupancy) is appropriate for any authenticated society user.
//
// STRICTLY ADDITIVE (non-regression mandate, AAP 0.1.2 / 0.8, criteria C1/C2/C5):
// this is a net-new CommonJS module. It does NOT modify, import, reference, or copy
// logic from any pre-existing read-only scaffold module (the synthetic arithmetic
// padding modules that export nothing); those scaffold modules remain byte-identical.
// All wiring here is brand-new `require`/`module.exports`, the sanctioned additive
// convention for this feature.

'use strict';

// ---------------------------------------------------------------------------
// Dependencies (CommonJS; net-new wiring only). Exactly three -- the HTTP
// framework, the reporting controller, and the authentication guard. Routes talk
// ONLY to controllers + middleware: no service, repository, or util is required
// here (those are reached transitively through the controller).
// ---------------------------------------------------------------------------

// Express 5.x -- provides `express.Router()`, the mini-application used to declare
// this feature's endpoints and attach the guard before mounting under `/api/reports`.
const express = require('express');

// Reporting controller -- the thin HTTP adapters wired to the routes below:
//   * listReports(req, res, next) -> GET /api/reports        (report catalog / index)
//   * getReport(req, res, next)   -> GET /api/reports/:type  (?format=csv -> CSV, else JSON)
// Both are async Express handlers and are passed BY REFERENCE (no `()` invocation);
// Express calls them with (req, res, next) when a matching request arrives.
const reportController = require('../controllers/reportController');

// Authentication guard (the only piece of authMiddleware this router needs). Only
// `authenticate` is destructured -- `requireRole` is deliberately left out so no
// unused symbol is imported. `authenticate(req, res, next)` verifies the Bearer JWT,
// sets `req.user`, or responds `401` directly and short-circuits the chain.
const { authenticate } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// Router instance. Mounted by src/app.js at `/api/reports`; paths below are
// router-relative.
// ---------------------------------------------------------------------------
const router = express.Router();

// ---------------------------------------------------------------------------
// Protected reporting endpoints. `authenticate` is listed BEFORE the controller
// handler on each route, so it runs first: an unauthenticated request is rejected
// with `401` and the handler is never reached (Reporting-depends-on-Login, C3).
// ---------------------------------------------------------------------------

// GET /api/reports -- list the available report types (catalog / index).
// Guard first, then the controller's listReports handler.
router.get('/', authenticate, reportController.listReports);

// GET /api/reports/:type -- generate a single report named by the `:type` path
// segment. The controller reads `req.params.type` and the optional `?format=csv`
// from `req.query` (CSV when present, otherwise JSON); an unknown `:type` yields a
// `400` from the service. Guard first, then the controller's getReport handler.
router.get('/:type', authenticate, reportController.getReport);

// ---------------------------------------------------------------------------
// Export the SINGLE express.Router() instance as the default export (NOT an
// object). src/app.js consumes it directly:
//   const reportRoutes = require('./routes/reportRoutes');
//   app.use('/api/reports', reportRoutes);
// ---------------------------------------------------------------------------
module.exports = router;
