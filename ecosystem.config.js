/**
 * PM2 Ecosystem Configuration — Ajit-backprop-test
 *
 * This file defines the PM2 process manager configuration for the
 * Ajit-backprop-test Express.js server. It is version-controlled and
 * committed to the repository to ensure deployment reproducibility.
 *
 * PM2 reads this file to determine how to launch, manage, and monitor
 * the Node.js application in both development and production environments.
 *
 * Usage:
 *   Development:  pm2 start ecosystem.config.js
 *   Production:   pm2 start ecosystem.config.js --env production
 *   Stop:         pm2 stop ecosystem.config.js
 *   Restart:      pm2 restart ecosystem.config.js
 *   Logs:         pm2 logs
 *   Status:       pm2 status
 *
 * Key Features:
 *   - Cluster mode: spawns one worker per CPU core for horizontal scaling
 *   - Auto-restart: recovers from crashes without manual intervention
 *   - Memory threshold: restarts workers that exceed 300MB to prevent leaks
 *   - Merged logs: consolidates output from all cluster workers into single files
 *   - Environment profiles: separate development and production configurations
 *
 * NOTE: Sensitive configuration values (API keys, database URLs, secrets)
 * must NOT be placed in this file. Use .env files or your deployment
 * platform's environment variable management instead.
 *
 * @file ecosystem.config.js
 * @see server.js — The entry point script spawned by PM2
 * @see {@link https://pm2.keymetrics.io/docs/usage/application-declaration/}
 */

'use strict';

