// reportService.test.js - Unit tests for the Reporting service: aggregation, computeDaysOverdue, JSON/CSV generation, and CSV serialization.
//
// Pure, framework-agnostic unit tests for the Society Management Reporting
// feature. They exercise the synchronous service-layer aggregation logic in
// `src/services/reportService.js` together with the vanilla CSV serializer in
// `src/utils/csvExporter.js` — in complete isolation: no HTTP layer, no Express,
// no integration harness, and no database. The reporting service contains NO
// authentication logic, so none is referenced here.
//
// STRICTLY ADDITIVE / NON-REGRESSION (AAP C1/C5): this file does not import,
// reference, or depend on any of the archived synthetic scaffold modules.
//
// Determinism: `computeDaysOverdue` is asserted with a FIXED clock for its exact
// value; the outstanding report's `daysOverdue` is asserted only as `>= 0`, which
// holds for any wall-clock time (the function never returns a negative value), so
// the suite is fully deterministic and headless-safe.

// CRITICAL SETUP ORDERING: per the tests/unit folder convention these env vars
// are set for consistency across every unit test, BEFORE any `require(...)`. The
// shared `src/config` loader reads `dotenv` non-destructively and only warns when
// `JWT_SECRET` is unset; reportService does not read auth config, so this is
// purely defensive — but the ordering contract is honored regardless.
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';

const reportService = require('../../src/services/reportService');
const csvExporter = require('../../src/utils/csvExporter');
// Imported so the outstanding/occupancy tests can independently derive their
// expected results from the SAME raw seed the service aggregates from.
const reportRepository = require('../../src/repositories/reportRepository');

