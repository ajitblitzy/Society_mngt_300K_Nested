// reportModel.js - Report DTO shapes & envelope factory (pure, CommonJS, no I/O)
//
// MODEL LAYER (Reporting feature). This module owns the canonical report DTO
// shapes: it DECLARES the report "envelope" and the four per-type row shapes, and
// NORMALIZES arbitrary, loosely-typed input into those shapes. It performs pure
// shaping ONLY -- there is deliberately:
//   * NO aggregation / summation / counting    (belongs to src/services/reportService.js),
//   * NO data access / seeding                  (belongs to src/repositories/reportRepository.js),
//   * NO CSV / string serialization             (belongs to src/utils/csvExporter.js),
//   * NO HTTP / file / DB I/O, no logging, no networking, and nothing async.
// The ONLY computation permitted here is the canonical dues `balance`, which is
// ALWAYS derived as (amountDue - amountPaid); any caller-supplied balance is ignored.
//
// Consumers load this module via CommonJS `require('../models/reportModel')`:
//   - src/services/reportService.js      -> maps source rows from
//                                            reportRepository into report rows via
//                                            the ROW_FACTORIES dispatch map and
//                                            wraps them with createReport().
//   - src/utils/csvExporter.js (indirect) -> receives REPORT_COLUMNS[type] as the
//                                            `headers` array that fixes CSV column
//                                            order; the row-factory key order is
//                                            kept in lock-step with these arrays.
//   - src/controllers/reportController.js (indirect) -> relies on the same column
//                                            ordering when emitting responses.
//
// The canonical report-type values and their human-readable titles live in the
// DOMAIN layer (src/domain/report.js), which is the single source of truth. This
// model IMPORTS them rather than re-declaring or inlining any literal report-type
// strings ('members', 'dues', 'outstanding', 'occupancy').

'use strict';

// Domain constants/validators (single source of truth):
//   - REPORT_TYPES        : frozen enum of canonical report-type values
//                           ({ MEMBERS:'members', DUES:'dues',
//                             OUTSTANDING:'outstanding', OCCUPANCY:'occupancy' }).
//                           Used as the COMPUTED keys of REPORT_COLUMNS and
//                           ROW_FACTORIES so this model never hardcodes the
//                           report-type literals.
//   - REPORT_TYPE_LABELS  : frozen map of report-type value -> human title; used
//                           to label the report envelope (createReport title).
//   - isValidReportType   : pure predicate accepting only canonical report types;
//                           used to validate createReport's `type`.
const {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  isValidReportType,
} = require('../domain/report');

/**
 * Coerce an arbitrary value into a safe, trimmed string.
 *
 * `null` and `undefined` collapse to the empty string `''`; every other value is
 * stringified via `String(value)` and trimmed of surrounding whitespace. This is
 * the canonical normalizer for the string-typed report-row fields (e.g.
 * `unitNumber`, `memberName`, `email`). Pure and total: no side effects, never
 * throws, and always returns a string.
 *
 * @param {*} value - The raw field value (any type accepted).
 * @returns {string} A trimmed string, or `''` when the value is null/undefined.
 */
