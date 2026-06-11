// reportService.js - Reporting business logic (CommonJS): aggregate seed data into domain reports; optional CSV. No auth here.
//
// SERVICE LAYER (Reporting feature). This module is the orchestration core of the
// Reporting feature: it READS the feature's raw seeded source rows from the
// repository, AGGREGATES / SHAPES them into the four canonical Society Management
// domain reports via the model's row factories and envelope factory, and -- when
// asked -- SERIALIZES a report to CSV via the utils exporter. It owns ONLY
// business/aggregation logic:
//   * It maps source rows to report rows and derives the `outstanding` view
//     (filter unpaid + compute daysOverdue), which is the one calculation that is
//     intentionally NOT performed by the repository or the model.
//   * It resolves the requested export format and returns a transport-neutral
//     result envelope the controller can write directly to the HTTP response.
//
// By design this layer contains:
//   * NO authentication / authorization logic of any kind -- no JWT, no roles, no
//     token checks. Access control for every report endpoint is enforced upstream
//     in src/routes/reportRoutes.js via src/middleware/authMiddleware.js. (AAP 0.5.2)
//   * NO Express / HTTP coupling -- no `req`, no `res`, no `next`. It is a plain
//     data service callable from a controller, a test, or any other caller.
//   * NO data access / seeding (that is src/repositories/reportRepository.js),
//   * NO DTO field normalization (that is src/models/reportModel.js),
//   * NO hand-rolled CSV string building (that is src/utils/csvExporter.js),
//   * NO database, ORM, file, or network I/O, no logging, and nothing async.
//
// CommonJS only: wiring is via `require(...)` / `module.exports` (no ESM
// `import`/`export`). This new wiring is the sanctioned additive convention for
// the feature (AAP 0.1.2 / 0.8); the existing scaffold `file_*.js` /
// `src/utils/filler.js` modules are read-only synthetic filler and are neither
// referenced nor imported here, and remain byte-identical (AAP 0.6.2, C1/C5).
//
// Consumers load this module by its service path '../services/reportService':
//   - src/controllers/reportController.js -> calls listAvailableReports() for the
//     index route and generateReport(type, { format }) for a single report,
//     writing result.content with `Content-Type: result.contentType`.
//   - tests/unit/reportService.test.js    -> exercises the builders and
//     computeDaysOverdue() directly for deterministic aggregation assertions.

'use strict';

// In-memory report-source data access. Each method returns fresh CLONES of the
// seed rows, so this service can map / filter / reshape them freely without ever
// mutating the repository's canonical seed.
//   - getMembers()   -> [{ unitNumber, memberName, email, phone, role }]
//   - getDues()      -> [{ unitNumber, memberName, period, amountDue, amountPaid, dueDate }]
//                       (RAW rows: they carry `dueDate` but NO `balance`)
//   - getOccupancy() -> [{ unitNumber, status, occupantName, occupantsCount }]
const reportRepository = require('../repositories/reportRepository');

// Report DTO factories + column metadata (pure shaping, no aggregation):
//   - createReport({ type, rows, generatedAt }) -> { type, title, generatedAt, count, rows }
//   - createMemberRow / createDuesRow / createOutstandingRow / createOccupancyRow
//       (createDuesRow DERIVES `balance = amountDue - amountPaid` and DROPS `dueDate`)
//   - REPORT_COLUMNS[type] -> ordered column-key array, passed as the CSV `headers`.
const reportModel = require('../models/reportModel');

// Report domain vocabulary (single source of truth -- never inline the literals):
//   - REPORT_TYPES / REPORT_TYPE_VALUES / isValidReportType
//   - EXPORT_FORMATS / DEFAULT_EXPORT_FORMAT / isValidExportFormat
//   - REPORT_TYPE_LABELS (report-type value -> human title)
const {
  REPORT_TYPES,
  REPORT_TYPE_VALUES,
  isValidReportType,
  EXPORT_FORMATS,
  DEFAULT_EXPORT_FORMAT,
  isValidExportFormat,
  REPORT_TYPE_LABELS,
} = require('../domain/report');

