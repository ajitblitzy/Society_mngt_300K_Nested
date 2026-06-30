// authRoutes.test.js - Supertest integration tests for the /api/auth endpoints (register, login, logout, me). CommonJS; imports the exported app (no listen).
'use strict';

/**
 * tests/integration/authRoutes.test.js
 *
 * End-to-end HTTP integration tests for the Login (authentication) feature of the
 * Society Management API. These tests drive the FULLY ASSEMBLED Express
 * application (composition root `src/app.js`) in-process via Supertest, issuing
 * real HTTP requests against the endpoints mounted at `/api/auth` by
 * `app.use('/api/auth', authRoutes)`. They deliberately exercise the public HTTP
 * contract — status codes and JSON body shapes — rather than any internal unit,
 * proving validation criterion C3 for the auth surface (register -> login issues
 * a JWT; `/api/auth/me` is 401 without a token and 200 with a valid one).
 *
 * ── Why the exported app (and NOT the server) is imported ───────────────────
 * `src/app.js` exports the configured `app` WITHOUT calling `app.listen`, so
 * Supertest binds an ephemeral port internally for each request and the process
 * never opens a real, fixed TCP port. We therefore import the app module
 * (`../../src/app`) and never the bootstrap entry point that binds a port —
 * guaranteeing the suite cannot fail with `EADDRINUSE` and never logs a
 * "listening" line.
 *
 * ── Critical ordering: environment variables BEFORE requiring the app ───────
 * `src/config` performs the application's single, canonical `dotenv` load when it
 * is first required (transitively, via `src/app`). `dotenv.config()` is
 * NON-destructive — it never overwrites an already-set `process.env` value — and
 * there is no committed `.env` in the repository (only `.env.example`). Setting
 * `JWT_SECRET` and `BCRYPT_ROUNDS` at the very top of this file, BEFORE the first
 * `require`, therefore guarantees the cached config captures these test values so
 * issued JWTs sign and verify consistently within the run, and `bcryptjs` hashing
 * stays fast (4 rounds) and deterministic-speed. The `|| '...'` form preserves any
 * value a CI runner may have injected while still defaulting locally.
 *
 * ── Test isolation ──────────────────────────────────────────────────────────
 * The auth feature persists users in the in-memory `userRepository` (a
 * module-level array shared across all tests within this file). `beforeEach`
 * calls `userRepository.clear()` so every test starts from an empty user store,
 * making the suite deterministic and order-independent (re-registering the same
 * email is safe after a clear; without clearing the second registration would
 * 409). Tokens are obtained EXCLUSIVELY through the real register + login
 * endpoints — never hand-crafted/signed — so the tests validate the genuine
 * end-to-end flow.
 *
 * ── Module system & non-regression ──────────────────────────────────────────
 * CommonJS only (`require`); no ESM `import`/`export`. Jest globals (`describe`,
 * `it`, `expect`, `beforeEach`, ...) are ambient and are intentionally not
 * imported. This file is strictly additive: it does not import, reference, read,
 * or execute any archived synthetic arithmetic scaffold module (those ship only
 * inside the project archive, export nothing, and are out of scope), and it
 * modifies no existing file (AAP §0.1.2/§0.6.2, criteria C1/C5).
 */

// CRITICAL SETUP ORDERING: assign these BEFORE any `require` below so the shared
// `src/config` loader initializes with a real signing secret and a cheap bcrypt
// cost factor. (See the module header above for the full rationale.)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

// HTTP assertion library — drives the in-process app on an ephemeral port.
const request = require('supertest');
// The fully-configured Express application, exported WITHOUT `app.listen()`.
const app = require('../../src/app');
// In-memory user store; `clear()` empties it between tests for isolation.
const userRepository = require('../../src/repositories/userRepository');

// ── Fixtures & helpers ───────────────────────────────────────────────────────

// A registration payload that satisfies the password policy (>= 8 chars, at
// least one letter and one digit) and a valid email, so it succeeds by default.
const VALID_USER = {
  email: 'member@example.com',
  password: 'Passw0rd123',
  name: 'Test Member',
};

// Register a user, optionally overriding individual fields (e.g. a bad email or
// weak password) to drive validation scenarios. Returns the Supertest request
// (a thenable), so callers `await` it.
const registerUser = (overrides = {}) =>
  request(app).post('/api/auth/register').send({ ...VALID_USER, ...overrides });

