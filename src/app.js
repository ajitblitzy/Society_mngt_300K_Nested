/**
 * Express Application Assembly — Central Middleware Pipeline & Route Mounting
 *
 * This is the core Express application module for the Ajit-backprop-test server.
 * It creates and fully configures the Express 5.x application instance by:
 *   1. Registering all middleware in a strict, non-negotiable order
 *   2. Mounting all application routes via the root route aggregator
 *   3. Attaching error-handling middleware as the final pipeline stage
 *
 * The configured app is exported for consumption by:
 *   - `server.js` — binds the HTTP listener and starts serving requests
 *   - Test frameworks — require the app without starting the HTTP listener
 *
 * CRITICAL DESIGN DECISIONS:
 *   - This file does NOT start the HTTP listener. Server binding is the sole
 *     responsibility of `server.js` to maintain testability separation.
 *   - Middleware ordering is non-negotiable and follows the Express.js
 *     production best-practice sequence:
 *       Security → CORS → Compression → Body Parsing → Logging →
 *       Rate Limiting → Routes → 404 Handler → Error Handler
 *   - All configurable values (CORS origin, rate limit window/max) are
 *     sourced from the centralized config module — NEVER hardcoded.
 *   - CommonJS `require()` / `module.exports` syntax is used throughout
 *     for maximum compatibility with Express 5.x and all middleware packages.
 *
 * @module app
 * @requires express
 * @requires helmet
 * @requires cors
 * @requires compression
 * @requires express-rate-limit
 * @requires ./config
 * @requires ./middleware/requestLogger
 * @requires ./middleware/notFound
 * @requires ./middleware/errorHandler
 * @requires ./routes
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. External Dependencies
// ---------------------------------------------------------------------------

/**
 * Express 5.x HTTP server framework — creates the application instance and
 * provides JSON/URL-encoded body parsing middleware via express.json() and
 * express.urlencoded().
 */
const express = require('express');

/**
 * Security middleware — sets HTTP response headers (Content-Security-Policy,
 * Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, etc.)
 * to protect against common web vulnerabilities such as XSS, clickjacking,
 * and MIME-type sniffing.
 */
const helmet = require('helmet');

/**
 * Cross-Origin Resource Sharing middleware — configures allowed origins,
 * methods, and headers for cross-domain requests. The origin is sourced
 * from the environment configuration module.
 */
const cors = require('cors');

/**
 * Response compression middleware — enables gzip/deflate encoding on HTTP
 * responses to reduce payload size and improve transfer performance.
 */
const compression = require('compression');

/**
 * Rate limiting middleware — prevents API abuse and DDoS attacks by limiting
 * the number of requests each client IP can make within a configurable time
 * window. Window duration and max requests are sourced from environment config.
 */
const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// 2. Internal Dependencies
// ---------------------------------------------------------------------------

/**
 * Centralized environment configuration — provides validated, environment-driven
 * settings used to configure CORS, rate limiting, and other middleware.
 * Properties consumed: corsOrigin, rateLimitWindowMs, rateLimitMax
 */
const config = require('./config');

/**
 * Morgan-to-Winston HTTP request logging bridge — captures every HTTP request's
 * method, URL, status code, and response time, then pipes the log entry into
 * the Winston logger for unified log management.
 */
const requestLogger = require('./middleware/requestLogger');

/**
 * 404 catch-all middleware — creates a standardized HTTP 404 error using
 * http-errors for any request that does not match a defined route. The error
 * is forwarded to the global error handler via next(err).
 */
const notFound = require('./middleware/notFound');

/**
 * Global error handling middleware with the Express 4-argument signature
 * (err, req, res, next). Logs errors via Winston with contextual request
 * information and returns a standardized JSON error response. This MUST be
 * the very last middleware registered on the app.
 */
const errorHandler = require('./middleware/errorHandler');

/**
 * Root route aggregator — mounts all sub-routers (health check and API routes)
 * under their designated path prefixes via the '/' base path.
 */
const routes = require('./routes');

// ---------------------------------------------------------------------------
// 3. Express Application Instance
// ---------------------------------------------------------------------------

/** @type {import('express').Express} The configured Express application */
const app = express();

// ---------------------------------------------------------------------------
// 4. Middleware Pipeline — ORDER IS NON-NEGOTIABLE
//
// The pipeline follows the Express.js production best-practice sequence:
//   Step 1: Security headers (helmet)        — protect every response
//   Step 2: CORS                              — allow cross-origin requests
//   Step 3: Response compression              — shrink payloads
//   Step 4: Body parsing (JSON + urlencoded)  — parse incoming request bodies
//   Step 5: Request logging (Morgan→Winston)  — log every request
//   Step 6: Rate limiting                     — throttle abusive clients
//   Step 7: Application routes                — handle matched requests
//   Step 8: 404 Not Found handler             — catch unmatched requests
//   Step 9: Global error handler              — format and log all errors
// ---------------------------------------------------------------------------

// Step 1 — Security Headers (MUST be first)
// Helmet sets a comprehensive suite of HTTP security response headers
// to mitigate XSS, clickjacking, MIME sniffing, and other common attacks.
app.use(helmet());

// Step 2 — CORS Configuration
// Allows cross-origin requests from the origin(s) specified in the
// environment configuration. Defaults to '*' (all origins) in development.
app.use(cors({
  origin: config.corsOrigin,
}));

// Step 3 — Response Compression
// Applies gzip/deflate encoding to responses, significantly reducing
// payload sizes for JSON responses and improving network performance.
app.use(compression());

// Step 4 — Body Parsing
// Parse incoming JSON request bodies (Content-Type: application/json).
app.use(express.json());
// Parse incoming URL-encoded request bodies (Content-Type: application/x-www-form-urlencoded).
// { extended: true } allows rich objects and arrays to be encoded.
app.use(express.urlencoded({ extended: true }));

// Step 5 — HTTP Request Logging
// Pipes every HTTP request's details (method, URL, status, response time)
// through Morgan into the Winston logger for unified log management.
app.use(requestLogger);

// Step 6 — Rate Limiting
// Protects the API from abuse and DDoS attacks by limiting each client IP
// to a maximum number of requests within a sliding time window.
// Configuration values are sourced from the centralized config module.
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,    // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

// Step 7 — Application Routes
// Mount all application routes via the root route aggregator.
// The aggregator delegates to sub-routers:
//   /health  — Health check endpoint (PM2 / load balancer probes)
//   /api     — Sample API endpoints (welcome, server info)
app.use('/', routes);

// Step 8 — 404 Not Found Handler (MUST be AFTER all routes)
// Catches any request that did not match a defined route and creates
// a standardized 404 error forwarded to the global error handler.
app.use(notFound);

// Step 9 — Global Error Handler (MUST be the LAST middleware)
// Terminal error handler that logs errors via Winston and returns a
// standardized JSON response: { status: 'error', statusCode, message }.
// The 4-argument signature (err, req, res, next) is required by Express
// to identify this as an error-handling middleware.
app.use(errorHandler);

// ---------------------------------------------------------------------------
// 5. Module Export
// ---------------------------------------------------------------------------

/**
 * The fully configured Express application instance, ready to be consumed by
 * server.js (to bind the HTTP listener) or by test frameworks (to send
 * requests without starting the server).
 *
 * @type {import('express').Express}
 */
module.exports = app;
