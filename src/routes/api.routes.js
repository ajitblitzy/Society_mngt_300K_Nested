/**
 * @file src/routes/api.routes.js — Sample API Route Definitions
 * @description Defines sample API endpoints that demonstrate the routing pattern
 * for the Express.js application. These routes are mounted under the `/api`
 * prefix by the route aggregator (`src/routes/index.js`).
 *
 * Endpoints:
 *   GET /api       — Returns a JSON welcome message with API version
 *   GET /api/info  — Returns server metadata (name, version, Node.js info, uptime)
 *
 * This module creates an Express Router instance, registers route handlers,
 * and exports the router for consumption by the route aggregator.
 *
 * @requires express  Express 5.x framework for Router creation
 * @module src/routes/api.routes
 */

'use strict';

const express = require('express');

/**
 * Express Router instance for API route definitions.
 * All routes defined here are relative to the `/api` mount point.
 * @type {import('express').Router}
 */
const router = express.Router();

/**
 * GET /api
 * Welcome endpoint — returns a JSON greeting with API version information.
 * Serves as the root entry point for the API, confirming the API is accessible
 * and providing the current API version for client version checks.
 *
 * @route GET /api
 * @returns {Object} 200 - JSON welcome message
 * @returns {string} res.body.status - Response status indicator ('success')
 * @returns {string} res.body.message - Human-readable welcome message
 * @returns {string} res.body.version - Current API version string
 */
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to the API',
    version: '1.0.0',
  });
});

/**
 * GET /api/info
 * Server information endpoint — returns runtime metadata about the server.
 * Provides application identity, Node.js runtime details, host platform,
 * and current server uptime for diagnostic and informational purposes.
 *
 * @route GET /api/info
 * @returns {Object} 200 - JSON server metadata
 * @returns {string} res.body.status - Response status indicator ('success')
 * @returns {Object} res.body.data - Server metadata object
 * @returns {string} res.body.data.name - Application name
 * @returns {string} res.body.data.version - Application version
 * @returns {string} res.body.data.description - Application description
 * @returns {string} res.body.data.nodeVersion - Node.js runtime version (e.g. 'v20.20.2')
 * @returns {string} res.body.data.platform - Host OS platform (e.g. 'linux', 'darwin', 'win32')
 * @returns {number} res.body.data.uptime - Server uptime in seconds (floating-point)
 */
router.get('/info', (req, res) => {
  res.json({
    status: 'success',
    data: {
      name: 'ajit-backprop-test',
      version: '1.0.0',
      description: 'Express.js API server',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    },
  });
});

module.exports = router;
