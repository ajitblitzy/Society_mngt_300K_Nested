// report.js - Report-type & export-format enums and pure validators (no I/O, no deps)
//
// DOMAIN LAYER (foundational): this module sits at the bottom of the dependency
// graph. It contains only immutable constants and tiny pure functions that
// describe the Reporting feature's vocabulary (which kinds of reports exist and
// in which formats they may be exported). It performs NO I/O, has NO side
// effects, is NOT async, and imports NOTHING (no other src layers, no external
// packages, no Node core modules).
//
// Consumers load this module by its domain path '../domain/report':
//   - src/services/reportService.js    -> aggregates seed data per report type.
//   - src/routes/reportRoutes.js       -> validates the ':type' route param and
//                                          the optional '?format=' query value.
//   - src/controllers/reportController.js -> picks the response Content-Type from
//                                          the resolved export-format value.
//
// NOTE: Concrete report DTO/row shapes live in src/models/reportModel.js and the
// actual data aggregation lives in src/services/reportService.js, NOT here. This
// file deliberately holds only the canonical enums, their derived value sets,
// human-readable labels, and the matching pure validators.

'use strict';

/**
 * Canonical report-type constants for Society Management domain reports.
 *
 * Exactly four first-class report kinds exist per the product definition:
 *   - MEMBERS     -> the member directory report.
 *   - DUES        -> the dues / collection summary report.
 *   - OUTSTANDING -> the outstanding (unpaid) payments report.
 *   - OCCUPANCY   -> the unit occupancy report.
 *
 * The values are the lowercase wire strings ('members', 'dues', 'outstanding',
 * 'occupancy') used as the ':type' path segment on report endpoints and as the
 * stable identifiers passed between the route, controller, and service layers.
 * The object is frozen so these canonical values can never be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ MEMBERS: 'members', DUES: 'dues', OUTSTANDING: 'outstanding', OCCUPANCY: 'occupancy' }>}
 */
const REPORT_TYPES = Object.freeze({
  MEMBERS: 'members',
  DUES: 'dues',
  OUTSTANDING: 'outstanding',
  OCCUPANCY: 'occupancy',
});

/**
 * Frozen array of the report-type string values derived from {@link REPORT_TYPES}.
 *
 * Deriving this from `Object.values(REPORT_TYPES)` keeps it in lock-step with
 * REPORT_TYPES so there is a single source of truth: adding a report type to
 * REPORT_TYPES automatically extends the set of valid values. Used by
 * {@link isValidReportType} and by callers that need to enumerate or whitelist
 * report types. Result: `['members', 'dues', 'outstanding', 'occupancy']`.
 *
 * @constant
 * @type {ReadonlyArray<string>}
 */
const REPORT_TYPE_VALUES = Object.freeze(Object.values(REPORT_TYPES));

/**
 * Frozen map of report-type value -> human-readable title.
 *
 * Keyed by the lowercase report-type VALUE (not the enum key) so a consumer can
 * resolve a heading directly with `REPORT_TYPE_LABELS[type]` where `type` is the
 * value coming off the route/query (e.g. 'dues' -> 'Dues & Collection Summary').
 * Used for report headings and CSV header rows. Pure data only; frozen so the
 * canonical labels cannot be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ members: string, dues: string, outstanding: string, occupancy: string }>}
 */
const REPORT_TYPE_LABELS = Object.freeze({
  members: 'Member Directory',
  dues: 'Dues & Collection Summary',
  outstanding: 'Outstanding Payments',
  occupancy: 'Occupancy',
});

/**
 * Pure predicate that reports whether a given value is a recognized report type.
 *
 * Returns `true` only when `type` is strictly one of the canonical report-type
 * strings in {@link REPORT_TYPE_VALUES} ('members', 'dues', 'outstanding', or
 * 'occupancy'). Returns `false` for everything else, including `undefined`,
 * `null`, an empty/blank string, numbers, booleans, objects, and any unknown
 * string. Performs no coercion and has no side effects.
 *
 * @param {*} type - The candidate report-type value to validate.
 * @returns {boolean} `true` if `type` is a valid canonical report type, otherwise `false`.
 */
function isValidReportType(type) {
  return REPORT_TYPE_VALUES.includes(type);
}

/**
 * Canonical export-format constants for serialized report responses.
 *
 * Two output formats are supported:
 *   - JSON -> machine-readable JSON body (the default).
 *   - CSV  -> comma-separated rows for spreadsheet download.
 *
 * The values are the lowercase tokens ('json', 'csv') matched against the
 * optional '?format=' query parameter on report endpoints. The object is frozen
 * so these canonical values can never be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ JSON: 'json', CSV: 'csv' }>}
 */
const EXPORT_FORMATS = Object.freeze({
  JSON: 'json',
  CSV: 'csv',
});

/**
 * Frozen array of the export-format string values derived from
 * {@link EXPORT_FORMATS}.
 *
 * Deriving this from `Object.values(EXPORT_FORMATS)` keeps it in lock-step with
 * EXPORT_FORMATS so there is a single source of truth. Used by
 * {@link isValidExportFormat} and by callers that need to enumerate or whitelist
 * formats. Result: `['json', 'csv']`.
 *
 * @constant
 * @type {ReadonlyArray<string>}
 */
const EXPORT_FORMAT_VALUES = Object.freeze(Object.values(EXPORT_FORMATS));

/**
 * The export-format value used when a request supplies no '?format=' query parameter.
 *
 * Defaults to JSON ('json'); CSV is opt-in via an explicit `?format=csv`. Defined
 * in terms of {@link EXPORT_FORMATS} so it can never drift from the canonical set.
 *
 * @constant
 * @type {string}
 */
const DEFAULT_EXPORT_FORMAT = EXPORT_FORMATS.JSON;

/**
 * Pure predicate that reports whether a given value is a recognized export-format token.
 *
 * Returns `true` only when `format` is strictly one of the canonical format
 * strings in {@link EXPORT_FORMAT_VALUES} ('json' or 'csv'). Returns `false` for
 * everything else, including `undefined`, `null`, an empty/blank string, numbers,
 * booleans, objects, and any unknown string (e.g. 'xml'). Performs no coercion
 * and has no side effects.
 *
 * @param {*} format - The candidate export-format value to validate.
 * @returns {boolean} `true` if `format` is a valid canonical export-format token, otherwise `false`.
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
