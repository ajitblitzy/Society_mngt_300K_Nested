// reportService.js - Reporting business logic (CommonJS): aggregate seed data into domain reports; optional CSV. No auth here.
'use strict';

/**
 * src/services/reportService.js
 *
 * SERVICE LAYER — the core business logic of the Society Management **Reporting**
 * feature. This module aggregates the raw, seeded source rows exposed by
 * `src/repositories/reportRepository.js` into the four canonical domain reports
 * (member directory, dues & collection summary, outstanding payments, and
 * occupancy), shapes each row through the pure factories in
 * `src/models/reportModel.js`, and — when asked — serializes a report to CSV via
 * `src/utils/csvExporter.js`. The canonical report-type / export-format
 * enumerations and validators come from `src/domain/report.js`; string literals
 * for those values are NEVER inlined here.
 *
 * ── Strict separation of concerns ─────────────────────────────────────────
 * This is a PURE data service. It performs aggregation + optional CSV
 * serialization ONLY. It contains NO authentication or authorization logic:
 * there is no JWT handling, no role checks, no `req`/`res`, and no Express here.
 * Access control for every reporting endpoint is enforced upstream in
 * `src/routes/reportRoutes.js` via `src/middleware/authMiddleware.js`
 * (AAP §0.5.2). The functions below are framework-agnostic and can be unit
 * tested in isolation.
 *
 * ── Layering & data flow ──────────────────────────────────────────────────
 *   repository (raw seed rows)
 *        │  getMembers() / getDues() / getOccupancy()   → returns CLONES
 *        ▼
 *   service (this module: aggregate / derive / filter)
 *        │  reportModel.create*Row(...) → normalized DTO rows
 *        │  reportModel.createReport(...) → { type, title, generatedAt, count, rows }
 *        ▼
 *   controller (selects Content-Type, sends `content`)
 *
 * Because the repository returns independent clones, building a report never
 * mutates the shared seed; repeated calls yield equivalent data.
 *
 * ── Error convention ──────────────────────────────────────────────────────
 * Thrown errors carry a numeric `.status`, matching the shared error envelope
 * produced by `src/middleware/errorHandler.js` (`{ error: { message, status } }`).
 * An unknown report type is a client error and is reported as HTTP 400.
 *
 * MODULE SYSTEM: CommonJS only (`require` / `module.exports`); no ESM.
 * RUNTIME: Node.js >= 18. No I/O beyond reading the in-memory repository.
 *
 * @module services/reportService
 */

const reportRepository = require('../repositories/reportRepository');
const reportModel = require('../models/reportModel');
const {
  REPORT_TYPES,
  REPORT_TYPE_VALUES,
  isValidReportType,
  EXPORT_FORMATS,
  DEFAULT_EXPORT_FORMAT,
  isValidExportFormat,
  REPORT_TYPE_LABELS,
} = require('../domain/report');
const csvExporter = require('../utils/csvExporter');

/**
 * Number of milliseconds in one calendar day. Used to convert the raw
 * millisecond gap between "now" and a due date into a whole-day overdue count.
 *
 * @type {number}
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Construct an `Error` annotated with a numeric HTTP `.status`.
 *
 * The shared `errorHandler` middleware reads `err.status` (falling back to
 * `err.statusCode`, then `500`) when shaping the `{ error: { message, status } }`
 * response envelope. Attaching `.status` here lets the controller simply
 * `throw`/forward service errors and have them surface with the right HTTP code.
 *
 * @param {string} message - Human-readable, client-safe error message.
 * @param {number} status  - HTTP status code to associate with the error.
 * @returns {Error & { status: number }} The annotated error (returned, not thrown).
 */
function reportError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Compute how many whole days a payment is overdue as of a given instant.
 *
 * Pure and deterministic given its inputs. The optional `now` parameter exists
 * so unit tests can pin a fixed clock for repeatable assertions; production
 * callers (e.g. {@link buildOutstandingReport}) rely on the `Date.now()` default.
 *
 * Behavior:
 *   - A falsy `dueDate` (e.g. `null`/`undefined`/`''`) yields `0`.
 *   - An unparseable `dueDate` (non-finite epoch) yields `0`.
 *   - A `dueDate` in the present or future (`diff <= 0`) yields `0` (never negative).
 *   - Otherwise returns `Math.floor(diff / DAY_MS)` — only fully elapsed days count.
 *
 * @param {string|number|Date} dueDate - Date-like value the payment was due.
 * @param {number} [now=Date.now()]     - Reference instant in epoch milliseconds.
 * @returns {number} Whole days overdue (`>= 0`).
 *
 * @example
 * computeDaysOverdue('2026-05-10', Date.parse('2026-05-20')); // => 10
 * computeDaysOverdue('2999-01-01');                           // => 0 (future)
 * computeDaysOverdue(null);                                   // => 0
 */
