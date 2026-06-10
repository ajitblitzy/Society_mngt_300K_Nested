// reportController.js - HTTP handlers for reporting (list report types; generate a report by :type as JSON or CSV).
//
// CONTROLLER LAYER (Reporting feature). This module is the thin HTTP adapter for
// the Reporting feature: it parses the incoming request, delegates ALL work to the
// reporting service, and shapes the HTTP response (status code, `Content-Type`,
// optional download header, and body). It owns ONLY transport concerns.
//
// By design this layer contains:
//   * NO business / aggregation logic -- building and shaping reports lives in
//     the reporting service. The controller never reads the data store, never
//     builds CSV, and never inspects the report rows.
//   * NO CSV string construction -- the service performs the CSV serialization and
//     hands back a ready-to-send CSV STRING; the controller only relays it.
//   * NO authentication / authorization logic of any kind -- no JWT parsing, no
//     role checks, no `req.user` authorization. Access control for every report
//     endpoint is enforced UPSTREAM at the route layer via the auth middleware
//     (`authenticate` / `requireRole`); these handlers run only AFTER the guard
//     has passed (Reporting-requires-Login, AAP 0.4.1 / 0.8).
//   * NO hand-built error envelope -- thrown/forwarded errors are propagated
//     unchanged via `next(err)` to the centralized error handler, which renders the
//     single `{ error: { message, status } }` contract and derives the HTTP status
//     from `err.status` (the service attaches `.status = 400` for an unknown type).
//
// Intended router wiring (see the reporting router; BOTH routes are mounted BEHIND
// the auth middleware `authenticate`):
//   GET /api/reports         -> listReports   (report catalog / index)
//   GET /api/reports/:type   -> getReport     (?format=csv for CSV, otherwise JSON)
//
// CommonJS only: wiring is via `require(...)` / `module.exports` (no ESM
// `import`/`export`). This new wiring is the sanctioned additive convention for the
// feature (AAP 0.1.2 / 0.8); the pre-existing scaffold modules are read-only
// synthetic arithmetic padding and are neither referenced nor imported here, and
// remain byte-identical (AAP 0.6.2, criteria C1/C5).

'use strict';

// Sole dependency: the Reporting business-logic service. The controller is a thin
// adapter over exactly two of its entry points:
//   - listAvailableReports() -> Array<{ type, title }> : the 4-entry catalog
//     (members, dues, outstanding, occupancy) used by the index route.
//   - generateReport(type, { format }) -> { type, format, contentType, filename, content }
//     : the export-format-aware result descriptor for a single report. `content` is
//     the report ENVELOPE OBJECT ({ type, title, generatedAt, count, rows }) when
//     `format === 'json'` and a CSV STRING when `format === 'csv'`. It throws an
//     Error carrying numeric `.status === 400` for an unknown `type`; an absent or
//     unrecognized `format` falls back to JSON inside the service (so the controller
//     must NOT pre-reject formats).
const reportService = require('../services/reportService');

/**
 * GET /api/reports -- list the available report types (catalog / index route).
 *
 * Thin handler: asks the service for the canonical report catalog and returns it
 * wrapped in a stable, extensible `{ reports: [...] }` envelope so future metadata
 * fields can be added at the top level without breaking the array consumers.
 *
 * Mounted behind the auth middleware `authenticate`, so it executes only for an
 * authenticated caller; this handler performs no access-control itself.
 *
 * @param {object} req - Express HTTP request (unused; no params/query read here).
 * @param {object} res - Express HTTP response.
 * @param {Function} next - Express next-middleware callback; forwards any error to
 *   the centralized error handler.
 * @returns {Promise<void>} Resolves after the `200` JSON response is sent, or after
 *   forwarding an unexpected error via `next(err)`.
 *
 * @example
 * // 200 OK
 * // { "reports": [ { "type": "members", "title": "Member Directory" }, ... ] }
 */
async function listReports(req, res, next) {
  try {
    // Delegate entirely to the service; the controller adds no logic of its own.
    const reports = reportService.listAvailableReports();
    // Stable envelope shape: `{ reports: [{ type, title }, ...] }`.
    return res.status(200).json({ reports });
  } catch (err) {
    // Forward to the centralized error handler; never build the envelope here.
    return next(err);
  }
}

/**
 * GET /api/reports/:type -- generate a single report and send it as JSON or CSV.
 *
 * Reads the report `:type` from the route segment and the optional `?format` query
 * parameter, then delegates to `reportService.generateReport(type, { format })`.
 * The service is authoritative for type-checking and format resolution:
 *   - an unknown `type` makes the service throw an Error with `.status === 400`,
 *     which is forwarded unchanged to the error handler (-> `400` envelope);
 *   - an absent / unrecognized `format` (e.g. `'xml'`) falls back to JSON inside the
 *     service, so this handler never special-cases or pre-rejects a format.
 *
 * Content negotiation is driven solely by the service's returned `result.format`:
 *   - CSV  (`result.format === 'csv'`): set `Content-Type` to `result.contentType`
 *     (`'text/csv'`) and a `Content-Disposition: attachment` download header from
 *     `result.filename`, then send the raw CSV STRING with `res.send` (NOT
 *     `res.json`, which would force `application/json` and re-encode the string).
 *   - JSON (default): send the report ENVELOPE OBJECT with `res.json`, which sets
 *     `application/json` automatically.
 *
 * Mounted behind the auth middleware `authenticate`; this handler performs no
 * access-control itself.
 *
 * @param {object} req - Express HTTP request. `req.params.type` is the report type
 *   from the `/:type` segment; `req.query.format` is the optional export format.
 * @param {object} res - Express HTTP response.
 * @param {Function} next - Express next-middleware callback; forwards any error
 *   (including the service's `400` unknown-type error) to the centralized handler.
 * @returns {Promise<void>} Resolves after the `200` response (JSON or CSV) is sent,
 *   or after forwarding an error via `next(err)`.
 *
 * @example
 * // GET /api/reports/dues            -> 200 application/json  { type, title, generatedAt, count, rows }
 * // GET /api/reports/dues?format=csv -> 200 text/csv          "<header>\n<rows...>"  (+ Content-Disposition)
 * // GET /api/reports/bogus           -> 400 { error: { message, status: 400 } }
 */
async function getReport(req, res, next) {
  try {
    // Express populates `req.params.type` from the `/:type` route segment and
    // `req.query.format` from `?format=...`. Both are passed straight to the service.
    const { type } = req.params;
    const format = req.query.format;

    // Synchronous service call; throws `.status === 400` for an unknown `type`.
    const result = reportService.generateReport(type, { format });

    if (result.format === 'csv') {
      // CSV branch: relay the service's ready CSV STRING verbatim. Use the
      // service-provided `contentType` rather than hardcoding it, and offer an
      // optional download filename so browsers / curl can save the file.
      res.set('Content-Type', result.contentType); // 'text/csv'
      res.set('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.content); // CSV string -> res.send (not res.json)
    }

    // JSON branch (default, including the service's fallback for unknown formats):
    // `result.content` is the report envelope object; `res.json` sets
    // `application/json` automatically.
    return res.status(200).json(result.content);
  } catch (err) {
    // Forward unchanged; the unknown-type error already carries `.status === 400`.
    return next(err);
  }
}

// CommonJS named exports consumed by the reporting router. Exactly the two Express
// handlers -- no default export and no extra exports.
module.exports = { listReports, getReport };