describe('reportService', () => {
  describe('computeDaysOverdue', () => {
    it('computes whole days against a fixed clock', () => {
      // 2026-05-10 → 2026-05-20 is exactly 10 whole days.
      expect(
        reportService.computeDaysOverdue('2026-05-10', Date.parse('2026-05-20')),
      ).toBe(10);
    });

    it('returns 0 for a future due date (default clock)', () => {
      // A far-future due date can never be overdue, regardless of the real clock.
      expect(reportService.computeDaysOverdue('2999-01-01')).toBe(0);
    });

    it('returns 0 for falsy or unparseable input', () => {
      expect(reportService.computeDaysOverdue('')).toBe(0);
      expect(
        reportService.computeDaysOverdue('not-a-date', Date.parse('2026-05-20')),
      ).toBe(0);
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
      expect(r.type).toBe('dues');
      expect(r.rows.length).toBeGreaterThan(0);
      r.rows.forEach((row) => {
        expect(row.balance).toBe(row.amountDue - row.amountPaid);
      });
    });

    it('outstanding report is derived from raw dues rows (balance>0), retaining dueDate and daysOverdue', () => {
      const r = reportService.buildOutstandingReport();
      expect(r.type).toBe('outstanding');

      // Independently derive the EXPECTED outstanding set straight from the raw
      // repository dues rows (which still carry `dueDate`). A row is outstanding
      // iff amountDue - amountPaid > 0, and its outstanding `amountDue` is that
      // remaining balance. Deriving from the raw source (not the dues DTO, which
      // DROPS dueDate) catches an implementation that builds outstanding rows from
      // the DTO and mishandles/loses `dueDate` while still emitting positive rows.
      const expected = reportRepository.getDues()
        .map((d) => ({
          unitNumber: d.unitNumber,
          memberName: d.memberName,
          balance: Number(d.amountDue) - Number(d.amountPaid),
          dueDate: d.dueDate,
        }))
        .filter((d) => d.balance > 0);

      // Count parity with the raw-derived expectation (and a non-trivial set).
      expect(expected.length).toBeGreaterThan(0);
      expect(r.rows.length).toBe(expected.length);

      // Key the expected rows by unitNumber (unique among the balance>0 seed set)
      // for precise per-row comparison.
      const expectedByUnit = new Map(expected.map((e) => [e.unitNumber, e]));

      r.rows.forEach((row) => {
        // EXACTLY these five keys — proves the outstanding DTO shape is fixed.
        expect(Object.keys(row).sort()).toEqual([
          'amountDue',
          'daysOverdue',
          'dueDate',
          'memberName',
          'unitNumber',
        ]);

        const exp = expectedByUnit.get(row.unitNumber);
        expect(exp).toBeDefined();
        // amountDue is the REMAINING (unpaid) balance from the raw dues row.
        expect(row.amountDue).toBe(exp.balance);
        expect(row.amountDue).toBeGreaterThan(0);
        expect(row.memberName).toBe(exp.memberName);
        // dueDate is carried through from the RAW dues row (the dues DTO drops it).
        expect(row.dueDate).toBe(exp.dueDate);
        // daysOverdue is computed from that same raw dueDate (>= 0 always).
        expect(row.daysOverdue).toBe(reportService.computeDaysOverdue(exp.dueDate));
        expect(row.daysOverdue).toBeGreaterThanOrEqual(0);
      });

      // The seed contains fully-paid dues rows that must be filtered out, so the
      // outstanding set is strictly smaller than the full dues set.
      expect(r.rows.length).toBeLessThan(reportService.buildDuesReport().rows.length);
    });

    it('occupancy report reflects the seeded occupied/vacant distribution and total occupants', () => {
      const r = reportService.buildOccupancyReport();
      expect(r.type).toBe('occupancy');
      expect(r.rows.length).toBeGreaterThan(0);
      expect(r.count).toBe(r.rows.length);
      r.rows.forEach((row) => {
        expect(typeof row.unitNumber).toBe('string');
        expect(typeof row.status).toBe('string');
      });

      // Independently derive the EXPECTED occupancy semantics from the seeded
      // source rows, then assert the service report matches — proving the
      // occupied/vacant split and occupant totals are computed correctly, not
      // merely that some rows exist.
      const seed = reportRepository.getOccupancy();
      const expectedOccupied = seed.filter((o) => o.status === 'occupied').length;
      const expectedVacant = seed.filter((o) => o.status === 'vacant').length;
      const expectedTotalOccupants = seed.reduce((sum, o) => sum + Number(o.occupantsCount), 0);

      const reportOccupied = r.rows.filter((row) => row.status === 'occupied').length;
      const reportVacant = r.rows.filter((row) => row.status === 'vacant').length;
      const reportTotalOccupants = r.rows.reduce((sum, row) => sum + Number(row.occupantsCount), 0);

      // Sanity on the seed itself: a coherent society with BOTH occupied & vacant
      // units, and every unit classified as exactly one of the two.
      expect(expectedOccupied).toBeGreaterThan(0);
      expect(expectedVacant).toBeGreaterThan(0);
      expect(expectedOccupied + expectedVacant).toBe(seed.length);

      // The report must reproduce the seeded distribution and occupant total.
      expect(reportOccupied).toBe(expectedOccupied);
      expect(reportVacant).toBe(expectedVacant);
      expect(reportTotalOccupants).toBe(expectedTotalOccupants);
      // Vacant units contribute zero occupants, so occupants live only in occupied
      // units — the total is therefore strictly positive for this seed.
      expect(reportTotalOccupants).toBeGreaterThan(0);
    });
  });

  describe('generateReport JSON', () => {
    it('returns the JSON result + envelope for members (default format)', () => {
      const result = reportService.generateReport('members');
      expect(result).toMatchObject({
        type: 'members',
        format: 'json',
        contentType: 'application/json',
        filename: 'members-report.json',
      });
      // `content` is the report envelope object for JSON results.
      expect(result.content).toMatchObject({
        type: 'members',
        title: 'Member Directory',
      });
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

      // Records (including the header) are CRLF-separated per RFC 4180.
      const lines = result.content.split('\r\n');
      expect(lines[0]).toBe('unitNumber,memberName,period,amountDue,amountPaid,balance');
      // Header + at least one data row proves CRLF separation produced records.
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('throws an Error with .status === 400 for an unknown report type (sync)', () => {
      // Synchronous throw — no await.
      expect(() => reportService.generateReport('bogus')).toThrow();

      let caught;
      try {
        reportService.generateReport('bogus');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.status).toBe(400);

      // buildReport guards the type as well and surfaces the same 400.
      let caughtBuild;
      try {
        reportService.buildReport('bogus');
      } catch (e) {
        caughtBuild = e;
      }
      expect(caughtBuild.status).toBe(400);
    });

    it('falls back to JSON for an unrecognized format', () => {
      const result = reportService.generateReport('occupancy', { format: 'xml' });
      expect(result.format).toBe('json');
      expect(result.contentType).toBe('application/json');
    });

    it('lists exactly the 4 available reports', () => {
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
    it('serializes rows to CRLF-separated CSV with headers inferred from keys', () => {
      expect(csvExporter.toCsv([{ a: 1, b: 2 }])).toBe('a,b\r\n1,2');
    });

    it('quotes values containing a comma', () => {
      expect(csvExporter.toCsv([{ x: 'a,b' }])).toBe('x\r\n"a,b"');
    });

    it('escapes a single field, doubling embedded quotes and wrapping in quotes', () => {
      expect(csvExporter.escapeCsvValue('he said "hi"')).toBe('"he said ""hi"""');
    });

    it('wraps a value containing a newline in quotes', () => {
      expect(csvExporter.escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });
  });
});