function computeDaysOverdue(dueDate, now = Date.now()) {
  if (!dueDate) return 0;
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return 0;
  const diff = now - due;
  if (diff <= 0) return 0;
  return Math.floor(diff / DAY_MS);
}

/**
 * Build the **Member Directory** report.
 *
 * Maps every raw member row from the repository through
 * `reportModel.createMemberRow` (a direct, lossless normalization) and wraps the
 * result in a report envelope.
 *
 * @returns {{type: string, title: string, generatedAt: string, count: number, rows: Array<Object>}}
 *   The member-directory report envelope.
 */
function buildMembersReport() {
  const rows = reportRepository.getMembers().map((m) => reportModel.createMemberRow(m));
  return reportModel.createReport({ type: REPORT_TYPES.MEMBERS, rows });
}

/**
 * Build the **Dues & Collection Summary** report.
 *
 * Maps every raw dues row through `reportModel.createDuesRow`, which derives the
 * per-row `balance` as `amountDue - amountPaid` (the model owns that single
 * computation). Note the model intentionally DROPS `dueDate` from the dues row
 * shape — that field is only relevant to the outstanding report.
 *
 * @returns {{type: string, title: string, generatedAt: string, count: number, rows: Array<Object>}}
 *   The dues & collection summary report envelope.
 */
function buildDuesReport() {
  const rows = reportRepository.getDues().map((d) => reportModel.createDuesRow(d));
  return reportModel.createReport({ type: REPORT_TYPES.DUES, rows });
}

/**
 * Build the **Occupancy** report.
 *
 * Maps every raw occupancy row through `reportModel.createOccupancyRow` (a
 * direct normalization) and wraps the result in a report envelope.
 *
 * @returns {{type: string, title: string, generatedAt: string, count: number, rows: Array<Object>}}
 *   The occupancy report envelope.
 */
function buildOccupancyReport() {
  const rows = reportRepository.getOccupancy().map((o) => reportModel.createOccupancyRow(o));
  return reportModel.createReport({ type: REPORT_TYPES.OCCUPANCY, rows });
}

/**
 * Build the **Outstanding Payments** report (a service-derived view).
 *
 * There is intentionally no `reportRepository.getOutstanding()`; this report is
 * derived from the RAW dues rows because those rows still carry `dueDate` (the
 * `createDuesRow` DTO drops it). The derivation, in order:
 *   1. Read RAW dues rows from the repository.
 *   2. Compute each row's `balance = amountDue - amountPaid` using finite-number
 *      coercion (defensive against malformed seed values).
 *   3. Keep ONLY rows whose `balance > 0` (units that still owe money — fully
 *      paid units are excluded).
 *   4. Shape each surviving row via `reportModel.createOutstandingRow`, where the
 *      row's `amountDue` is set to the remaining unpaid **balance** (NOT the
 *      original billed amount), `dueDate` is the raw due date, and `daysOverdue`
 *      is computed from that due date via {@link computeDaysOverdue}.
 *
 * @returns {{type: string, title: string, generatedAt: string, count: number, rows: Array<Object>}}
 *   The outstanding-payments report envelope.
 */
function buildOutstandingReport() {
  const rows = reportRepository.getDues()
    .map((d) => {
      const amountDue = Number(d.amountDue) || 0;
      const amountPaid = Number(d.amountPaid) || 0;
      return { source: d, balance: amountDue - amountPaid };
    })
    .filter((x) => x.balance > 0) // only units that still owe money
    .map((x) => reportModel.createOutstandingRow({
      unitNumber: x.source.unitNumber,
      memberName: x.source.memberName,
      amountDue: x.balance, // the OUTSTANDING (remaining/unpaid) amount, not the original bill
      dueDate: x.source.dueDate, // available only on the RAW dues row
      daysOverdue: computeDaysOverdue(x.source.dueDate),
    }));
  return reportModel.createReport({ type: REPORT_TYPES.OUTSTANDING, rows });
}