// Vanilla, dependency-free RFC 4180 CSV serializer. `toCsv(rows, headers)` fixes
// the emitted column order/selection from the `headers` array.
const csvExporter = require('../utils/csvExporter');

/**
 * Number of milliseconds in one calendar day (24h * 60m * 60s * 1000ms).
 *
 * Used by {@link computeDaysOverdue} to convert a positive "now minus due date"
 * millisecond delta into a whole-day count. Daylight-saving / leap-second nuance
 * is intentionally ignored: report aging is reported in whole 24-hour days, which
 * is sufficient and deterministic for a dues-overdue figure.
 *
 * @constant
 * @type {number}
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build an Error carrying a numeric HTTP-ish `.status`, matching the application's
 * shared error envelope convention.
 *
 * The centralized error handler (src/middleware/errorHandler.js) renders forwarded
 * errors as `{ error: { message, status } }`, deriving the HTTP status code from
 * this `.status` property. Attaching the status at the throw site lets the service
 * signal a client error (e.g. an unknown report type -> 400) without importing or
 * depending on Express. This helper is private (NOT exported).
 *
 * @param {string} message - Human-readable error message.
 * @param {number} status - Numeric status code to attach (e.g. 400).
 * @returns {Error} A new Error whose `status` property is set to `status`.
 */
function reportError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Compute how many WHOLE days a due date is overdue relative to a reference clock.
 *
 * Pure and deterministic for a given pair of inputs. The optional `now` parameter
 * (defaulting to the current wall-clock instant) is what makes the function unit
 * testable: a test can pin a fixed reference time and assert an exact day count,
 * while production callers simply omit it. The result is always a non-negative
 * integer:
 *   - a missing / falsy `dueDate` yields `0` (nothing is owed/aged),
 *   - an unparseable `dueDate` (NaN epoch) yields `0` rather than throwing,
 *   - a due date that is in the future (or exactly `now`) yields `0`,
 *   - otherwise the elapsed time is floored to whole days.
 *
 * @param {(string|number|Date)} dueDate - The due date in any form `new Date(...)`
 *   accepts (ISO-8601 string, epoch ms, or Date). Falsy values mean "no due date".
 * @param {number} [now=Date.now()] - Reference instant in epoch milliseconds.
 *   Defaults to the current time; pass a fixed value for deterministic tests.
 * @returns {number} Whole days overdue (>= 0); `0` when not overdue or undeterminable.
 *
 * @example
 * computeDaysOverdue('2026-05-10', Date.parse('2026-05-20')); // -> 10
 * computeDaysOverdue('2999-01-01');                           // -> 0 (future)
 * computeDaysOverdue(null);                                   // -> 0 (no date)
 * computeDaysOverdue('not-a-date');                           // -> 0 (unparseable)
 */
function computeDaysOverdue(dueDate, now = Date.now()) {
  if (!dueDate) {
    return 0;
  }
  const due = new Date(dueDate).getTime();
  // `new Date('not-a-date').getTime()` is NaN; guard so a bad value yields 0.
  if (!Number.isFinite(due)) {
    return 0;
  }
  const diff = now - due;
  // Not yet due (future or exactly now) -> nothing overdue.
  if (diff <= 0) {
    return 0;
  }
  return Math.floor(diff / DAY_MS);
}

/**
 * Build the Member Directory report (`members`).
 *
 * Maps every member source row straight through the model's `createMemberRow`
 * normalizer and wraps the result in a report envelope. A direct 1:1 map -- no
 * filtering or aggregation.
 *
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<{ unitNumber: string, memberName: string, email: string,
 *   phone: string, role: string }> }} The Member Directory report envelope.
 */
function buildMembersReport() {
  const rows = reportRepository.getMembers().map((m) => reportModel.createMemberRow(m));
  return reportModel.createReport({ type: REPORT_TYPES.MEMBERS, rows });
}

/**
 * Build the Dues & Collection Summary report (`dues`).
 *
 * Maps every dues source row through the model's `createDuesRow`, which derives
 * `balance = amountDue - amountPaid`. A direct 1:1 map over all periods present in
 * the source (current + history) -- no filtering. Note the model intentionally
 * drops the source row's `dueDate`; that field is only needed by the derived
 * `outstanding` report (see {@link buildOutstandingReport}).
 *
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<{ unitNumber: string, memberName: string, period: string,
 *   amountDue: number, amountPaid: number, balance: number }> }} The dues report envelope.
 */
