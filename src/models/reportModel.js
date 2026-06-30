// reportModel.js - Report DTO shapes & envelope factory (pure, CommonJS, no I/O)
//
// MODEL LAYER — canonical data-transfer-object shapes for the Reporting feature.
// This module DECLARES the canonical report-row shapes and the report envelope,
// and NORMALIZES already-provided field values into those shapes. It contains
// pure, side-effect-free factory functions only:
//   - NO aggregation / summation / counting business logic (that is the job of
//     src/services/reportService.js).
//   - NO repository / database / file / HTTP I/O of any kind.
//   - NO CSV string-building (that is the job of src/utils/csvExporter.js).
//   - NO external/third-party dependencies. The single default-timestamp helper
//     uses the Node/JS built-in `Date`.
//
// Consumed (via CommonJS `require('../models/reportModel')`) by:
//   - src/services/reportService.js     → builds rows with the per-type factories
//                                          and wraps them in createReport(...).
//   - src/utils/csvExporter.js /
//     src/controllers/reportController.js → rely on REPORT_COLUMNS for the stable
//                                          CSV/JSON column ordering.
//
// The four report kinds (members, dues, outstanding, occupancy) and their
// human-readable titles are sourced exclusively from the domain enumeration in
// src/domain/report.js — report-type string literals are NEVER inlined here.

'use strict';

const {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  isValidReportType,
} = require('../domain/report');

/* -------------------------------------------------------------------------- */
/* Internal coercion helpers (pure)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Coerce an arbitrary value into a trimmed string.
 *
 * `null` and `undefined` collapse to the empty string `''`; every other value
 * is stringified via `String(...)` and surrounding whitespace is trimmed. This
 * guarantees every "string" column in a report row is always a real string,
 * never `null`/`undefined`, which keeps downstream JSON and CSV serialization
 * deterministic.
 *
 * @param {*} v - Candidate value for a string field.
 * @returns {string} The trimmed string form of `v`, or `''` when `v` is nullish.
 */
const toStr = (v) => (v == null ? '' : String(v).trim());

/**
 * Coerce an arbitrary value into a finite number.
 *
 * Values that are already numbers are passed through; anything else is run
 * through `Number(...)`. Any result that is not a finite number (`NaN`,
 * `Infinity`, `-Infinity`, or an unparseable value) defaults to `0`. This keeps
 * numeric report columns safe to sum, format, and serialize.
 *
 * @param {*} v - Candidate value for a numeric field.
 * @returns {number} A finite number, or `0` when `v` cannot be parsed finitely.
 */
const toNum = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* -------------------------------------------------------------------------- */
/* Report envelope factory                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} ReportEnvelope
 * @property {string} type        - The validated report-type value (a REPORT_TYPES value).
 * @property {string} title       - Human-readable title from REPORT_TYPE_LABELS[type].
 * @property {string} generatedAt - ISO-8601 timestamp the report was generated.
 * @property {number} count       - Number of rows in the report (rows.length).
 * @property {Array<Object>} rows  - The (already-shaped) report rows.
 */

/**
 * Build a report envelope wrapping a set of already-shaped rows.
 *
 * This is a pure shaping factory: it validates the report type, attaches the
 * canonical title and a generation timestamp, and reports the row count. It does
 * NOT generate, fetch, aggregate, or transform the rows themselves — callers
 * (typically src/services/reportService.js) build rows with the per-type row
 * factories below and hand them in here.
 *
 * @param {Object} [params]                 - Envelope parameters.
 * @param {string} params.type              - Report type; MUST satisfy isValidReportType.
 * @param {Array<Object>} [params.rows=[]]  - Pre-shaped rows; a non-array is treated as `[]`.
 * @param {string} [params.generatedAt]     - Optional ISO timestamp; defaults to now (UTC ISO-8601).
 * @returns {ReportEnvelope} The assembled report envelope.
 * @throws {Error} If `type` is not a recognized report type.
 */
function createReport({ type, rows = [], generatedAt } = {}) {
  if (!isValidReportType(type)) {
    throw new Error('reportModel.createReport: invalid report type: ' + type);
  }
  const safeRows = Array.isArray(rows) ? rows : [];
  return {
    type,
    title: REPORT_TYPE_LABELS[type],
    generatedAt: generatedAt || new Date().toISOString(),
    count: safeRows.length,
    rows: safeRows,
  };
}

/* -------------------------------------------------------------------------- */
/* Per-type row factories (pure normalizers)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a single Member Directory row.
 *
 * All fields are string columns; missing/nullish values become `''`.
 *
 * @param {Object} [params]            - Raw member fields.
 * @param {*} [params.unitNumber]      - Unit / flat identifier.
 * @param {*} [params.memberName]      - Member's full name.
 * @param {*} [params.email]           - Contact email address.
 * @param {*} [params.phone]           - Contact phone number.
 * @param {*} [params.role]            - Member role (e.g. owner, tenant, admin).
 * @returns {{unitNumber:string, memberName:string, email:string, phone:string, role:string}}
 */
function createMemberRow({ unitNumber, memberName, email, phone, role } = {}) {
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    email: toStr(email),
    phone: toStr(phone),
    role: toStr(role),
  };
}

