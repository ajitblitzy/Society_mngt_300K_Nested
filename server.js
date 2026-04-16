/**
 * Application Entry Point — HTTP Server Startup & Graceful Shutdown
 *
 * This is the main entry point for the Ajit-backprop-test Express.js server.
 * It is deliberately SEPARATE from `src/app.js` to maintain a clean separation
 * of concerns:
 *   - `src/app.js` — assembles the Express middleware pipeline and routes
 *   - `server.js`  — binds the HTTP listener, manages process lifecycle
 *
 * This separation enables test frameworks to require the Express app instance
 * directly (via `require('./src/app')`) without starting the HTTP listener,
 * which is critical for integration testing with tools like Supertest.
 *
 * Responsibilities:
 *   1. Import the configured Express application from src/app.js
 *   2. Read the port and environment from the centralized config module
 *   3. Bind the HTTP listener on the configured port
 *   4. Implement graceful shutdown for SIGTERM (PM2 restart/stop) and SIGINT (Ctrl+C)
 *   5. Register global handlers for unhandled promise rejections and uncaught exceptions
 *   6. Use Winston logger exclusively for all output — NO direct console calls
 *
 * IMPORTANT: This file does NOT export anything. It is an entry point script
 * executed directly via `node server.js` or through PM2's ecosystem configuration.
 *
 * @file server.js
 * @requires ./src/app
 * @requires ./src/config
 * @requires ./src/utils/logger
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. Internal Dependencies — CommonJS require() syntax
// ---------------------------------------------------------------------------

/**
 * Fully configured Express application instance with the complete middleware
 * pipeline (Helmet, CORS, compression, body parsing, request logging, rate
 * limiting) and all routes mounted. Provides the .listen() method to bind
 * the HTTP server.
 */
const app = require('./src/app');

/**
 * Centralized environment configuration providing validated, environment-driven
 * settings. Properties consumed here: port (HTTP listener port), nodeEnv
 * (current runtime environment identifier).
 */
const config = require('./src/config');

/**
 * Winston logger singleton for structured application logging. Used for
 * server startup messages, shutdown notifications, and unhandled error
 * reporting. Methods used: info(), error().
 */
const logger = require('./src/utils/logger');

// ---------------------------------------------------------------------------
// 2. Server Configuration
// ---------------------------------------------------------------------------

/**
 * HTTP port extracted from the centralized config module.
 * Sourced from the PORT environment variable via dotenv; defaults to 3000
 * when not explicitly set. NEVER hardcoded — always resolved through config.
 * @type {number}
 */
const { port } = config;

/**
 * Forced shutdown timeout in milliseconds.
 * If the HTTP server fails to close gracefully within this window (e.g.,
 * due to long-lived connections), the process will be forcibly terminated
 * with exit code 1 to prevent zombie processes during PM2 restarts.
 * @type {number}
 */
const SHUTDOWN_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// 3. HTTP Server Initialization
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server by binding the Express application to the configured
 * port. The listen callback fires once the server is ready to accept
 * connections, at which point a startup message is logged via Winston.
 *
 * The returned `server` reference is retained so that `gracefulShutdown()`
 * can call `server.close()` to stop accepting new connections before exiting.
 *
 * @type {import('http').Server}
 */
const server = app.listen(port, () => {
  logger.info(`Server running on port ${port} in ${config.nodeEnv} mode`);
});

// ---------------------------------------------------------------------------
// 4. Graceful Shutdown Handler
// ---------------------------------------------------------------------------

/**
 * Gracefully shuts down the HTTP server and exits the process.
 *
 * This function is invoked when the process receives a termination signal
 * (SIGTERM from PM2 during restart/stop, or SIGINT from Ctrl+C during
 * development). It follows the recommended Node.js graceful shutdown pattern:
 *
 *   1. Log the shutdown signal receipt
 *   2. Call server.close() to stop accepting new connections
 *   3. Allow in-flight requests to complete within the timeout window
 *   4. Once the server is fully closed, log confirmation and exit cleanly
 *   5. If the server fails to close within the timeout, force-exit with code 1
 *
 * The forced shutdown timeout prevents the process from hanging indefinitely
 * when long-lived connections (e.g., WebSocket or keep-alive) refuse to close.
 * The timer is unrefed so it does not keep the event loop alive on its own.
 *
 * @param {string} signal - The signal name that triggered the shutdown (for logging)
 * @returns {void}
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Closing HTTP server...`);

  // Stop accepting new connections; allow existing requests to finish
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Safety net: force-exit if graceful close takes too long
  // unref() ensures the timer alone does not prevent the process from exiting
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown — server did not close in time');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Allow the process to exit naturally even if this timer is still pending
  if (forceShutdownTimer.unref) {
    forceShutdownTimer.unref();
  }
};

// ---------------------------------------------------------------------------
// 5. Process Signal Handlers
// ---------------------------------------------------------------------------

/**
 * SIGTERM — sent by PM2 during `pm2 stop`, `pm2 restart`, and zero-downtime
 * deployments. Also the default signal sent by Docker, Kubernetes, and most
 * process managers when requesting a graceful stop.
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * SIGINT — sent when the developer presses Ctrl+C in the terminal during
 * local development. Enables a clean shutdown without orphaned connections.
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------------------------------------------------------------------------
// 6. Unhandled Error Handlers
// ---------------------------------------------------------------------------

/**
 * Unhandled Promise Rejection Handler
 *
 * Catches promises that reject without a .catch() handler anywhere in the
 * application. Logs the rejection reason via Winston for debugging without
 * crashing the process, since a single unhandled rejection should not bring
 * down the entire server in production.
 *
 * Note: Starting from Node.js 15+, unhandled rejections throw by default.
 * This handler ensures the error is logged with full context before the
 * runtime's default behavior takes effect.
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason: reason instanceof Error ? reason.message : reason });
});

/**
 * Uncaught Exception Handler
 *
 * Catches synchronous exceptions that escape all try/catch blocks. This is
 * a critical, non-recoverable error — the process state may be corrupted,
 * so the server MUST exit immediately after logging the error. PM2 will
 * automatically restart the process according to its ecosystem configuration.
 *
 * The exit code 1 signals abnormal termination to the process manager.
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
  process.exit(1);
});
