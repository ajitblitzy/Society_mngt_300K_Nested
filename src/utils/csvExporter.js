// csvExporter.js - Vanilla, dependency-free RFC 4180 CSV serializer (no external packages).
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login + Reporting feature's dependency graph, alongside the other src/utils
// helpers. It turns an array of plain report-row objects into a single
// RFC 4180-compliant CSV string. It is the serialization primitive behind the
// Reporting feature's CSV download path: when a report endpoint is called with
// `?format=csv`, the service/controller layer feeds the aggregated rows through
// `toCsv` and returns the resulting text with `Content-Type: text/csv`
// (AAP 0.5.2 - Reporting flow).
//
// ZERO DEPENDENCIES BY DESIGN (AAP 0.3.1 - CSV export stays vanilla): this file
// imports NOTHING. It pulls in no CSV library (no csv-stringify, papaparse,
// fast-csv, json2csv, ...) and no other repository module, and it deliberately
// does NOT load application config. Hand-writing the small amount of escaping
// logic keeps the feature's dependency footprint minimal and removes any install
// or native-build risk.
//
// PURE & TOTAL: every export is a pure function - given the same input it returns
// the same string, it has no side effects, performs no I/O or logging, mutates
// none of its arguments, and never throws for ordinary input (including empty,
// `null`, or `undefined` values). This makes the serializer trivially
// unit-testable and safe to call from any layer.
//
// CSV INJECTION SAFE (CWE-1236): report rows can carry user-influenced data (member
// names, free-text notes, ...), so every field is also checked for a leading
// spreadsheet formula trigger (`=`, `+`, `-`, `@`, ignoring any leading whitespace)
// and neutralized with an apostrophe prefix BEFORE RFC 4180 quoting. A hostile value
// like `=2+2` or `=HYPERLINK("http://evil","x")` is therefore rendered as inert text
// (`'=2+2`) when the file is opened in a spreadsheet, instead of executing. See
// {@link escapeCsvValue}.
//
// CommonJS only: wiring is via `module.exports` (no ESM `import`/`export`). The
// existing scaffold `file_*.js` / `src/utils/filler.js` modules are read-only
// filler and are neither referenced nor imported here (AAP 0.6.2).
//
// Consumers load this module by its utils path '../utils/csvExporter', for example:
//   - src/services/reportService.js       -> serialize aggregated report rows to CSV.
//   - src/controllers/reportController.js  -> emit the CSV body for `?format=csv`.
//
// RFC 4180 reference (the rules this module implements):
//   - Records (rows) are separated by CRLF (`\r\n`); fields by comma (`,`).
//   - A field containing a comma, double-quote, CR, or LF MUST be enclosed in
//     double-quotes.
//   - A double-quote inside an enclosed field is escaped by doubling it (`"` -> `""`).

'use strict';

/**
 * The set of characters that force a field to be quoted under RFC 4180: a comma
 * (the field separator), a double-quote (the quoting character itself), or either
 * of the carriage-return / line-feed record-separator characters. Compiled once at
 * module load and reused by {@link escapeCsvValue} on every field for efficiency.
 *
 * @type {RegExp}
 */
