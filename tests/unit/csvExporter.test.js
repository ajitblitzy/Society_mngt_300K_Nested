// csvExporter.test.js - unit tests for the vanilla RFC 4180 CSV serializer
// (src/utils/csvExporter.js).
//
// These tests pin down two responsibilities of the serializer:
//   1. RFC 4180 escaping  - correct quoting/doubling for commas, double-quotes, and
//      CR/LF, plus null/undefined/number coercion and header handling.
//   2. CSV / formula injection safety (CWE-1236) - values whose first non-whitespace
//      character is a spreadsheet formula trigger (`=`, `+`, `-`, `@`) are neutralized
//      with a leading apostrophe BEFORE RFC quoting, so they cannot execute when the
//      CSV is opened in a spreadsheet. Added in response to the foundation code review.
//
// The module is dependency-free and pure, so the tests simply require it and assert on
// returned strings - no mocks, no I/O, no framework setup beyond Jest.

'use strict';

const { toCsv, escapeCsvValue, exportToCsv } = require('../../src/utils/csvExporter');

// Readable building blocks for the tricky expected strings below.
const QUOTE = '"';
const APOS = "'";
const CRLF = '\r\n';

describe('escapeCsvValue - RFC 4180 escaping', () => {
  test('returns plain values verbatim (no quoting needed)', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
    expect(escapeCsvValue('hello world')).toBe('hello world');
  });

  test('coerces null and undefined to an empty field', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  test('coerces numbers and booleans to their string forms', () => {
    expect(escapeCsvValue(42)).toBe('42');
    expect(escapeCsvValue(0)).toBe('0');
    expect(escapeCsvValue(false)).toBe('false');
    expect(escapeCsvValue(true)).toBe('true');
  });

  test('quotes values containing a comma', () => {
    expect(escapeCsvValue('a,b')).toBe(QUOTE + 'a,b' + QUOTE);
  });

  test('quotes and doubles embedded double-quotes', () => {
    // he said "hi"  ->  "he said ""hi"""
    expect(escapeCsvValue('he said "hi"')).toBe('"he said ""hi"""');
    // a lone double-quote becomes """" (wrapped + doubled)
    expect(escapeCsvValue('"')).toBe('""""');
  });

  test('quotes values containing CR, LF, or CRLF', () => {
    expect(escapeCsvValue('a\rb')).toBe(QUOTE + 'a\rb' + QUOTE);
    expect(escapeCsvValue('a\nb')).toBe(QUOTE + 'a\nb' + QUOTE);
    expect(escapeCsvValue('line1\r\nline2')).toBe(QUOTE + 'line1\r\nline2' + QUOTE);
  });

  test('returns an empty string for an empty-string input', () => {
    expect(escapeCsvValue('')).toBe('');
  });
});

describe('escapeCsvValue - CSV/formula injection neutralization (CWE-1236)', () => {
  test('neutralizes values whose first character is a formula trigger', () => {
    expect(escapeCsvValue('=2+2')).toBe(APOS + '=2+2');
    expect(escapeCsvValue('+SUM(A1:A2)')).toBe(APOS + '+SUM(A1:A2)');
    expect(escapeCsvValue('-10+20')).toBe(APOS + '-10+20');
    expect(escapeCsvValue('@cmd')).toBe(APOS + '@cmd');
  });

  test('neutralizes a leading negative number (documented OWASP trade-off)', () => {
    expect(escapeCsvValue('-10')).toBe(APOS + '-10');
  });

  test('neutralizes when a formula trigger follows leading whitespace/tab', () => {
    expect(escapeCsvValue('   =2+2')).toBe(APOS + '   =2+2');
    expect(escapeCsvValue('\t=2+2')).toBe(APOS + '\t=2+2');
  });

  test('neutralizes AND RFC-quotes a formula value that also contains a delimiter', () => {
    // =A1,B1  ->  '=A1,B1  ->  "'=A1,B1"  (apostrophe lands inside the quotes)
    expect(escapeCsvValue('=A1,B1')).toBe(QUOTE + APOS + '=A1,B1' + QUOTE);
    // =2+2"x  ->  '=2+2"x  ->  "'=2+2""x"  (quote doubled, all wrapped)
    expect(escapeCsvValue('=2+2"x')).toBe('"\'=2+2""x"');
  });

  test('does NOT neutralize a trigger that is not the first non-whitespace char', () => {
    expect(escapeCsvValue('1+2')).toBe('1+2');
    expect(escapeCsvValue('a=b')).toBe('a=b');
    expect(escapeCsvValue('total: -5')).toBe('total: -5');
  });
});

describe('toCsv - serialization', () => {
  test('derives headers from the first row keys', () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe('a,b' + CRLF + '1,2');
  });

  test('serializes multiple rows joined by CRLF', () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3, b: 4 }])).toBe('a,b' + CRLF + '1,2' + CRLF + '3,4');
  });

  test('honors an explicit headers array for order and selection', () => {
    expect(toCsv([{ a: 1, b: 2 }], ['b', 'a'])).toBe('b,a' + CRLF + '2,1');
    // a header with no matching key renders as an empty cell
    expect(toCsv([{ a: 1 }], ['a', 'c'])).toBe('a,c' + CRLF + '1,');
  });

  test('returns only the header line when rows are empty but headers are given', () => {
    expect(toCsv([], ['id', 'name'])).toBe('id,name');
  });

  test('returns an empty string when nothing is known', () => {
    expect(toCsv([])).toBe('');
    expect(toCsv(undefined)).toBe('');
    expect(toCsv(null)).toBe('');
    expect(toCsv('not-an-array')).toBe('');
  });

  test('treats a null/undefined row entry as empty cells', () => {
    expect(toCsv([null], ['a', 'b'])).toBe('a,b' + CRLF + ',');
  });

  test('quotes cells that contain delimiters', () => {
    expect(toCsv([{ x: 'a,b' }])).toBe('x' + CRLF + QUOTE + 'a,b' + QUOTE);
  });

  test('neutralizes formula-leading cell values in the rendered output', () => {
    // The data cell =2+2 is neutralized; the benign header is emitted verbatim.
    expect(toCsv([{ note: '=2+2' }])).toBe('note' + CRLF + APOS + '=2+2');
  });

  test('neutralizes a formula-leading header as well as data', () => {
    expect(toCsv([{ '=h': 1 }])).toBe(APOS + '=h' + CRLF + '1');
  });
});

describe('module exports', () => {
  test('exportToCsv is the exact same function reference as toCsv', () => {
    expect(exportToCsv).toBe(toCsv);
  });

  test('escapeCsvValue and toCsv are functions', () => {
    expect(typeof escapeCsvValue).toBe('function');
    expect(typeof toCsv).toBe('function');
  });
});
