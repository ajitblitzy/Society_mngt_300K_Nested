// report.js - Report-type & export-format enums and pure validators (no I/O, no deps)
//
// DOMAIN LAYER — foundational module for the Reporting feature.
// Holds the canonical report-type and export-format enumerations plus tiny,
// side-effect-free validators. This module performs NO I/O, has NO dependencies
// on any other layer (or any external/Node core module), and holds NO mutable
// state. Every exported object/array is deeply immutable via Object.freeze so
// consumers cannot accidentally tamper with the shared enumerations.
//
// Loaded with CommonJS by the following Reporting-feature modules:
//   - src/services/reportService.js  → aggregates seed data by report type.
//   - src/routes/reportRoutes.js     → validates the `:type` path param and the
//                                       `?format=csv` query against these enums.
//   - src/controllers/reportController.js → selects the response Content-Type.

'use strict';

/**
 * Canonical set of report kinds the Reporting feature can produce.
 *
 * The values are stable, lowercase, URL-safe slugs used directly as the
 * `:type` path segment of `GET /api/reports/:type`. They map to the four
 * report kinds defined for the feature:
 *   - members     → member directory
 *   - dues        → dues / collection summary
 *   - outstanding → outstanding payments
 *   - occupancy   → occupancy
 *
 * @type {Readonly<{MEMBERS: 'members', DUES: 'dues', OUTSTANDING: 'outstanding', OCCUPANCY: 'occupancy'}>}
 */
const REPORT_TYPES = Object.freeze({
  MEMBERS: 'members',
  DUES: 'dues',
  OUTSTANDING: 'outstanding',
  OCCUPANCY: 'occupancy',
});

/**
 * Frozen list of every valid report-type value, derived from {@link REPORT_TYPES}.
 * Order mirrors the declaration order of REPORT_TYPES.
 *
 * @type {ReadonlyArray<string>} e.g. ['members','dues','outstanding','occupancy']
 */
const REPORT_TYPE_VALUES = Object.freeze(Object.values(REPORT_TYPES));

/**
 * Human-readable titles for each report type, suitable for report headings and
 * CSV header rows. Keyed by the report-type value (not the enum key).
 *
 * @type {Readonly<Record<string, string>>}
 */
const REPORT_TYPE_LABELS = Object.freeze({
  members: 'Member Directory',
  dues: 'Dues & Collection Summary',
  outstanding: 'Outstanding Payments',
  occupancy: 'Occupancy',
});

/**
 * Supported serialization formats for a generated report. The `?format=csv`
 * query switches a report response to CSV; any other (or absent) value yields
 * the default JSON representation (see {@link DEFAULT_EXPORT_FORMAT}).
 *
 * @type {Readonly<{JSON: 'json', CSV: 'csv'}>}
 */
const EXPORT_FORMATS = Object.freeze({
  JSON: 'json',
  CSV: 'csv',
});

/**
 * Frozen list of every valid export-format value, derived from {@link EXPORT_FORMATS}.
 *
 * @type {ReadonlyArray<string>} e.g. ['json','csv']
 */
const EXPORT_FORMAT_VALUES = Object.freeze(Object.values(EXPORT_FORMATS));

/**
 * The serialization format used when a request supplies no (or an unrecognized)
 * `?format` query parameter.
 *
 * @type {'json'}
 */
const DEFAULT_EXPORT_FORMAT = EXPORT_FORMATS.JSON;

/**
 * Pure predicate: is the supplied value one of the recognized report types?
 *
 * Returns `false` for any unknown, blank, `undefined`, `null`, or non-string
 * input (such inputs are simply absent from {@link REPORT_TYPE_VALUES}).
 *
 * @param {*} type - Candidate report-type value (typically a request param).
 * @returns {boolean} `true` only when `type` is a valid report-type value.
 */
function isValidReportType(type) {
  return REPORT_TYPE_VALUES.includes(type);
}

/**
 * Pure predicate: is the supplied value one of the recognized serialization formats?
 *
 * Returns `false` for any unknown, blank, `undefined`, `null`, or non-string
 * input (such inputs are simply absent from {@link EXPORT_FORMAT_VALUES}).
 *
 * @param {*} format - Candidate export-format value (typically a query param).
 * @returns {boolean} `true` only when `format` is a valid export-format value.
 */
function isValidExportFormat(format) {
  return EXPORT_FORMAT_VALUES.includes(format);
}

module.exports = {
  REPORT_TYPES,
  REPORT_TYPE_VALUES,
  isValidReportType,
  EXPORT_FORMATS,
  EXPORT_FORMAT_VALUES,
  isValidExportFormat,
  DEFAULT_EXPORT_FORMAT,
  REPORT_TYPE_LABELS,
};