const MUST_QUOTE = /[",\r\n]/;

/**
 * Detects a value that a spreadsheet application (Excel, LibreOffice Calc, Google
 * Sheets, ...) could interpret as a FORMULA rather than literal text - the CSV /
 * "formula" injection risk (CWE-1236). It matches when the first NON-whitespace
 * character is one of the spreadsheet formula triggers `=`, `+`, `-`, or `@`. Leading
 * whitespace (spaces, tabs, CR/LF) is skipped via `^\s*`, so a value such as
 * `'   =1+1'` or `'\t=cmd'` is still recognized as formula-leading. Compiled once at
 * module load and used by {@link escapeCsvValue} to decide whether to neutralize a cell.
 *
 * @type {RegExp}
 */
const FORMULA_LEADING_RE = /^\s*[=+\-@]/;

/**
 * The character prefixed to a formula-leading value to neutralize it. A leading
 * apostrophe is the widely recognized spreadsheet convention that forces a cell to be
 * treated as literal text, so `=1+1` stored as `'=1+1` is displayed verbatim and never
 * evaluated. It is applied before RFC 4180 quoting so the guard lives inside any
 * surrounding quotes.
 *
 * @type {string}
 */
const FORMULA_GUARD_PREFIX = "'";

/**
 * The RFC 4180 record (row) separator. Both the header row and every data row are
 * joined with this sequence by {@link toCsv}. A bare `\n` is a widely tolerated
 * fallback, but `\r\n` is the spec-mandated separator and what this module emits.
 *
 * @type {string}
 */
const RECORD_SEPARATOR = '\r\n';

/**
 * The RFC 4180 field (column) separator used to join cells within a single record.
 *
 * @type {string}
 */
const FIELD_SEPARATOR = ',';

/**
 * Escape a single field value into its RFC 4180 CSV representation, with spreadsheet
 * formula-injection neutralization for untrusted data.
 *
 * Steps:
 *   1. `null` / `undefined` collapse to the empty string `''` (an absent value is
 *      rendered as an empty, unquoted field).
 *   2. Any other value is coerced with `String(value)`, so numbers and booleans
 *      become their natural string forms (`42` -> `'42'`, `false` -> `'false'`).
 *      Report rows are expected to hold flat primitives; non-primitive values are
 *      still handled safely via `String()` (e.g. an object becomes
 *      `'[object Object]'`) and never cause a throw.
 *   3. CSV / formula injection guard (CWE-1236): if the value's first non-whitespace
 *      character is a spreadsheet formula trigger (`=`, `+`, `-`, `@`), an apostrophe
 *      is prefixed so spreadsheet software treats the cell as literal text instead of
 *      evaluating it (e.g. `=2+2` -> `'=2+2`). This runs BEFORE the RFC 4180 step so
 *      the guard apostrophe ends up inside any surrounding quotes.
 *   4. If the (possibly guarded) string contains a comma, a double-quote, a carriage
 *      return, or a line feed, the field is wrapped in double-quotes and every
 *      embedded double-quote is doubled (`"` -> `""`).
 *   5. Otherwise the string is returned verbatim, with no surrounding quotes.
 *
 * The function is pure and total: it has no side effects and returns a string for
 * every possible input.
 *
 * @param {*} value - The raw field value (any type accepted).
 * @returns {string} The escaped, CSV-safe representation of `value`.
 *
 * @example
 * escapeCsvValue('plain');        // -> 'plain'             (no quoting needed)
 * escapeCsvValue('a,b');          // -> '"a,b"'             (comma forces quoting)
 * escapeCsvValue('he said "hi"'); // -> '"he said ""hi"""'  (quote doubled + wrapped)
 * escapeCsvValue(null);           // -> ''                  (absent value)
 * escapeCsvValue(42);             // -> '42'                (number coerced)
 * escapeCsvValue('=2+2');         // -> "'=2+2"             (formula neutralized to text)
 * escapeCsvValue('-10');          // -> "'-10"              (leading '-' neutralized)
 * escapeCsvValue('=A1,B1');       // -> "\"'=A1,B1\""       (neutralized, then quoted for the comma)
 */
function escapeCsvValue(value) {
  // Treat both `null` and `undefined` as an empty field.
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // CSV / formula injection neutralization (CWE-1236), applied BEFORE RFC 4180
  // quoting. When the first non-whitespace character is a spreadsheet formula trigger
  // (`=`, `+`, `-`, `@`), prefix the value with an apostrophe so spreadsheet software
  // treats the cell as literal text rather than evaluating it as a formula. The guard
  // is added to the raw string first so that, if the value also requires RFC quoting
  // (e.g. it contains a comma), the apostrophe ends up inside the surrounding quotes.
  if (FORMULA_LEADING_RE.test(str)) {
    str = FORMULA_GUARD_PREFIX + str;
  }

  // Quote only when one of the RFC 4180 special characters is present, doubling
  // any interior double-quote as we wrap the value.
  if (MUST_QUOTE.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Serialize an array of plain row objects into an RFC 4180-compliant CSV string.
 *
 * Column selection / ordering:
 *   - When `headers` is a non-empty array, it defines BOTH the emitted header row
 *     AND the column order, and each data cell is read from a row by that key.
 *     Keys absent from a given row render as empty fields.
 *   - When `headers` is omitted (or not a non-empty array), the columns are
 *     derived from the keys of the first row (`Object.keys(rows[0])`).
 *
 * Output shape:
 *   - The first emitted line is always the (escaped) header row.
 *   - Each subsequent line is one data row, with cells in column order.
 *   - Lines are joined with CRLF (`\r\n`); cells within a line with a comma.
 *   - Every field is escaped via {@link escapeCsvValue}.
 *
 * Edge cases (handled gracefully, never throwing):
 *   - `rows` not an array, or empty, AND no `headers`: no columns are known, so
 *     the empty string `''` is returned.
 *   - `rows` empty but `headers` provided: only the header line is returned.
 *   - A `null` / `undefined` entry inside `rows`: its cells render as empty fields.
 *
 * @param {Array<Object>} rows - Array of plain objects; each object is one data row.
 *   A non-array (including `undefined`) is treated as an empty list.
 * @param {string[]} [headers] - Optional explicit column names. When provided and
 *   non-empty, controls both the header row and the column order/selection.
 * @returns {string} The serialized CSV text (without a trailing newline).
 *
 * @example
 * toCsv([{ a: 1, b: 2 }]);                 // -> 'a,b\r\n1,2'
 * toCsv([{ x: 'a,b' }]);                   // -> 'x\r\n"a,b"'
 * toCsv([{ a: 1, b: 2 }], ['b', 'a']);     // -> 'b,a\r\n2,1'  (explicit order)
 * toCsv([], ['id', 'name']);               // -> 'id,name'     (header only)
 * toCsv([]);                               // -> ''            (nothing known)
 */
function toCsv(rows, headers) {
  // Normalize `rows` to an array so a non-array / missing input degrades to
  // "no rows" instead of throwing.
  const data = Array.isArray(rows) ? rows : [];

  // Resolve the column list. An explicit, non-empty `headers` array wins;
  // otherwise fall back to the keys of the first row. `data[0] || {}` guards
  // against a `null`/`undefined` first entry so `Object.keys` is never called on
  // a non-object.
  const cols = Array.isArray(headers) && headers.length > 0
    ? headers
    : (data.length > 0 ? Object.keys(data[0] || {}) : []);

  // With no resolvable columns there is nothing meaningful to emit - not even a
  // header - so return an empty string per the documented edge case.
  if (cols.length === 0) {
    return '';
  }

  const lines = [];

  // Header row: each column name escaped, then comma-joined.
  lines.push(cols.map(escapeCsvValue).join(FIELD_SEPARATOR));

  // Data rows: for each row, pull every column value (defaulting a missing or
  // null row to empty cells), escape it, and comma-join into one record.
  for (const row of data) {
    const cells = cols.map((col) => escapeCsvValue(row ? row[col] : ''));
    lines.push(cells.join(FIELD_SEPARATOR));
  }

  // Join the header + data records with the RFC 4180 record separator. No trailing
  // CRLF is appended; callers that need one can add it themselves.
  return lines.join(RECORD_SEPARATOR);
}

// CommonJS named exports. `toCsv` is the canonical serializer and `escapeCsvValue`
// is exposed so unit tests (and any caller needing single-field escaping) can use
// it directly. `exportToCsv` is provided as a descriptive alias of `toCsv` for
// call sites that prefer the more explicit verb; it is the exact same function
// reference, not a copy.
module.exports = {
  toCsv,
  escapeCsvValue,
  exportToCsv: toCsv,
};
