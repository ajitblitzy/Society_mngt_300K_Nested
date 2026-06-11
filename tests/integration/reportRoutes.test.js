// reportRoutes.test.js - Supertest integration tests for the auth-guarded /api/reports endpoints
// (catalog list, by-type JSON/CSV, 401 without a token, and the unknown-type 400). CommonJS; imports
// the exported Express app (no app.listen) and drives it in-process via Supertest.
//
// WHAT THIS PROVES (AAP 0.5.1 Group 5, 0.5.2, 0.8 "Reporting-requires-Login", criterion C3): the
// Reporting REST surface behaves to contract end-to-end AND every reporting route is access-controlled.
// These are HTTP-level integration tests - they issue real requests through the assembled Express
// application (the composition root in src/app.js, which mounts `app.use('/api/reports', reportRoutes)`)
// rather than calling any service/repository/util directly. The companion unit tests
// (tests/unit/reportService.test.js, tests/unit/csvExporter.test.js) cover the service/exporter layers in
// isolation; this file covers the wired-up routes/controller/middleware path:
//   * GET /api/reports        -> 401 without a token, 200 + a 4-entry catalog with one.
//   * GET /api/reports/:type  -> 401 without a token, 200 JSON envelope (or text/csv) with one.
//   * GET /api/reports/:bogus -> 400 (unknown type) with a valid token.
// To obtain a real JWT, the suite first registers and logs in through the real /api/auth endpoints
// (Reporting-depends-on-Login): the reporting guard verifies tokens minted by the auth feature.
//
// HOW IT RUNS: jest ^30.4.2 (runner) + supertest ^7.2.2 (HTTP client), both declared in the root
// package.json devDependencies. `npm test` runs `jest --ci` (no watch) and auto-discovers this file
// because its name ends in `.test.js` (Jest default testMatch). The default testEnvironment is `node`
// - correct for exercising an HTTP app. Jest's test globals (describe/it/expect/beforeAll) are injected
// with zero config and are deliberately NOT require()'d.
//
// STRICTLY ADDITIVE / NON-REGRESSION (AAP 0.1.2 / 0.6.2, criteria C1/C5): this is a net-new CommonJS
// test. It does NOT import, require, reference, read, or execute any pre-existing read-only scaffold
// module (the synthetic arithmetic padding modules under tests/ and src/utils that export nothing);
// those remain byte-identical. It modifies no existing source. Reporting is backed by the in-memory
// reportRepository (static seed) and the auth setup by the in-memory userRepository (no database).

'use strict';

// ===========================================================================
// CRITICAL ORDERING RULE - set environment variables BEFORE any require().
// ===========================================================================
// The first internal require() below transitively loads src/config, whose authConfig module reads
// JWT_SECRET (and BCRYPT_ROUNDS) from process.env AT MODULE-LOAD TIME and is then cached for the rest
// of this Jest test file. Therefore these assignments MUST precede `require('../../src/app')` so the
// cached config captures the values we set here.
//
//   * src/config loads dotenv NON-DESTRUCTIVELY (`dotenv.config(...)` never overwrites an already-set
//     process.env value) and the repo commits only `.env.example` (no real `.env`), so the values
//     assigned here are exactly what the app sees.
//   * JWT_SECRET is REQUIRED for a green run: authConfig provides no fallback secret (it only
//     console.warns when unset), and tokenUtils.sign throws "secretOrPrivateKey must have a value" when
//     the secret is undefined - which would turn the /login success path into a 500. A deterministic
//     secret makes the JWT minted on /api/auth/login and verified by the /api/reports guard use the
//     SAME secret, so authenticated report requests succeed.
//   * BCRYPT_ROUNDS is pinned to '10' - the secure MINIMUM that authConfig accepts (it validates the var
//     to an integer in [10, 31] and otherwise falls back to 10 WITH a console warning). '10' is the
//     lowest value the app honors, so it keeps bcryptjs hashing in the register/login setup as fast as
//     permitted while emitting NO misconfiguration warning. (This matches the sibling integration test
//     tests/integration/authRoutes.test.js.)
//   * The `|| <fallback>` form preserves any value a CI runner injected into the environment.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '10';

// ===========================================================================
// Dependencies (CommonJS; net-new wiring only).
// ===========================================================================
// Supertest: the HTTP assertion/client library. `request(app)` binds the in-process Express app to an
// ephemeral port internally for the duration of a request, so no real listener/port is opened here.
const request = require('supertest');

// The fully assembled Express application, exported WITHOUT calling app.listen (the dedicated bootstrap
// module owns the listen call). Importing the app - NOT the bootstrap entry point - is what lets
// Supertest drive the routes in-process with no port binding (no EADDRINUSE, no "listening" log).
const app = require('../../src/app');

// The in-memory user repository. Only its clear() helper is used here, to reset the module-level user
// store before the suite runs so the single setup user registers cleanly (no 409 from a stale run).
const userRepository = require('../../src/repositories/userRepository');

// ===========================================================================
// Fixtures, shared state & helpers.
// ===========================================================================
// A registration payload that satisfies the password policy (>= 8 chars AND >= 1 letter AND >= 1 digit,
// so 'Passw0rd123' is valid) and a well-formed email. This is the single user whose login mints the
// Bearer token reused by every authenticated report request below.
const USER = {
  email: 'reporter@example.com',
  password: 'Passw0rd123',
  name: 'Report User',
};

