/**
 * @file src/routes/index.js — Root Route Aggregator
 * @description Central routing hub for the Express.js application. This module
 * serves as the single entry point imported by `src/app.js` to mount every
 * route module in the application. Each domain-specific route file creates its
 * own Express Router instance, and this aggregator mounts them under their
 * designated path prefixes.
 *
 * Mounted sub-routers:
 *   /health  — Health check endpoint for PM2 and load balancer readiness probes
 *   /api     — Sample API endpoints (welcome message, server metadata)
 *
 * When `src/app.js` mounts this router with `app.use('/', routes)`, the
 * combined public paths become:
 *   GET /health      — Server health status
 *   GET /api         — API welcome / version info
 *   GET /api/info    — Server runtime metadata
 *
 * @requires express            Express 5.x framework for Router creation
 * @requires ./health.routes    Health check route module
 * @requires ./api.routes       API route module
 * @module src/routes/index
 */

'use strict';

// ---------------------------------------------------------------------------
// External dependencies
// ---------------------------------------------------------------------------
const express = require('express');

// ---------------------------------------------------------------------------
// Internal dependencies — sub-route modules
// ---------------------------------------------------------------------------
const healthRoutes = require('./health.routes');
const apiRoutes = require('./api.routes');

// ---------------------------------------------------------------------------
// Router instance — aggregates all application sub-routers
// ---------------------------------------------------------------------------
const router = express.Router();

// ---------------------------------------------------------------------------
// Route mounting — each sub-router is mounted under its path prefix
// ---------------------------------------------------------------------------

// Health check routes — mounted at /health
// Provides a lightweight endpoint for PM2 readiness probes, load balancers,
// and external monitoring systems to verify the server is alive and responsive.
router.use('/health', healthRoutes);

// API routes — mounted at /api
// Exposes sample API endpoints that demonstrate the routing pattern and
// provide server metadata for diagnostic and informational purposes.
router.use('/api', apiRoutes);

// ---------------------------------------------------------------------------
// Module export — the configured Router instance (default export)
// ---------------------------------------------------------------------------
module.exports = router;