// Attempt a login with the supplied credentials object `{ email, password }`.
const loginUser = (creds) => request(app).post('/api/auth/login').send(creds);

/**
 * Register the default (or overridden) user, then log in with the same
 * credentials and capture the issued token.
 *
 * @param {object} [overrides={}] - Fields to override on {@link VALID_USER}.
 * @returns {Promise<{ token: string, user: object, creds: object }>} The login
 *   token, the public user from the login response, and the credentials used.
 */
async function registerAndLogin(overrides = {}) {
  const body = { ...VALID_USER, ...overrides };
  await request(app).post('/api/auth/register').send(body);
  const res = await loginUser({ email: body.email, password: body.password });
  return { token: res.body.token, user: res.body.user, creds: body };
}

// Reset the in-memory user store before EVERY test for full isolation and
// determinism (order-independent within and across runs).
beforeEach(() => {
  userRepository.clear();
});

// ── POST /api/auth/register ────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201 with a public user (no passwordHash/lockout fields)', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    // Public self-registration always creates a least-privileged 'member'.
    expect(res.body.user.role).toBe('member');
    // The public user view must NEVER leak the password hash or lockout internals.
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.failedAttempts).toBeUndefined();
    expect(res.body.user.lockedUntil).toBeUndefined();
    // An id is assigned (assert presence only — the exact value is volatile).
    expect(res.body.user.id).toBeTruthy();
  });

  it('returns 400 when a required field is missing', async () => {
    // Omit `password` entirely (send only `email`).
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: VALID_USER.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(400);
  });

  it('returns 400 for an invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for a weak password', async () => {
    const res = await registerUser({ password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 409 for a duplicate email', async () => {
    await registerUser();
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('is concurrency-safe: two simultaneous registrations for the same email yield one 201 and one 409', async () => {
    // RACE-CONDITION REGRESSION (CP5 finding #3). Two CONCURRENT POST /register
    // requests for the SAME email must produce exactly one created account (201)
    // and one conflict (409) — never two 201s / duplicate identities. The atomic
    // repository insert makes this outcome deterministic regardless of how the two
    // in-flight requests interleave around password hashing.
    const payload = { ...VALID_USER, name: 'Race' };
    const [a, b] = await Promise.all([
      request(app).post('/api/auth/register').send(payload),
      request(app).post('/api/auth/register').send(payload),
    ]);

    // One success, one conflict (order-independent: compare the sorted statuses).
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    // Exactly one account was persisted for that email — no duplicate identity.
    const matches = userRepository
      .findAll()
      .filter((u) => u.email === VALID_USER.email);
    expect(matches).toHaveLength(1);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and returns 200 + token + public user', async () => {
    await registerUser();

    const res = await loginUser({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    // The login response must not leak the password hash either.
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns a generic 401 for a wrong password and an unknown email (no enumeration)', async () => {
    await registerUser();

    const wrong = await loginUser({
      email: VALID_USER.email,
      password: 'WrongPass9',
    });
    const unknown = await loginUser({
      email: 'nobody@example.com',
      password: 'Whatever123',
    });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe('Invalid email or password');
    // Both failure causes must surface the SAME message (anti-enumeration).
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });
});

// ── GET /api/auth/me (protected by authenticate) ────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(401);
  });

  it('returns 200 and the authenticated public user with a valid token', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('returns 200 with a logout acknowledgement (works without a token)', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});

// ── Unmatched routes (uniform JSON 404 envelope) ────────────────────────────
// Proves the API's documented uniform error contract `{ error: { message, status } }`
// also covers requests that match NO route. The app-level 404 catch-all in
// `src/app.js` synthesizes a 404 Error and forwards it to the centralized error
// handler, so unknown paths return a JSON envelope (NOT Express's default HTML
// 404 page). This is the regression test for the missing catch-all that previously
// let unmatched paths fall through to an HTML response.
describe('Unmatched routes', () => {
  it('returns a JSON 404 envelope for an unknown path', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    // The response must be JSON (the uniform envelope), never Express's HTML 404.
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(404);
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.message.length).toBeGreaterThan(0);
  });

  it('returns a JSON 404 envelope for an unknown method on a known base path', async () => {
    // A method/path combination that no route declares must also produce the
    // uniform JSON 404 (e.g. DELETE on the auth base path).
    const res = await request(app).delete('/api/auth/nonexistent');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(404);
  });
});