/**
 * Normalize a single Dues & Collection Summary row.
 *
 * `unitNumber`, `memberName`, and `period` are string columns (default `''`).
 * `amountDue` and `amountPaid` are numeric columns (default `0`). `balance` is
 * numeric: when it is not provided (nullish) it is derived as
 * `amountDue - amountPaid` — the ONLY computation this module performs — and
 * otherwise the provided value is coerced to a finite number.
 *
 * @param {Object} [params]          - Raw dues fields.
 * @param {*} [params.unitNumber]    - Unit / flat identifier.
 * @param {*} [params.memberName]    - Member's full name.
 * @param {*} [params.period]        - Billing period label (e.g. '2026-01').
 * @param {*} [params.amountDue]     - Amount billed for the period.
 * @param {*} [params.amountPaid]    - Amount paid against the period.
 * @param {*} [params.balance]       - Optional explicit balance; defaults to due − paid.
 * @returns {{unitNumber:string, memberName:string, period:string, amountDue:number, amountPaid:number, balance:number}}
 */
function createDuesRow({ unitNumber, memberName, period, amountDue, amountPaid, balance } = {}) {
  const due = toNum(amountDue);
  const paid = toNum(amountPaid);
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    period: toStr(period),
    amountDue: due,
    amountPaid: paid,
    balance: balance == null ? due - paid : toNum(balance),
  };
}

/**
 * Normalize a single Outstanding Payments row.
 *
 * `unitNumber` and `memberName` are string columns (default `''`). `amountDue`
 * and `daysOverdue` are numeric columns (default `0`). `dueDate` is passed
 * through as-is when truthy and defaults to `null` otherwise (it is a date-like
 * value, not coerced to a string or number here).
 *
 * @param {Object} [params]          - Raw outstanding-payment fields.
 * @param {*} [params.unitNumber]    - Unit / flat identifier.
 * @param {*} [params.memberName]    - Member's full name.
 * @param {*} [params.amountDue]     - Outstanding amount due.
 * @param {*} [params.dueDate]       - Due date (date-like value); defaults to null.
 * @param {*} [params.daysOverdue]   - Number of days past due.
 * @returns {{unitNumber:string, memberName:string, amountDue:number, dueDate:(*|null), daysOverdue:number}}
 */
function createOutstandingRow({ unitNumber, memberName, amountDue, dueDate, daysOverdue } = {}) {
  return {
    unitNumber: toStr(unitNumber),
    memberName: toStr(memberName),
    amountDue: toNum(amountDue),
    dueDate: dueDate || null,
    daysOverdue: toNum(daysOverdue),
  };
}

/**
 * Normalize a single Occupancy row.
 *
 * `unitNumber`, `status`, and `occupantName` are string columns (default `''`).
 * `occupantsCount` is a numeric column (default `0`).
 *
 * @param {Object} [params]            - Raw occupancy fields.
 * @param {*} [params.unitNumber]      - Unit / flat identifier.
 * @param {*} [params.status]          - Occupancy status (e.g. occupied, vacant).
 * @param {*} [params.occupantName]    - Primary occupant's name.
 * @param {*} [params.occupantsCount]  - Number of occupants in the unit.
 * @returns {{unitNumber:string, status:string, occupantName:string, occupantsCount:number}}
 */
function createOccupancyRow({ unitNumber, status, occupantName, occupantsCount } = {}) {
  return {
    unitNumber: toStr(unitNumber),
    status: toStr(status),
    occupantName: toStr(occupantName),
    occupantsCount: toNum(occupantsCount),
  };
}

/* -------------------------------------------------------------------------- */
/* Frozen lookup maps (keyed by REPORT_TYPES values)                          */
/* -------------------------------------------------------------------------- */

/**
 * Ordered column-key arrays per report type.
 *
 * Drives stable header/column ordering for CSV (src/utils/csvExporter.js) and
 * JSON serialization (src/services/reportService.js). Each key is a REPORT_TYPES
 * VALUE (computed key) and each array MUST match the field declaration order of
 * the corresponding row factory above. Deeply frozen so consumers cannot mutate
 * the shared ordering.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const REPORT_COLUMNS = Object.freeze({
  [REPORT_TYPES.MEMBERS]:     ['unitNumber', 'memberName', 'email', 'phone', 'role'],
  [REPORT_TYPES.DUES]:        ['unitNumber', 'memberName', 'period', 'amountDue', 'amountPaid', 'balance'],
  [REPORT_TYPES.OUTSTANDING]: ['unitNumber', 'memberName', 'amountDue', 'dueDate', 'daysOverdue'],
  [REPORT_TYPES.OCCUPANCY]:   ['unitNumber', 'status', 'occupantName', 'occupantsCount'],
});

/**
 * Dispatch map from report type to its row-factory function.
 *
 * Lets src/services/reportService.js select the correct normalizer by type
 * without a `switch`. Each key is a REPORT_TYPES VALUE (computed key). Frozen so
 * the dispatch table cannot be reassigned by consumers.
 *
 * @type {Readonly<Record<string, Function>>}
 */
const ROW_FACTORIES = Object.freeze({
  [REPORT_TYPES.MEMBERS]: createMemberRow,
  [REPORT_TYPES.DUES]: createDuesRow,
  [REPORT_TYPES.OUTSTANDING]: createOutstandingRow,
  [REPORT_TYPES.OCCUPANCY]: createOccupancyRow,
});

module.exports = {
  createReport,
  createMemberRow,
  createDuesRow,
  createOutstandingRow,
  createOccupancyRow,
  REPORT_COLUMNS,
  ROW_FACTORIES,
};