module.exports = {
  /**
   * PM2 application definitions array.
   *
   * Each entry in this array represents a separate application that PM2
   * will manage. For the Ajit-backprop-test project, a single application
   * entry is defined — the Express.js HTTP server.
   *
   * @type {Array<Object>}
   */
  apps: [
    {
      // -----------------------------------------------------------------------
      // Application Identity
      // -----------------------------------------------------------------------

      /**
       * Application name displayed in PM2 process listings, log file headers,
       * and monitoring dashboards. Used to identify this application when
       * running `pm2 list`, `pm2 logs`, `pm2 stop`, etc.
       * @type {string}
       */
      name: 'ajit-backprop-test',

      /**
       * Path to the Node.js entry point script that PM2 will execute.
       * This must point to `server.js` which imports the Express app,
       * binds the HTTP listener, and implements graceful shutdown handlers
       * for SIGTERM and SIGINT signals sent by PM2 during restarts.
       * @type {string}
       */
      script: 'server.js',

      // -----------------------------------------------------------------------
      // Execution Mode & Scaling
      // -----------------------------------------------------------------------

      /**
       * Execution mode determines how PM2 launches the application.
       *
       *   - 'cluster': Leverages Node.js cluster module to spawn multiple
       *     worker processes sharing the same TCP port. Enables load balancing
       *     across CPU cores and zero-downtime restarts via PM2's built-in
       *     cluster management. Recommended for production HTTP servers.
       *
       *   - 'fork' (default): Spawns a single child process. Suitable for
       *     scripts that do not need multi-core scaling (e.g., cron jobs).
       *
       * @type {string}
       */
      exec_mode: 'cluster',

      /**
       * Number of worker instances to spawn in cluster mode.
       *
       *   - 'max': Spawns one worker per available CPU core, maximizing
       *     throughput by utilizing all hardware resources. PM2 detects
       *     the core count automatically via `os.cpus().length`.
       *
       *   - <number>: Spawn a fixed number of workers (e.g., 2, 4).
       *     Useful for reserving CPU cores for other processes.
       *
       * In development, PM2 will still respect this setting. For single-
       * instance development, use `nodemon` instead (`npm run dev`).
       *
       * @type {string|number}
       */
      instances: 'max',

      // -----------------------------------------------------------------------
      // Restart Policies
      // -----------------------------------------------------------------------

      /**
       * Enable automatic restart when the application crashes or exits
       * unexpectedly. PM2 will immediately respawn the process, ensuring
       * high availability without manual intervention.
       *
       * Combined with the graceful shutdown handler in `server.js`, this
       * provides resilient process management — crashes trigger a restart
       * while planned shutdowns (SIGTERM/SIGINT) proceed cleanly.
       *
       * @type {boolean}
       */
      autorestart: true,

      /**
       * Disable file watching in PM2. File-change-based auto-restart is
       * NOT appropriate for production environments due to performance
       * overhead and potential restart loops.
       *
       * For development auto-reload, use `nodemon` via `npm run dev`
       * instead of PM2's watch mode.
       *
       * @type {boolean}
       */
      watch: false,

      /**
       * Maximum memory threshold per worker before PM2 triggers an
       * automatic restart. This acts as a safety net against memory leaks
       * that could degrade performance or exhaust system resources.
       *
       * When any worker's RSS (Resident Set Size) exceeds this limit,
       * PM2 gracefully restarts that specific worker — not the entire
       * cluster — minimizing service disruption.
       *
       * Value format: '<number>M' for megabytes, '<number>G' for gigabytes.
       *
       * @type {string}
       */
      max_memory_restart: '300M',

      // -----------------------------------------------------------------------
      // Logging Configuration
      // -----------------------------------------------------------------------

      /**
       * Timestamp format prepended to each PM2 log entry. Uses the
       * Moment.js-compatible format string for consistent, parseable
       * timestamps across all log output.
       *
       * Format: YYYY-MM-DD HH:mm:ss Z
       * Example: 2025-04-16 14:30:45 +00:00
       *
       * Note: This is the PM2-level log timestamp. The application also
       * has its own Winston-based logging with separate timestamp formatting
       * configured in `src/utils/logger.js`.
       *
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * File path for PM2 error logs (stderr output).
       * PM2 captures all stderr output from the application and writes
       * it to this file. The `./logs/` directory is relative to the
       * application root where PM2 is started.
       *
       * @type {string}
       */
      error_file: './logs/pm2-error.log',

      /**
       * File path for PM2 standard output logs (stdout output).
       * PM2 captures all stdout output from the application and writes
       * it to this file. This includes Winston console transport output
       * and any other stdout messages.
       *
       * @type {string}
       */
      out_file: './logs/pm2-out.log',

      /**
       * Merge logs from all cluster worker instances into the same log
       * files. Without this flag, PM2 creates separate log files for each
       * worker instance (e.g., `pm2-out-0.log`, `pm2-out-1.log`).
       *
       * Enabling merge_logs simplifies log management by consolidating
       * all worker output into `pm2-out.log` and `pm2-error.log`.
       *
       * @type {boolean}
       */
      merge_logs: true,

      // -----------------------------------------------------------------------
      // Environment Profiles
      // -----------------------------------------------------------------------

      /**
       * Default environment variables (development profile).
       *
       * These variables are injected into `process.env` when PM2 starts
       * the application WITHOUT the `--env` flag:
       *   pm2 start ecosystem.config.js
       *
       * The `src/config/index.js` module reads these values from
       * `process.env` to configure the Express application, logging
       * levels, and other environment-aware behaviors.
       *
       * @type {Object}
       */
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
      },

      /**
       * Production environment variables.
       *
       * These variables are injected into `process.env` when PM2 starts
       * the application WITH the `--env production` flag:
       *   pm2 start ecosystem.config.js --env production
       *
       * Key differences from development:
       *   - NODE_ENV set to 'production' for Express optimizations
       *     (view caching, reduced error verbosity, etc.)
       *   - LOG_LEVEL set to 'info' to reduce log volume while retaining
       *     operational visibility
       *
       * Additional production-specific variables (database URLs, API keys,
       * etc.) should be added here or in the deployment platform's
       * environment configuration — NEVER as hardcoded values in source code.
       *
       * @type {Object}
       */
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'info',
      },
    },
  ],
};