// The expected report catalog types (GET /api/reports returns one entry per type). Mirrors
// src/domain/report.js REPORT_TYPE_VALUES = ['members', 'dues', 'outstanding', 'occupancy'].
const EXPECTED_REPORT_TYPES = ['members', 'dues', 'outstanding', 'occupancy'];

// Module-scoped JWT captured once in beforeAll. The default token TTL ('1h') far exceeds the test run,
// so it stays valid for the whole suite. The token is a stateless JWT: the reporting guard only
// verifies its signature/expiry (it does not re-read the user store), so it remains valid regardless of
// later store mutations.
let token;

// Attach the captured Bearer token to a Supertest request. Used by every authenticated request so the
// header is written one consistent way. (Equivalent to inlining `.set('Authorization', ...)`.)
const authed = (req) => req.set('Authorization', `Bearer ${token}`);

// Acquire a real JWT ONCE before any test: reset the user store, register through the real
// /api/auth/register endpoint, then log in via /api/auth/login and capture res.body.token. The token is
// obtained ONLY through the genuine auth endpoints - it is never hand-crafted/signed here.
beforeAll(async () => {
  userRepository.clear();
  await request(app).post('/api/auth/register').send(USER);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: USER.email, password: USER.password });
  token = res.body.token;
  // Fail fast (with a clear signal) if setup broke: every authenticated assertion below depends on a
  // non-empty token string. A missing token here means register/login is misbehaving, not reporting.
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(0);
});

// ===========================================================================
// GET /api/reports  (report catalog; behind authMiddleware.authenticate)
// ===========================================================================
describe('GET /api/reports (catalog, auth-guarded)', () => {
  it('returns 401 without a Bearer token', async () => {
    // No Authorization header -> the authenticate guard short-circuits before the controller runs.
    const res = await request(app).get('/api/reports');

    expect(res.status).toBe(401);
    // 401 envelope shape from authMiddleware: { error: { message, status } }.
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(401);
  });

  it('returns 200 and the 4-entry report catalog with a valid token', async () => {
    const res = await authed(request(app).get('/api/reports'));

    expect(res.status).toBe(200);
    // Catalog body is { reports: [...] } - an array, NOT wrapped any deeper.
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports).toHaveLength(4);

    // Every entry is shaped { type, title } with a non-empty title.
    res.body.reports.forEach((entry) => {
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);
    });

    // The catalog covers exactly the four domain report types (order is not asserted).
    const types = res.body.reports.map((r) => r.type);
    expect(types).toEqual(expect.arrayContaining(EXPECTED_REPORT_TYPES));
  });
});

// ===========================================================================
// GET /api/reports/:type  (single report; behind authMiddleware.authenticate)
// ===========================================================================
describe('GET /api/reports/:type (auth-guarded)', () => {
  it('returns 401 without a token for /dues and /members (guard applies to the param route)', async () => {
    const dues = await request(app).get('/api/reports/dues');
    const members = await request(app).get('/api/reports/members');

    expect(dues.status).toBe(401);
    expect(members.status).toBe(401);
  });

  it('returns 200 + a JSON envelope for a known type (/dues) with a valid token', async () => {
    const res = await authed(request(app).get('/api/reports/dues'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    // The body IS the report envelope directly - { type, title, generatedAt, count, rows } - not
    // wrapped in { report: ... }. Volatile fields (generatedAt, exact rows) are intentionally NOT
    // asserted; only the stable contract is.
    expect(res.body.type).toBe('dues');
    expect(typeof res.body.title).toBe('string');
    expect(res.body.title.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.count).toBeDefined();
  });

  it('returns 200 + a JSON envelope for another known type (/members) with a valid token', async () => {
    const res = await authed(request(app).get('/api/reports/members'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.type).toBe('members');
    expect(Array.isArray(res.body.rows)).toBe(true);
  });
});

// ===========================================================================
// CSV export & format negotiation  (?format=csv vs default JSON)
// ===========================================================================
describe('CSV export & format negotiation', () => {
  it('returns text/csv (raw string body) when ?format=csv', async () => {
    const res = await authed(request(app).get('/api/reports/dues?format=csv'));

    expect(res.status).toBe(200);
    // Content-Type contains text/csv (charset suffix, if any, is tolerated by the regex).
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    // CSV is delivered as a raw string on res.text (res.body is {} because the payload is not JSON).
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
    // Soft robustness check: the dues CSV header row begins with the 'unitNumber' column. Kept loose
    // (a substring match) so it confirms real CSV without over-coupling to exact bytes/quoting/order.
    expect(res.text).toMatch(/unitNumber/);
  });

  it('returns JSON by default (no ?format) for the same type', async () => {
    const res = await authed(request(app).get('/api/reports/dues'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.type).toBe('dues');
  });
});

// ===========================================================================
// Unknown report type  (valid token, invalid :type)
// ===========================================================================
describe('unknown report type', () => {
  it('returns 400 for an unknown type (/bogus) with a valid token', async () => {
    // Auth succeeds (valid token), then reportService rejects the unknown type with a 400 that the
    // central errorHandler shapes into { error: { message, status } }.
    const res = await authed(request(app).get('/api/reports/bogus'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(400);
  });
});
