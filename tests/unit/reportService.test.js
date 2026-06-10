// reportService.test.js - Unit tests for the Reporting service: aggregation, computeDaysOverdue,
// JSON/CSV generation, and the CSV serializer. Pure unit tests (no HTTP, no server, no supertest);
// they exercise src/services/reportService.js and src/utils/csvExporter.js directly against the
// in-memory reportRepository seed, so every assertion is deterministic.
//
// Coverage:
//   * computeDaysOverdue - whole-day aging against a FIXED clock, plus the future / falsy /
//     unparseable -> 0 guards.
//   * aggregation builders - members / dues / outstanding / occupancy envelope + row invariants
//     (count === rows.length, dues balance === amountDue - amountPaid, the outstanding balance>0
//     filter with an exact 5-key row shape).
//   * generateReport - JSON (default) and CSV result envelopes, the unknown-type 400 throw, the
//     unrecognized-format -> JSON fallback, and the listAvailableReports catalog of 4 entries.
//   * csvExporter - RFC 4180 serialization (header-from-keys, CRLF rows, comma/quote quoting).
//
// Jest is zero-config in this repo: describe/it/expect are injected globals - this file does NOT
// require('jest') or require('@jest/globals'). It introduces no dependency on any archived
// file_*.js / filler.js module (non-regression C1/C5) and modifies no existing file.

// CRITICAL setup ordering: per the tests/unit folder convention these env vars are assigned BEFORE
// any require(), so that any transitively-loaded src/config (dotenv, loaded non-destructively) sees
// a JWT secret and emits no warning. The Reporting service itself reads NO auth config; the
// assignments are kept purely for cross-suite consistency and must precede the requires below.
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';

const reportService = require('../../src/services/reportService');
const csvExporter = require('../../src/utils/csvExporter');

describe('reportService', () => {
  describe('computeDaysOverdue', () => {
    it('computes whole days overdue against a fixed clock', () => {
      // 2026-05-10 -> 2026-05-20 is exactly 10 whole days; passing an explicit `now` pins the clock.
      expect(reportService.computeDaysOverdue('2026-05-10', Date.parse('2026-05-20'))).toBe(10);
    });

    it('returns 0 for a due date in the future (default clock)', () => {
      // A far-future date can never be overdue regardless of the current wall clock.
      expect(reportService.computeDaysOverdue('2999-01-01')).toBe(0);
    });

    it('returns 0 for falsy or unparseable input', () => {
      expect(reportService.computeDaysOverdue('')).toBe(0);
      expect(reportService.computeDaysOverdue('not-a-date', Date.parse('2026-05-20'))).toBe(0);
    });
  });

  describe('aggregation', () => {
    it('members report has rows and a matching count', () => {
      const r = reportService.buildMembersReport();
      expect(r.type).toBe('members');
      expect(Array.isArray(r.rows)).toBe(true);
      expect(r.rows.length).toBeGreaterThan(0);
      expect(r.count).toBe(r.rows.length);
      r.rows.forEach((row) => {
        expect(typeof row.unitNumber).toBe('string');
        expect(typeof row.memberName).toBe('string');
      });
    });

    it('dues report: balance === amountDue - amountPaid for every row', () => {
      const r = reportService.buildDuesReport();
      expect(r.rows.length).toBeGreaterThan(0);
      r.rows.forEach((row) => {
        expect(row.balance).toBe(row.amountDue - row.amountPaid);
      });
    });

    it('outstanding report: only balance>0 rows, an exact 5-key shape, and daysOverdue>=0', () => {
      const r = reportService.buildOutstandingReport();
      expect(r.rows.length).toBeGreaterThan(0);
      r.rows.forEach((row) => {
        // Exactly the five outstanding columns - no extra and no missing keys.
        expect(Object.keys(row).sort()).toEqual([
          'amountDue',
          'daysOverdue',
          'dueDate',
          'memberName',
          'unitNumber',
        ]);
        // `amountDue` here is the REMAINING balance; only units that still owe (>0) are listed.
        expect(row.amountDue).toBeGreaterThan(0);
        expect(row.daysOverdue).toBeGreaterThanOrEqual(0);
      });
      // The seed contains fully-paid dues rows that the balance>0 filter must exclude, so the
      // outstanding report is strictly smaller than the full dues report.
      expect(r.rows.length).toBeLessThan(reportService.buildDuesReport().rows.length);
    });

    it('occupancy report has rows and a matching count', () => {
      const r = reportService.buildOccupancyReport();
      expect(r.type).toBe('occupancy');
      expect(r.rows.length).toBeGreaterThan(0);
      expect(r.count).toBe(r.rows.length);
      r.rows.forEach((row) => {
        expect(typeof row.unitNumber).toBe('string');
        expect(typeof row.status).toBe('string');
      });
    });
  });

  describe('generateReport JSON', () => {
    it('returns the JSON result envelope for members', () => {
      const result = reportService.generateReport('members');
      expect(result).toMatchObject({
        type: 'members',
        format: 'json',
        contentType: 'application/json',
        filename: 'members-report.json',
      });
      // The JSON `content` is the report envelope object itself.
      expect(result.content).toMatchObject({ type: 'members', title: 'Member Directory' });
      expect(typeof result.content.generatedAt).toBe('string');
      expect(typeof result.content.count).toBe('number');
      expect(Array.isArray(result.content.rows)).toBe(true);
      expect(result.content.count).toBe(result.content.rows.length);
    });
  });

  describe('generateReport CSV', () => {
    it('returns a CSV string for dues with the exact header and CRLF-separated rows', () => {
      const result = reportService.generateReport('dues', { format: 'csv' });
      expect(result).toMatchObject({
        type: 'dues',
        format: 'csv',
        contentType: 'text/csv',
        filename: 'dues-report.csv',
      });
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      // Records are RFC 4180 CRLF-separated; the first line is the fixed dues column header.
      const lines = result.content.split('\r\n');
      expect(lines[0]).toBe('unitNumber,memberName,period,amountDue,amountPaid,balance');
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('throws a 400 error for an unknown report type (synchronous)', () => {
      expect(() => reportService.generateReport('bogus')).toThrow();
      let caught;
      try {
        reportService.generateReport('bogus');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.status).toBe(400);
    });

    it('buildReport also throws a 400 error for an unknown report type', () => {
      let caught;
      try {
        reportService.buildReport('bogus');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.status).toBe(400);
    });

    it('falls back to JSON for an unrecognized export format', () => {
      const result = reportService.generateReport('occupancy', { format: 'xml' });
      expect(result.format).toBe('json');
      expect(result.contentType).toBe('application/json');
    });

    it('lists exactly 4 available reports', () => {
      const list = reportService.listAvailableReports();
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(4);
      expect(list.map((x) => x.type).sort()).toEqual([
        'dues',
        'members',
        'occupancy',
        'outstanding',
      ]);
      list.forEach((x) => {
        expect(typeof x.type).toBe('string');
        expect(typeof x.title).toBe('string');
      });
    });
  });

  describe('csvExporter', () => {
    it('serializes rows to CRLF-separated CSV, deriving headers from the row keys', () => {
      expect(csvExporter.toCsv([{ a: 1, b: 2 }])).toBe('a,b\r\n1,2');
    });

    it('quotes a value that contains a comma', () => {
      expect(csvExporter.toCsv([{ x: 'a,b' }])).toBe('x\r\n"a,b"');
    });

    it('doubles embedded double-quotes and wraps the field', () => {
      expect(csvExporter.escapeCsvValue('he said "hi"')).toBe('"he said ""hi"""');
    });
  });
});