function toStr(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * Coerce an arbitrary value into a safe, finite number.
 *
 * A value that is already a `number` is used as-is; anything else is passed
 * through `Number(value)`. If the result is not a finite number (e.g. `NaN`,
 * `Infinity`, `-Infinity`, an unparseable string, an object), the function
 * collapses it to `0`. This is the canonical normalizer for the numeric
 * report-row fields (e.g. `amountDue`, `amountPaid`, `daysOverdue`,
 * `occupantsCount`). Pure and total: no side effects, never throws, and always
 * returns a finite number.
 *
 * @param {*} value - The raw field value (any type accepted).
 * @returns {number} A finite number, or `0` when the value is not finite.
 */
function toNum(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize a loosely-typed input into a guaranteed plain object.
 *
 * The row factories and {@link createReport} accept a destructured options
 * object. A default parameter of `{}` covers a strictly `undefined` argument, but
 * an explicit `null` (or a non-object such as a string/number) would otherwise
 * throw a cryptic destructuring `TypeError`. Routing every input through this
 * guard -- mirroring the sibling `userModel.createUser` convention -- means a
 * `null`/non-object input is treated as "no fields supplied" and surfaces the
 * documented defaults (or, for createReport, the explicit invalid-type error)
 * instead of an opaque crash.
 *
 * @param {*} input - The candidate options object.
 * @returns {Object} `input` when it is a non-null object, otherwise a fresh `{}`.
 */
function asObject(input) {
  return input && typeof input === 'object' ? input : {};
}

/**
 * createReport - envelope factory for a Society Management domain report.
 *
 * Validates the report `type` against the domain's {@link isValidReportType} and
 * wraps an (already-shaped) set of rows in a consistent, serialization-ready
 * envelope. This function performs NO aggregation and NO row shaping -- callers
 * (the service layer) build the `rows` via the per-type row factories first and
 * pass them in here.
 *
 * Returned envelope shape (exact keys, in this order):
 *   - type        : the validated canonical report-type value (echoed back).
 *   - title       : the human-readable heading from REPORT_TYPE_LABELS[type].
 *   - generatedAt : the provided timestamp, else the current ISO-8601 instant
 *                   (`new Date().toISOString()`).
 *   - count       : the number of rows in the safe rows array.
 *   - rows        : the safe rows array (the provided array, or `[]` when the
 *                   provided value is not an array).
 *
 * @param {object} [options={}] - Envelope inputs.
 * @param {string} options.type - REQUIRED canonical report type ('members',
 *   'dues', 'outstanding', or 'occupancy'); validated via isValidReportType.
 * @param {Array<Object>} [options.rows=[]] - Pre-shaped report rows. A non-array
 *   value is treated as an empty list.
 * @param {string} [options.generatedAt] - Optional ISO-8601 generation timestamp;
 *   defaults to the current instant when omitted/falsy.
 * @returns {{ type: string, title: string, generatedAt: string, count: number,
 *   rows: Array<Object> }} The normalized report envelope.
 * @throws {Error} 'reportModel.createReport: invalid report type: <type>' when
 *   `type` is not a recognized canonical report type.
 */
function createReport(options = {}) {
  const { type, rows = [], generatedAt } = asObject(options);

  if (!isValidReportType(type)) {
    throw new Error('reportModel.createReport: invalid report type: ' + type);
  }

  // Guard against a non-array `rows` (e.g. null, an object, a string): the
  // destructuring default only applies to `undefined`, so an explicit non-array
  // still needs collapsing to an empty list before `count`/`rows` are derived.
  const safeRows = Array.isArray(rows) ? rows : [];

  return {
    type,
    title: REPORT_TYPE_LABELS[type],
    generatedAt: generatedAt || new Date().toISOString(),
    count: safeRows.length,
    rows: safeRows,
  };
}

/**
 * createMemberRow - canonical row shape for the Member Directory report.
 *
 * Returns a plain object with EXACTLY these keys, all normalized to trimmed
 * strings (missing values become `''`): `unitNumber`, `memberName`, `email`,
 * `phone`, `role`. Key SET and ORDER are kept in lock-step with
 * `REPORT_COLUMNS[REPORT_TYPES.MEMBERS]`. Pure shaping only -- no validation of
 * email/phone format (that is src/utils/validation.js) and no computation.
 *
 * @param {object} [input={}] - Raw member fields.
 * @param {string} [input.unitNumber] - Unit identifier (e.g. 'A-101').
 * @param {string} [input.memberName] - Resident/member display name.
 * @param {string} [input.email] - Contact email address.
 * @param {string} [input.phone] - Contact phone number.
 * @param {string} [input.role] - Member role (e.g. 'admin' / 'member').
 * @returns {{ unitNumber: string, memberName: string, email: string,
 *   phone: string, role: string }} The normalized member row.
 */
function createMemberRow(input = {}) {
  const { unitNumber, memberName, email, phone, role } = asObject(input);
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    email: toStr(email),
    phone: toStr(phone),
    role: toStr(role),
  };
}

/**
 * createDuesRow - canonical row shape for the Dues & Collection Summary report.
 *
 * Returns a plain object with EXACTLY these keys: `unitNumber`, `memberName`,
 * `period` (trimmed strings, default `''`), `amountDue`, `amountPaid` (finite
 * numbers, default `0`), and `balance`. The `balance` field is the ONLY permitted
 * derivation in this module and is ALWAYS computed as `amountDue - amountPaid` from
 * the normalized amounts. A caller-supplied `balance` is intentionally IGNORED so it
 * can never disagree with the canonical derivation (AAP 0.5.2 / compliance criterion:
 * the dues balance must only ever be `amountDue - amountPaid`). Key SET and ORDER
 * match `REPORT_COLUMNS[REPORT_TYPES.DUES]`.
 *
 * @param {object} [input={}] - Raw dues fields. Any `balance` property is ignored.
 * @param {string} [input.unitNumber] - Unit identifier.
 * @param {string} [input.memberName] - Resident/member display name.
 * @param {string} [input.period] - Billing period (e.g. '2026-05').
 * @param {number} [input.amountDue] - Amount billed for the period.
 * @param {number} [input.amountPaid] - Amount collected for the period.
 * @returns {{ unitNumber: string, memberName: string, period: string,
 *   amountDue: number, amountPaid: number, balance: number }} The normalized dues
 *   row, with `balance` always equal to `amountDue - amountPaid`.
 */
function createDuesRow(input = {}) {
  const { unitNumber, memberName, period, amountDue, amountPaid } = asObject(input);
  const due = toNum(amountDue);
  const paid = toNum(amountPaid);
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    period: toStr(period),
    amountDue: due,
    amountPaid: paid,
    // The sole permitted derivation: the dues balance is ALWAYS computed from the
    // normalized due/paid amounts. A caller-supplied `balance` is deliberately not
    // read (it is not destructured above) so it can never override this value.
    balance: due - paid,
  };
}

