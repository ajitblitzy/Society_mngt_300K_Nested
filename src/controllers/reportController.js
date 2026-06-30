// reportController.js - HTTP handlers for reporting (list report types; generate a report by :type as JSON or CSV). CommonJS; thin adapter over reportService.
'use strict';

/**
 * src/controllers/reportController.js
 *
 * Thin HTTP-adapter layer for the Reporting feature of the Society Management
 * API. Its sole responsibilities are to (1) parse the incoming request, (2)
 * delegate to `services/reportService` for all aggregation / serialization, and
 * (3) shape the HTTP response (status code, `Content-Type`, body). It contains
 * NO business logic, NO CSV serialization, and NO repository access — every one
 * of those concerns lives behind `reportService`.
 *
 * ── Router wiring (authoritative — `src/routes/reportRoutes.js` matches this) ─
 * Both routes are mounted BEHIND the authentication guard
 * (`src/middleware/authMiddleware.js` `authenticate`), realizing the
 * "Reporting-requires-Login" prerequisite (AAP §0.8). This controller therefore
 * runs ONLY after auth has already passed and performs NO auth logic itself:
 *
 *     GET /api/reports        -> listReports   (report catalog / index)
 *     GET /api/reports/:type  -> getReport     (?format=csv for CSV, else JSON)
 *
 * ── Error convention (shared envelope) ────────────────────────────────────
 * Service errors already carry a numeric `.status` (e.g. an unknown report type
 * throws with `.status === 400`). Handlers simply forward them via `next(err)`;
 * the centralized `src/middleware/errorHandler.js` (registered last in
 * `src/app.js`) converts them into the consistent `{ error: { message, status } }`
 * envelope. This controller never hand-builds that envelope and never rewrites
 * the status.
 *
 * ── Module system / runtime ───────────────────────────────────────────────
 * CommonJS only (`require` / `module.exports`); no ESM. Target Node.js >= 18,
 * Express 5.x. The single dependency is the sibling reporting service.
 *
 * @module controllers/reportController
 */

// The ONLY dependency: the reporting service. The controller stays thin by
// delegating aggregation, format resolution and CSV serialization to it.
//
// Relevant service contract (see src/services/reportService.js):
//   listAvailableReports()        -> Array<{ type: string, title: string }>
//   generateReport(type, options) -> { type, format, contentType, filename, content }
//       · `format`      is 'json' | 'csv'
//       · `contentType` is 'application/json' | 'text/csv'
//       · `filename`    is `<type>-report.<json|csv>`
//       · `content`     is the report envelope OBJECT for JSON, the CSV STRING for CSV
//       · throws an Error with `.status === 400` for an unknown report type
//       · an absent/unrecognized `options.format` falls back to JSON internally
const reportService = require('../services/reportService');

/**
 * GET /api/reports — list the catalog of available report types.
 *
 * Returns the service-provided catalog wrapped in a stable, extensible
 * `{ reports: [...] }` envelope so additional top-level metadata can be added
 * later without breaking existing consumers.
 *
 * @param {import('express').Request}  req  - Express request (no params/body read).
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Error-forwarding callback.
 * @returns {Promise<import('express').Response|void>} Resolves once the response
 *   has been sent (200) or the error has been forwarded to `next`.
 */
async function listReports(req, res, next) {
  try {
    const reports = reportService.listAvailableReports();
    return res.status(200).json({ reports });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/reports/:type — generate a single report, in JSON (default) or CSV.
 *
 * The report `:type` comes from the path segment and the optional serialization
 * format from the `?format=` query (`csv` selects CSV; anything else — absent or
 * unrecognized — falls back to JSON inside the service). The controller does NOT
 * pre-validate either value: the service is authoritative (it throws a
 * `.status === 400` error for an unknown type and silently falls back to JSON
 * for an unknown format).
 *
 * Content negotiation is driven entirely by the service's returned descriptor:
 *   · CSV  (`result.format === 'csv'`): set `Content-Type` to `result.contentType`
 *     ('text/csv'), add a `Content-Disposition: attachment` header carrying
 *     `result.filename` so browsers/curl save the download, then `res.send` the
 *     raw CSV STRING (`res.send`, NOT `res.json`, so the string is not re-encoded
 *     and the content type is not overridden to application/json).
 *   · JSON (default): `res.json` the report envelope OBJECT
 *     (`{ type, title, generatedAt, count, rows }`), which sets
 *     `application/json` automatically.
 *
 * @param {import('express').Request}  req  - Express request; reads
 *   `req.params.type` and `req.query.format`.
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Error-forwarding callback;
 *   an unknown `:type` surfaces here as a 400 via the shared error handler.
 * @returns {Promise<import('express').Response|void>} Resolves once the response
 *   has been sent (200) or the error has been forwarded to `next`.
 */
async function getReport(req, res, next) {
  try {
    const { type } = req.params;
    const format = req.query.format;

    // Synchronous in the service; throws `.status === 400` for an unknown type.
    const result = reportService.generateReport(type, { format });

    if (result.format === 'csv') {
      // Relay the service-provided content type and download filename verbatim;
      // never hardcode the strings beyond what the service returns.
      res.set('Content-Type', result.contentType); // 'text/csv'
      res.set('Content-Disposition', `attachment; filename="${result.filename}"`);
      // `result.content` is the ready-made CSV STRING — send it as-is.
      return res.status(200).send(result.content);
    }

    // JSON branch (default / result.format === 'json'): `result.content` is the
    // report envelope OBJECT; `res.json` sets `application/json` automatically.
    return res.status(200).json(result.content);
  } catch (err) {
    // Forward to the centralized error handler, which derives the HTTP status
    // from `err.status` (e.g. 400 for an unknown report type).
    return next(err);
  }
}

module.exports = { listReports, getReport };