/**
 * Dispatch to the correct per-type builder and return its report envelope.
 *
 * Always returns the pure `{ type, title, generatedAt, count, rows }` envelope
 * (never a serialized/CSV result). Validates the type up front so an unknown
 * value fails fast with an HTTP 400; the `switch` `default` is a defensive
 * second guard that throws the same error.
 *
 * @param {string} type - One of the {@link REPORT_TYPES} values.
 * @returns {{type: string, title: string, generatedAt: string, count: number, rows: Array<Object>}}
 *   The report envelope for the requested type.
 * @throws {Error & { status: 400 }} When `type` is not a recognized report type.
 */
function buildReport(type) {
  if (!isValidReportType(type)) {
    throw reportError('Unknown report type: ' + type, 400);
  }
  switch (type) {
    case REPORT_TYPES.MEMBERS:
      return buildMembersReport();
    case REPORT_TYPES.DUES:
      return buildDuesReport();
    case REPORT_TYPES.OUTSTANDING:
      return buildOutstandingReport();
    case REPORT_TYPES.OCCUPANCY:
      return buildOccupancyReport();
    default:
      // Unreachable in practice (guarded above) but kept as a defensive backstop.
      throw reportError('Unknown report type: ' + type, 400);
  }
}

/**
 * High-level entry point used by `reportController.js` to produce a report in
 * the requested serialization format.
 *
 * The return contract is a uniform result object:
 *   `{ type, format, contentType, filename, content }`
 * where `content` is the report **envelope object** for JSON, and the **CSV
 * string** for CSV. The controller sets `Content-Type: result.contentType` (and
 * may use `result.filename` for a `Content-Disposition` header) and sends
 * `result.content`.
 *
 * Format resolution is defensive: an absent or unrecognized `options.format`
 * falls back to {@link DEFAULT_EXPORT_FORMAT} (`json`). For CSV, the report rows
 * are serialized with the type's canonical, ordered column set
 * (`reportModel.REPORT_COLUMNS[type]`) so the CSV columns match the report shape.
 *
 * @param {string} type - One of the {@link REPORT_TYPES} values.
 * @param {Object} [options={}] - Generation options.
 * @param {string} [options.format] - Desired export format (`'json'`|`'csv'`);
 *        invalid/absent values fall back to JSON.
 * @returns {{type: string, format: string, contentType: string, filename: string, content: (Object|string)}}
 *   The format-specific result envelope.
 * @throws {Error & { status: 400 }} When `type` is not a recognized report type.
 */
function generateReport(type, options = {}) {
  if (!isValidReportType(type)) {
    throw reportError('Unknown report type: ' + type, 400);
  }

  const requested = options && options.format;
  const format = isValidExportFormat(requested) ? requested : DEFAULT_EXPORT_FORMAT;

  const report = buildReport(type);

  if (format === EXPORT_FORMATS.CSV) {
    const content = csvExporter.toCsv(report.rows, reportModel.REPORT_COLUMNS[type]);
    return {
      type,
      format: EXPORT_FORMATS.CSV,
      contentType: 'text/csv',
      filename: `${type}-report.csv`,
      content,
    };
  }

  return {
    type,
    format: EXPORT_FORMATS.JSON,
    contentType: 'application/json',
    filename: `${type}-report.json`,
    content: report,
  };
}

/**
 * Produce the catalog of available reports for the index route
 * (`GET /api/reports`).
 *
 * @returns {Array<{type: string, title: string}>} One entry per report type, in
 *   the canonical {@link REPORT_TYPE_VALUES} order, each with its human-readable
 *   title from {@link REPORT_TYPE_LABELS}.
 */
function listAvailableReports() {
  return REPORT_TYPE_VALUES.map((type) => ({ type, title: REPORT_TYPE_LABELS[type] }));
}

module.exports = {
  generateReport,
  buildReport,
  listAvailableReports,
  buildMembersReport,
  buildDuesReport,
  buildOutstandingReport,
  buildOccupancyReport,
  computeDaysOverdue,
};
