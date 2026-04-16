/**
 * Health Check Route Module
 *
 * Provides a lightweight GET endpoint that returns the current server health
 * status. This endpoint is consumed by PM2 readiness probes, load balancers,
 * and external monitoring systems to verify the application is running and
 * capable of serving requests.
 *
 * The route is defined as `GET /` within this router; the route aggregator
 * (`src/routes/index.js`) mounts it under the `/health` prefix, making the
 * full public path `GET /health`.
 *
 * Response payload:
 *   - status      {string}  Always 'ok' — confirms the process is alive
 *   - uptime      {number}  Process uptime in seconds (floating-point)
 *   - timestamp   {string}  Current server time in ISO 8601 / UTC format
 *   - environment {string}  Runtime environment name sourced from the
 *                            centralized config module (never hardcoded)
 *
 * @module routes/health
 */

'use strict';

// ---------------------------------------------------------------------------
// External dependencies
// ---------------------------------------------------------------------------
const express = require('express');

// ---------------------------------------------------------------------------
// Internal dependencies
// ---------------------------------------------------------------------------
const config = require('../config');

// ---------------------------------------------------------------------------
// Router instance
// ---------------------------------------------------------------------------
const router = express.Router();

// ---------------------------------------------------------------------------
// GET / — Health check endpoint (mounted as GET /health)
// ---------------------------------------------------------------------------

/**
 * Returns a JSON object summarising the current health of the server.
 *
 * The handler deliberately avoids database calls, network I/O, or any
 * expensive computation so that it can respond in sub-millisecond time
 * even under heavy load — a critical property for liveness and readiness
 * probes.
 *
 * @route   GET /health
 * @access  Public
 * @returns {object} 200 — JSON health payload
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ---------------------------------------------------------------------------
// Module export — the configured Router instance (default export)
// ---------------------------------------------------------------------------
module.exports = router;
