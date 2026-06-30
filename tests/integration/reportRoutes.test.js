// reportRoutes.test.js - Supertest integration tests for the auth-guarded /api/reports endpoints (catalog, by-type JSON/CSV, 401, unknown-type). CommonJS; imports the exported app (no listen).
'use strict';

/**
 * tests/integration/reportRoutes.test.js
 *
 * End-to-end HTTP integration tests for the Reporting feature of the Society
 * Management API. They drive the FULLY ASSEMBLED Express application
 * (`src/app.js`, exported WITHOUT `app.listen`) through Supertest and prove the
 * Reporting REST contract behaves exactly as specified:
 *
 *   • GET /api/reports        — report catalog (index)
 *   • GET /api/reports/:type  — a single report, JSON (default) or CSV (?format=csv)
 *
 * ── What these tests prove (AAP §0.5.1 Group 5, §0.5.2, §0.8, criterion C3) ──
 *   1. EVERY reporting route is access-controlled: a request WITHOUT a valid
 *      Bearer token is rejected with `401` (Reporting-depends-on-Login), and the
 *      same request WITH a valid token succeeds with `200` — asserted for both the
 *      index route AND a `:type` route.
 *   2. The catalog returns the four canonical report types
 *      (members, dues, outstanding, occupancy).
 *   3. A known `:type` returns the report envelope as JSON by default and as
 *      `text/csv` when `?format=csv` is requested (CSV export works).
 *   4. An unknown `:type` (with a valid token) is a client error → `400`.
 *
 * ── Token acquisition (no hand-crafted JWTs) ────────────────────────────────
 * The Bearer token is obtained ONLY through the real authentication endpoints:
 * `beforeAll` clears the in-memory user store, registers a user via
 * `POST /api/auth/register`, then logs in via `POST /api/auth/login` and captures
 * `res.body.token`. The test never imports `jsonwebtoken`/`tokenUtils` and never
 * signs a token itself — this exercises the genuine login→report flow.
 *
 * ── Isolation & determinism ─────────────────────────────────────────────────
 * The ONLY stateful store touched here is the in-memory `userRepository` (a
 * single setup user), cleared once in `beforeAll`. The `reportRepository` is
 * static seeded data (no reset needed), so the suite is deterministic and yields
 * identical results across repeated runs. The default token TTL (1h) far exceeds
 * a test run, so the captured token stays valid throughout.
 *
 * ── Module system / runtime ─────────────────────────────────────────────────
 * CommonJS only (`require` / `module.exports`); no ESM `import`/`export`. Jest
 * globals (`describe`, `it`, `expect`, `beforeAll`) are ambient and are NOT
 * imported. Runner: jest ^30.4.2; HTTP assertions: supertest ^7.2.2. Target
 * Node.js >= 18; default `testEnvironment` is `node`.
 *
 * ── Strictly additive / non-regression (AAP §0.1.2, §0.6.2, C1/C5) ──────────
 * This is a brand-new, purely additive file. It does NOT import, reference, read,
 * execute, or otherwise depend on any of the archived synthetic scaffold modules
 * (the arithmetic placeholder modules that export nothing and ship only inside
 * the zip), and it modifies no existing file. No database is introduced — the
 * reporting endpoints are backed by the in-memory `reportRepository` and the auth
 * setup by the in-memory `userRepository`.
 */

// ── CRITICAL ORDERING: env vars MUST be set BEFORE requiring the app ─────────
// `src/config` loads `dotenv` NON-DESTRUCTIVELY (it never overwrites an
// already-set `process.env`), there is no committed `.env` (only `.env.example`),
// and `src/config/authConfig.js` only `console.warn`s (never throws) when
// `JWT_SECRET` is unset. Setting the secret HERE — before any `require` that
// transitively loads the auth config — guarantees the token minted by
// `/api/auth/login` and the token verified by the reporting auth guard use the
// SAME secret, so authenticated report requests succeed. `BCRYPT_ROUNDS='4'`
// keeps the register/login setup fast without weakening what we assert.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

// ── Dependencies (verified depends_on_files whitelist + supertest) ───────────
// Supertest binds an ephemeral port internally around the app, so no real TCP
// port is ever opened by this suite.
const request = require('supertest');
// The fully-configured Express application, exported WITHOUT `app.listen`. We
// import the APP itself, never the separate HTTP bootstrap module that binds the
// port, so this process never opens a real port (no "listening" log, no EADDRINUSE).
const app = require('../../src/app');
// In-memory user store. We `clear()` it once in `beforeAll` so the setup user is
// registered into a clean store regardless of test execution order.
const userRepository = require('../../src/repositories/userRepository');