function buildDuesReport() {
  const rows = reportRepository.getDues().map((d) => reportModel.createDuesRow(d));
  return reportModel.createReport({ type: REPORT_TYPES.DUES, rows });
}

/**
 * Build the Occupancy report (`occupancy`).
 *
 * Maps every occupancy source row straight through the model's
 * `createOccupancyRow` normalizer and wraps the result in a report envelope. A
 * direct 1:1 map -- no filtering or aggregation.
 *
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<{ unitNumber: string, status: string, occupantName: string,
 *   occupantsCount: number }> }} The occupancy report envelope.
 */
function buildOccupancyReport() {
  const rows = reportRepository.getOccupancy().map((o) => reportModel.createOccupancyRow(o));
  return reportModel.createReport({ type: REPORT_TYPES.OCCUPANCY, rows });
}

/**
 * Build the Outstanding Payments report (`outstanding`) -- a service-DERIVED view.
 *
 * There is intentionally no `reportRepository.getOutstanding()`; this report is
 * computed here from the RAW dues rows. The raw rows are used (rather than
 * `createDuesRow` results) precisely because the raw rows still carry `dueDate`,
 * which the model's dues factory drops -- and `dueDate` is required to age each
 * unpaid balance.
 *
 * Derivation, in order:
 *   1. For each raw dues row, compute `balance = amountDue - amountPaid` (numeric
 *      coercion guards against missing/non-numeric source fields).
 *   2. Keep ONLY rows with a strictly positive balance (units that still owe
 *      money); fully-paid rows are excluded.
 *   3. Shape each kept row with `createOutstandingRow`, where:
 *        - `amountDue` is set to the REMAINING UNPAID BALANCE (NOT the original
 *          billed amount) -- this is the meaningful "outstanding" figure;
 *        - `dueDate` is carried from the raw row;
 *        - `daysOverdue` is derived from that `dueDate` via {@link computeDaysOverdue}.
 *
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<{ unitNumber: string, memberName: string, amountDue: number,
 *   dueDate: (string|null), daysOverdue: number }> }} The outstanding report envelope.
 */
function buildOutstandingReport() {
  const rows = reportRepository.getDues()
    .map((d) => {
      const amountDue = Number(d.amountDue) || 0;
      const amountPaid = Number(d.amountPaid) || 0;
      return { source: d, balance: amountDue - amountPaid };
    })
    // Only units that still owe money belong on the outstanding report.
    .filter((x) => x.balance > 0)
    .map((x) => reportModel.createOutstandingRow({
      unitNumber: x.source.unitNumber,
      memberName: x.source.memberName,
      // `amountDue` here is the REMAINING (unpaid) balance, not the original bill.
      amountDue: x.balance,
      // `dueDate` is available only on the RAW dues row (the model drops it).
      dueDate: x.source.dueDate,
      daysOverdue: computeDaysOverdue(x.source.dueDate),
    }));
  return reportModel.createReport({ type: REPORT_TYPES.OUTSTANDING, rows });
}

/**
 * Build a single domain report by type and return its pure envelope object.
 *
 * Validates the requested type against the domain whitelist, then dispatches to
 * the matching per-type builder. Always returns the canonical report envelope
 * `{ type, title, generatedAt, count, rows }` (never a serialized/transport form);
 * use {@link generateReport} when an export-format-aware result is needed.
 *
 * @param {string} type - A canonical report type ('members' | 'dues' |
 *   'outstanding' | 'occupancy').
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<Object> }} The report envelope for the requested type.
 * @throws {Error} A 400 error (with numeric `.status`) when `type` is unknown.
 */
