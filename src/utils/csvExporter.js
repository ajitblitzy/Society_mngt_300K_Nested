// csvExporter.js - Vanilla RFC 4180 CSV serializer for reporting.
'use strict';

/**
 * csvExporter.js — Vanilla RFC 4180-compliant rows→CSV serializer.
 *
 * Part of the Society Management **Reporting** feature. This module turns an
 * array of flat report-row objects into a single CSV string that the reporting
 * layer (`src/services/reportService.js` / `src/controllers/reportController.js`)
 * returns when a report is requested with `?format=csv` (the controller sets the
 * `Content-Type: text/csv` response header and streams this string back).
 *
 * Design constraints (authoritative — see AAP §0.3.1 "deliberately avoided
 * dependencies" and the file's agent prompt):
 *   - VANILLA: no external CSV library (no `csv-stringify`, `papaparse`,
 *     `fast-csv`, …). Implemented by hand to keep the dependency footprint and
 *     install risk minimal.
 *   - SELF-CONTAINED: performs no module loading whatsoever. It imports
 *     nothing — not config, not any other repository module — and never
 *     references the pre-existing synthetic scaffold corpus (additive-only
 *     mandate, AAP §0.6.2).
 *   - PURE: input → output string only. No I/O, no logging, no shared mutable
 *     state. Safe to call concurrently.
 *   - CommonJS only (`module.exports`); no ESM.
 *
 * Compliance with RFC 4180 (https://www.rfc-editor.org/rfc/rfc4180):
 *   - Records (rows), including the header record, are separated by CRLF
 *     (`\r\n`).
 *   - Fields within a record are separated by a comma (`,`).
 *   - A field is enclosed in double quotes when it contains a comma, a double
 *     quote, a carriage return, or a line feed.
 *   - A double quote inside an enclosed field is escaped by doubling it (`""`).
 *
 * @module utils/csvExporter
 */

/**
 * Field delimiter used between columns within a single CSV record.
 * @type {string}
 */
const FIELD_DELIMITER = ',';

/**
 * Record (row) separator. RFC 4180 mandates CRLF between records, including
 * after the header record. `\n`-only consumers tolerate this transparently.
 * @type {string}
 */
const RECORD_SEPARATOR = '\r\n';

/**
 * Matches any character whose presence forces a field to be quoted:
 * a double quote, a comma, a carriage return, or a line feed.
 *
 * Defined once at module scope for efficiency. The regular expression has no
 * `g`/`y` flag, so it carries no `lastIndex` state between `.test()` calls and
 * is safe to share across invocations.
 *
 * @type {RegExp}
 */
const MUST_QUOTE = /[",\r\n]/;

/**
 * Escape a single value into an RFC 4180-safe CSV field.
 *
 * Rules applied, in order:
 *   1. `null` and `undefined` coerce to the empty string `''`.
 *   2. Every other value is coerced with `String(value)` (so numbers, booleans,
 *      bigints, etc. become their natural string form). Report rows are flat
 *      primitives, so `String()` is the correct, lossless coercion here.
 *   3. If the resulting string contains a comma, double quote, carriage return,
 *      or line feed, the field is wrapped in double quotes and any embedded
 *      double quote is doubled (`"` → `""`).
 *   4. Otherwise the string is emitted verbatim (unquoted).
 *
 * @param {*} value - The raw cell value to escape.
 * @returns {string} The CSV-safe field representation.
 *
 * @example
 * escapeCsvValue('plain');            // => 'plain'
 * escapeCsvValue('a,b');              // => '"a,b"'
 * escapeCsvValue('he said "hi"');     // => '"he said ""hi"""'
 * escapeCsvValue(null);               // => ''
 * escapeCsvValue(42);                 // => '42'
 */
function escapeCsvValue(value) {
  // Treat both null and undefined as an empty field (never the literal
  // strings "null"/"undefined").
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Quote only when required by RFC 4180; double any embedded quotes first.
  if (MUST_QUOTE.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Serialize an array of plain row objects into an RFC 4180-compliant CSV string.
 *
 * Column resolution:
 *   - When `headers` is a non-empty array, it defines BOTH the header record and
 *     the column order, and each data cell is read from `row[header]`. Keys that
 *     are absent on a given row serialize to an empty field.
 *   - When `headers` is omitted (or not a non-empty array), the columns are
 *     derived from the keys of the first row (`Object.keys(rows[0])`).
 *
 * Output:
 *   - The first record is always the header record (it may be empty when no
 *     columns can be resolved).
 *   - One record follows per element of `rows`.
 *   - Records are joined with CRLF (`\r\n`); fields with commas/quotes/newlines
 *     are quoted and escaped via {@link escapeCsvValue}.
 *
 * Edge-case behavior:
 *   - `rows` is not an array (e.g. `undefined`/`null`): treated as `[]`.
 *   - No rows and no headers: returns `''` (no columns are known).
 *   - No rows but headers provided: returns just the header record.
 *   - A falsy element inside `rows` (e.g. `null`): all its cells serialize to
 *     empty fields rather than throwing.
 *
 * @param {Array<Object>} rows - Data rows; each object is one CSV record.
 * @param {string[]} [headers] - Optional explicit column names (order + keys).
 * @returns {string} The serialized CSV document (no trailing newline).
 *
 * @example
 * toCsv([{ a: 1, b: 2 }]);                 // => 'a,b\r\n1,2'
 * toCsv([{ x: 'a,b' }]);                   // => 'x\r\n"a,b"'
 * toCsv([{ a: 1, b: 2 }], ['b', 'a']);     // => 'b,a\r\n2,1'
 * toCsv([], ['name', 'email']);            // => 'name,email'
 * toCsv();                                 // => ''
 */
function toCsv(rows, headers) {
  // Defensive normalization: anything that is not an array becomes empty.
  const data = Array.isArray(rows) ? rows : [];

  // Resolve the column set: explicit headers win; otherwise infer from the
  // first row; otherwise there are no columns.
  const cols =
    Array.isArray(headers) && headers.length > 0
      ? headers
      : data.length > 0
        ? Object.keys(data[0])
        : [];

  const lines = [];

  // Header record (escaped so that header names containing special characters
  // remain RFC 4180-compliant).
  lines.push(cols.map(escapeCsvValue).join(FIELD_DELIMITER));

  // Data records — one per row, projected onto the resolved column order.
  for (const row of data) {
    const record = cols
      .map((col) => escapeCsvValue(row ? row[col] : ''))
      .join(FIELD_DELIMITER);
    lines.push(record);
  }

  return lines.join(RECORD_SEPARATOR);
}

/**
 * Public API.
 *
 * `toCsv` is the canonical serializer. `escapeCsvValue` is exported so unit
 * tests (and any caller needing single-field escaping) can use it directly.
 * `exportToCsv` is an explicit alias of `toCsv` provided for interoperability
 * with callers that prefer the more descriptive name.
 */
module.exports = {
  toCsv,
  escapeCsvValue,
  exportToCsv: toCsv,
};