// ── Test fixture & shared state ──────────────────────────────────────────────
// A registration payload that satisfies the auth validation policy: a valid
// email and a password with >= 8 chars including at least one letter and one
// digit ('Passw0rd123' is length 11 with letters + digits).
const USER = { email: 'reporter@example.com', password: 'Passw0rd123', name: 'Report User' };

// Module-scoped Bearer token captured once in `beforeAll` and reused by every
// authenticated request below.
let token;

// The four canonical report types the catalog must advertise and that the
// `:type` route must serve (AAP §0.5.1 / src/domain/report.js).
const EXPECTED_REPORT_TYPES = ['members', 'dues', 'outstanding', 'occupancy'];

/**
 * Register + login a single user through the REAL auth endpoints and capture the
 * issued JWT. Runs once before any test. The user store is cleared first so the
 * registration starts from a clean slate (the only stateful store in play).
 */
beforeAll(async () => {
  // Clean start for the single stateful store touched by this suite.
  userRepository.clear();

  // Create the account (public self-registration) — expected to 201.
  await request(app).post('/api/auth/register').send(USER);

  // Authenticate and capture the Bearer token from the `{ token, user }` body.
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: USER.email, password: USER.password });
  token = res.body.token;

  // Fail fast (with a clear signal) if setup did not yield a usable token, so a
  // broken auth flow surfaces here rather than as a confusing cascade of 401s.
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(0);
});

describe('GET /api/reports (catalog, auth-guarded)', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(401);
    // The guard emits the shared generic envelope; assert its shape (not internals).
    expect(res.body.error).toBeDefined();
  });

  it('returns 200 and the report catalog with a valid token', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Catalog is wrapped in a stable `{ reports: [...] }` envelope.
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports).toHaveLength(4);

    // Every catalog entry exposes a `type` and a non-empty `title`.
    res.body.reports.forEach((entry) => {
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);
    });

    // The advertised types cover exactly the four canonical report kinds.
    const types = res.body.reports.map((r) => r.type);
    expect(types).toEqual(expect.arrayContaining(EXPECTED_REPORT_TYPES));
  });
});

describe('GET /api/reports/:type (auth-guarded)', () => {
  it('returns 401 without a token for /dues and /members', async () => {
    // The guard applies to the param route generally — assert it for two types.
    expect((await request(app).get('/api/reports/dues')).status).toBe(401);
    expect((await request(app).get('/api/reports/members')).status).toBe(401);
  });

  it('returns 200 JSON for /dues with a valid token', async () => {
    const res = await request(app)
      .get('/api/reports/dues')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    // Body is the report envelope OBJECT directly (NOT wrapped in `{ report: ... }`).
    expect(res.body.type).toBe('dues');
    expect(typeof res.body.title).toBe('string');
    expect(res.body.title.length).toBeGreaterThan(0);
    expect(res.body.count).toBeDefined();
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it('returns 200 JSON for /members with a valid token', async () => {
    const res = await request(app)
      .get('/api/reports/members')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.type).toBe('members');
    expect(Array.isArray(res.body.rows)).toBe(true);
  });
});

describe('CSV export & format negotiation', () => {
  it('returns text/csv when ?format=csv', async () => {
    const res = await request(app)
      .get('/api/reports/dues?format=csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Content negotiation: CSV branch sets a `text/csv` content type.
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    // Supertest exposes the raw CSV as `res.text` (a non-empty string); `res.body`
    // is `{}` because the response is not JSON.
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
    // SOFT robustness check (kept loose to avoid over-coupling to exact bytes):
    // the dues CSV header row begins with the `unitNumber` column.
    expect(res.text).toMatch(/unitNumber/);
  });

  it('returns JSON by default (no ?format)', async () => {
    const res = await request(app)
      .get('/api/reports/dues')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.type).toBe('dues');
  });
});

describe('unknown report type', () => {
  it('returns 400 for an unknown type with a valid token', async () => {
    const res = await request(app)
      .get('/api/reports/bogus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    // Shared error envelope `{ error: { message, status } }` from errorHandler.
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(400);
  });
});