/**
 * createOutstandingRow - canonical row shape for the Outstanding Payments report.
 *
 * Returns a plain object with EXACTLY these keys: `unitNumber`, `memberName`
 * (trimmed strings, default `''`), `amountDue`, `daysOverdue` (finite numbers,
 * default `0`), and `dueDate`. `dueDate` is preserved as-provided when truthy and
 * otherwise defaults to `null` (it is a date marker, not a normalized string or
 * number). Key SET and ORDER match `REPORT_COLUMNS[REPORT_TYPES.OUTSTANDING]`. No
 * computation is performed here -- the service derives `daysOverdue`/`amountDue`
 * before calling this factory.
 *
 * @param {object} [input={}] - Raw outstanding-payment fields.
 * @param {string} [input.unitNumber] - Unit identifier.
 * @param {string} [input.memberName] - Resident/member display name.
 * @param {number} [input.amountDue] - Outstanding amount owed.
 * @param {string|null} [input.dueDate] - Due date marker; `null` when omitted.
 * @param {number} [input.daysOverdue] - Number of days past the due date.
 * @returns {{ unitNumber: string, memberName: string, amountDue: number,
 *   dueDate: (string|null), daysOverdue: number }} The normalized outstanding row.
 */
function createOutstandingRow(input = {}) {
  const { unitNumber, memberName, amountDue, dueDate, daysOverdue } = asObject(input);
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    amountDue: toNum(amountDue),
    dueDate: dueDate || null,
    daysOverdue: toNum(daysOverdue),
  };
}

