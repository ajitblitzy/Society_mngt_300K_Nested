// reportRoutes.js - Express Router for reporting endpoints (list types; generate by :type as JSON/CSV). CommonJS; mounted at /api/reports by src/app.js; EVERY route guarded by authenticate.
'use strict';

/**
 * src/routes/reportRoutes.js
 *
 * HTTP endpoint surface for the Reporting feature of the Society Management API.
 * This module is a THIN endpoint declaration: it maps each HTTP method + path to
 * a `reportController` handler and attaches the authentication guard. It holds
 * NO business logic, NO aggregation, NO CSV serialization, and NO response
 * shaping — every one of those concerns lives behind the report controller,
 * which in turn delegates to the report service.
 *
 * ── Mounting (authoritative) ──────────────────────────────────────────────
 * `src/app.js` loads this module and mounts the exported router at the
 * `/api/reports` base path with `app.use('/api/reports', reportRoutes)`.
 *
 * Therefore the paths declared below are ROUTER-RELATIVE and the mount prefix is
 * added by `app.use`. Do NOT repeat `/api` or `/reports` here. Effective paths:
 *
 *     GET /api/reports        -> listReports   (report catalog / index)
 *     GET /api/reports/:type  -> getReport     (?format=csv for CSV, else JSON)
 *
 * ── Security: Reporting-depends-on-Login (AAP §0.4.1 / §0.8 / criterion C3) ─
 * EVERY reporting route is access-controlled by `authMiddleware.authenticate`,
 * the single deliberate coupling between the Login and Reporting features. The
 * guard runs BEFORE the controller handler on each route, so no report data is
 * ever reachable without a valid `Authorization: Bearer <token>` JWT. A missing
 * or invalid token yields a generic `401` directly from `authenticate`; only an
 * authenticated request reaches the controller. No per-report role policy is
 * mandated by the AAP, so `requireRole` is intentionally NOT applied here (and
 * therefore not imported) — report data (member directory, dues, occupancy) is
 * appropriate for any authenticated society user.
 *
 * ── Module system / runtime ───────────────────────────────────────────────
 * CommonJS only (`require` / `module.exports`); no ESM. Target Node.js >= 18,
 * Express 5.x (`express.Router()`). Additive-only: this file references none of
 * the pre-existing arithmetic scaffold modules and introduces only new
 * authentication-guarded reporting wiring.
 *
 * @module routes/reportRoutes
 */

// ── Dependencies (only the verified depends_on_files whitelist + express) ───
const express = require('express');
// Thin HTTP adapters for the Reporting feature. Exports EXACTLY
// `{ listReports, getReport }`, both async Express handlers `(req, res, next)`.
// They are passed BY REFERENCE below (never invoked here).
const reportController = require('../controllers/reportController');
// JWT authentication guard. `authenticate(req, res, next)` verifies the Bearer
// token, sets `req.user`, or responds `401` directly. Only `authenticate` is
// needed for reporting; `requireRole` is intentionally not destructured.
const { authenticate } = require('../middleware/authMiddleware');

// The single Express Router instance exported as this module's default export.
const router = express.Router();

// Every reporting route requires a valid Bearer token: `authenticate` runs
// first and sets `req.user` (or short-circuits with 401), then the matching
// controller handler executes. Handlers are referenced, never invoked here.

// GET /api/reports — list the catalog of available report types (PROTECTED).
router.get('/', authenticate, reportController.listReports);

// GET /api/reports/:type — generate the report named by `:type` (PROTECTED).
// `:type` is a path param; `?format=csv` (CSV, else JSON) is read by the
// controller from `req.query`. An unknown `:type` surfaces as a 400 from the
// service via the centralized error handler.
router.get('/:type', authenticate, reportController.getReport);

// Default export: the single configured Express Router (NOT an object), so
// `src/app.js` can mount it directly with `app.use('/api/reports', reportRoutes)`.
module.exports = router;