function buildReport(type) {
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
      // Generic message ONLY: never interpolate the untrusted `type` (the raw,
      // URL-decoded `:type` path segment) into the error. Echoing it would reflect
      // attacker-controlled input into BOTH the client response body AND the
      // centralized WARN log (errorHandler logs `err.message` for 4xx). The 400
      // status still marks this a client error; the request URL - which Express
      // keeps percent-ENCODED on `req.originalUrl` - is still logged separately by
      // requestLogger/errorHandler for diagnostics, so no signal is lost.
      throw reportError('Unknown report type', 400);
  }
}

/**
 * High-level entry point used by the controller: build a report and return it in
 * the requested export format, wrapped in a transport-neutral result envelope.
 *
 * Behavior:
 *   - Validates `type` first (an unknown type throws a 400 error).
 *   - Resolves the format DEFENSIVELY: an absent or unrecognized `options.format`
 *     (e.g. `'xml'`, `undefined`, `null`) falls back to {@link DEFAULT_EXPORT_FORMAT}
 *     (JSON). Only a recognized format is honored.
 *   - For CSV, the report rows are serialized with `csvExporter.toCsv` using
 *     `REPORT_COLUMNS[type]` as the header/column order, and `content` is the CSV
 *     STRING.
 *   - Otherwise `content` is the report ENVELOPE OBJECT (JSON-friendly).
 *
 * Return contract (consumed by src/controllers/reportController.js):
 *   `{ type, format, contentType, filename, content }`
 * The controller sets `Content-Type: result.contentType`, may use `filename` for a
 * `Content-Disposition` header, and sends `result.content` as the body.
 *
 * @param {string} type - A canonical report type ('members' | 'dues' |
 *   'outstanding' | 'occupancy').
 * @param {object} [options={}] - Generation options.
 * @param {string} [options.format] - Requested export format ('json' | 'csv');
 *   unrecognized/absent values fall back to JSON.
 * @returns {{ type: string, format: string, contentType: string, filename: string,
 *   content: (Object|string) }} The export result. `content` is the report
 *   envelope object for JSON and the CSV string for CSV.
 * @throws {Error} A 400 error (with numeric `.status`) when `type` is unknown.
 */
function generateReport(type, options = {}) {
  // Validate up front so an unknown type fails fast with a 400 before any work.
  if (!isValidReportType(type)) {
    // Generic message ONLY (no raw `type` interpolation) - mirrors buildReport's
    // default branch: the untrusted, URL-decoded `:type` must never be reflected
    // into the response body or the WARN log. Status 400 still marks the client error.
    throw reportError('Unknown report type', 400);
  }

  // Defensive format resolution: honor only a recognized format, else default JSON.
  const requested = options && options.format;
  const format = isValidExportFormat(requested) ? requested : DEFAULT_EXPORT_FORMAT;

  const report = buildReport(type);

  if (format === EXPORT_FORMATS.CSV) {
    // Column order/selection is fixed by the model's per-type header array so the
    // CSV columns line up exactly with the report's row shape.
    const content = csvExporter.toCsv(report.rows, reportModel.REPORT_COLUMNS[type]);
    return {
      type,
      format: EXPORT_FORMATS.CSV,
      contentType: 'text/csv',
      filename: `${type}-report.csv`,
      content,
    };
  }

  // Default JSON result: the envelope object itself is the content.
  return {
    type,
    format: EXPORT_FORMATS.JSON,
    contentType: 'application/json',
    filename: `${type}-report.json`,
    content: report,
  };
}

/**
 * List the available report types as a catalog, for the `GET /api/reports` index.
 *
 * Derived from the domain's canonical {@link REPORT_TYPE_VALUES} so it can never
 * drift from the supported set, pairing each type value with its human-readable
 * title from {@link REPORT_TYPE_LABELS}.
 *
 * @returns {Array<{ type: string, title: string }>} One entry per canonical report
 *   type, in domain order (members, dues, outstanding, occupancy).
 */
function listAvailableReports() {
  return REPORT_TYPE_VALUES.map((type) => ({ type, title: REPORT_TYPE_LABELS[type] }));
}

// CommonJS named exports. `generateReport` and `listAvailableReports` are the
// high-level entry points the controller consumes; `buildReport` and the four
// per-type builders plus `computeDaysOverdue` are exported so unit tests can
// assert aggregation/derivation correctness deterministically.
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