/**
 * createOccupancyRow - canonical row shape for the Occupancy report.
 *
 * Returns a plain object with EXACTLY these keys: `unitNumber`, `status`,
 * `occupantName` (trimmed strings, default `''`), and `occupantsCount` (finite
 * number, default `0`). Key SET and ORDER match
 * `REPORT_COLUMNS[REPORT_TYPES.OCCUPANCY]`. Pure shaping only.
 *
 * @param {object} [input={}] - Raw occupancy fields.
 * @param {string} [input.unitNumber] - Unit identifier.
 * @param {string} [input.status] - Occupancy status (e.g. 'occupied' / 'vacant').
 * @param {string} [input.occupantName] - Primary occupant display name.
 * @param {number} [input.occupantsCount] - Number of occupants in the unit.
 * @returns {{ unitNumber: string, status: string, occupantName: string,
 *   occupantsCount: number }} The normalized occupancy row.
 */
function createOccupancyRow(input = {}) {
  const { unitNumber, status, occupantName, occupantsCount } = asObject(input);
  return {
    unitNumber: toStr(unitNumber),
    status: toStr(status),
    occupantName: toStr(occupantName),
    occupantsCount: toNum(occupantsCount),
  };
}

/**
 * REPORT_COLUMNS - frozen map of report-type value -> ordered column-key array.
 *
 * Each array lists the report's columns in their canonical order and is the
 * authoritative source for CSV header ordering: the service/exporter passes
 * `REPORT_COLUMNS[type]` to `csvExporter.toCsv(rows, headers)` as the `headers`
 * argument, which fixes both the emitted header row and the per-cell column
 * order. The arrays therefore MUST stay in lock-step with the corresponding row
 * factory's key SET and ORDER:
 *   - members     -> createMemberRow
 *   - dues        -> createDuesRow
 *   - outstanding -> createOutstandingRow
 *   - occupancy   -> createOccupancyRow
 *
 * Keys are COMPUTED from REPORT_TYPES values (never inlined literals) so this map
 * cannot drift from the domain's canonical report-type vocabulary. The object is
 * frozen so the column contract cannot be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ members: string[], dues: string[], outstanding: string[], occupancy: string[] }>}
 */
const REPORT_COLUMNS = Object.freeze({
  [REPORT_TYPES.MEMBERS]: ['unitNumber', 'memberName', 'email', 'phone', 'role'],
  [REPORT_TYPES.DUES]: ['unitNumber', 'memberName', 'period', 'amountDue', 'amountPaid', 'balance'],
  [REPORT_TYPES.OUTSTANDING]: ['unitNumber', 'memberName', 'amountDue', 'dueDate', 'daysOverdue'],
  [REPORT_TYPES.OCCUPANCY]: ['unitNumber', 'status', 'occupantName', 'occupantsCount'],
});

/**
 * ROW_FACTORIES - frozen map of report-type value -> its row-factory function.
 *
 * Provides a data-driven dispatch so the service layer can resolve the correct
 * normalizer by report type (`ROW_FACTORIES[type](sourceRow)`) without a `switch`
 * statement. Keys are COMPUTED from REPORT_TYPES values (single source of truth);
 * each value is one of the per-type factory functions declared above. The object
 * is frozen so the dispatch table cannot be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ members: Function, dues: Function, outstanding: Function, occupancy: Function }>}
 */
const ROW_FACTORIES = Object.freeze({
  [REPORT_TYPES.MEMBERS]: createMemberRow,
  [REPORT_TYPES.DUES]: createDuesRow,
  [REPORT_TYPES.OUTSTANDING]: createOutstandingRow,
  [REPORT_TYPES.OCCUPANCY]: createOccupancyRow,
});

// CommonJS named exports. The envelope factory (createReport), the four per-type
// row factories, the column-order contract (REPORT_COLUMNS), and the dispatch
// table (ROW_FACTORIES) together form this model layer's complete public surface
// consumed by the reporting service, controller, and CSV exporter.
module.exports = {
  createReport,
  createMemberRow,
  createDuesRow,
  createOutstandingRow,
  createOccupancyRow,
  REPORT_COLUMNS,
  ROW_FACTORIES,
};

