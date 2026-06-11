// authRoutes.test.js - Supertest integration tests for the /api/auth endpoints (register, login, logout, me).
// CommonJS; imports the exported Express app (no app.listen) and drives it in-process via Supertest.
//
// WHAT THIS PROVES (AAP 0.5.1 Group 5, 0.5.2, criterion C3): the Login (authentication) REST surface
// behaves to contract end-to-end. These are HTTP-level integration tests - they issue real requests
// through the assembled Express application (the composition root in src/app.js) rather than calling
// any service/repository/util directly. The companion unit tests (tests/unit/authService.test.js)
// cover the service layer in isolation; this file covers the wired-up routes/controller/middleware
// path: register -> 201 (public user, no secret fields), login -> 200 { token, user }, the generic
// 401 that prevents user enumeration, logout -> 200, and the auth-guarded GET /me (401 without a
// token, 200 with one).
//
// HOW IT RUNS: jest ^30.4.2 (runner) + supertest ^7.2.2 (HTTP client), both declared in the root
// package.json devDependencies. `npm test` runs `jest --ci` (no watch) and auto-discovers this file
// because its name ends in `.test.js` (Jest default testMatch). The default testEnvironment is `node`
// - correct for exercising an HTTP app. Jest's test globals (describe/it/expect/beforeEach) are
// injected with zero config and are deliberately NOT require()'d.
//
// STRICTLY ADDITIVE / NON-REGRESSION (AAP 0.1.2 / 0.6.2, criteria C1/C5): this is a net-new CommonJS
// file. It does NOT import, require, reference, read, or execute any pre-existing read-only scaffold
// module (the synthetic arithmetic padding modules that export nothing) - those remain byte-identical.
// It modifies no existing file. The auth feature is backed by an in-memory userRepository (no database).

'use strict';

// ===========================================================================
// CRITICAL ORDERING RULE - set environment variables BEFORE any require().
// ===========================================================================
// The first internal require() below transitively loads src/config, whose authConfig module reads
// JWT_SECRET (and BCRYPT_ROUNDS) from process.env AT MODULE-LOAD TIME and is then cached for the rest
// of this Jest test file. Therefore these assignments MUST precede `require('../../src/app')` so the
// cached config captures the values we set here.
//
//   * src/config loads dotenv NON-DESTRUCTIVELY (`dotenv.config({ quiet: true })` never overwrites an
//     already-set process.env value) and the repo commits only `.env.example` (no real `.env`), so the
//     values assigned here are exactly what the app sees.
//   * JWT_SECRET is REQUIRED for a green run: authConfig provides no fallback secret, and tokenUtils.sign
//     throws "secretOrPrivateKey must have a value" when the secret is undefined - which would turn the
//     login success path into a 500 instead of a 200. Setting a deterministic secret makes issued JWTs
//     sign on /login and verify on /me consistently within the run.
//   * BCRYPT_ROUNDS is pinned to '10' - the secure MINIMUM that authConfig accepts (it validates the var
//     to an integer in [10, 31] and otherwise falls back to 10 WITH a console warning). '10' is the
//     lowest value the app honors, so it keeps bcryptjs hashing as fast as permitted and deterministic
//     while emitting NO misconfiguration warning. (This matches the sibling tests/unit/authService.test.js.)
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
// module owns the listen call). Importing the app is what lets Supertest drive the routes in-process.
const app = require('../../src/app');

// The in-memory user repository. Only its clear() helper is used here, to reset the module-level user
// store before every test for deterministic, order-independent isolation.
const userRepository = require('../../src/repositories/userRepository');

// ===========================================================================
// Fixtures & helpers.
// ===========================================================================
// A default registration payload that satisfies the password policy (>= 8 chars AND >= 1 letter AND
// >= 1 digit, so 'Passw0rd123' is valid) and a well-formed email. Individual tests override fields as
// needed to drive specific validation/error branches.
const VALID_USER = {
  email: 'member@example.com',
  password: 'Passw0rd123',
  name: 'Test Member',
};

// Issue POST /api/auth/register with the default fixture merged with `overrides`. Returns the Supertest
// request promise (thenable), so callers `await` it directly.
const registerUser = (overrides = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ ...VALID_USER, ...overrides });

// Issue POST /api/auth/login with the exact credentials provided (no defaults merged), so tests can
// drive the wrong-password and unknown-email branches precisely.
const loginUser = (credentials) =>
  request(app)
    .post('/api/auth/login')
    .send(credentials);

// Register a user and then log in as that user, returning the issued token alongside the public user
// and the credentials used. Encapsulates the "register a user then login to capture token" pattern the
// protected-route tests rely on.
async function registerAndLogin(overrides = {}) {
  const body = { ...VALID_USER, ...overrides };
  await request(app).post('/api/auth/register').send(body);
  const res = await loginUser({ email: body.email, password: body.password });
  return { token: res.body.token, user: res.body.user, creds: body };
}

// Reset the in-memory user store before EVERY test so each case starts from an empty store. This makes
// the suite deterministic and independent of test ordering: a test can always (re-)register the email
// it needs without colliding (a duplicate email would otherwise yield 409).
beforeEach(() => {
  userRepository.clear();
});

// ===========================================================================
// POST /api/auth/register
// ===========================================================================
describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201 with a public user (no secret fields leaked)', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    // Public projection (userModel.toPublicUser): the response carries the safe fields...
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.name).toBe(VALID_USER.name);
    // ...defaults the role to 'member' (a client-supplied role is ignored on the public endpoint)...
    expect(res.body.user.role).toBe('member');
    // ...exposes a generated id...
    expect(res.body.user.id).toBeTruthy();
    // ...and NEVER leaks the password hash or the lockout bookkeeping fields.
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.failedAttempts).toBeUndefined();
    expect(res.body.user.lockedUntil).toBeUndefined();
  });

  it('returns 400 when a required field (password) is missing', async () => {
    // Send only the email so the controller's first validation gate reports a missing required field.
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: VALID_USER.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(400);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await registerUser({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for a weak password (fails the length/complexity policy)', async () => {
    const res = await registerUser({ password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 409 when the email is already registered', async () => {
    // First registration succeeds...
    const first = await registerUser();
    expect(first.status).toBe(201);

    // ...the second registration with the SAME email is a duplicate and is rejected with 409.
    const second = await registerUser();
    expect(second.status).toBe(409);
    expect(second.body.error).toBeDefined();
    expect(second.body.error.status).toBe(409);
  });
});

// ===========================================================================
// POST /api/auth/login
// ===========================================================================
describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and returns 200 with a token and the public user', async () => {
    await registerUser();

    const res = await loginUser({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    // The token is a non-empty signed JWT string (the exact value is volatile and is NOT asserted).
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
    // The body also returns the public user.
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns an identical generic 401 for a wrong password and for an unknown email (no enumeration)', async () => {
    await registerUser();

    // Wrong password for an EXISTING user.
    const wrong = await loginUser({ email: VALID_USER.email, password: 'WrongPass9' });
    // Correct-shaped credentials for a NON-EXISTENT user.
    const unknown = await loginUser({ email: 'nobody@example.com', password: 'Whatever123' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    // Both failures surface the SAME single generic message, so a caller cannot distinguish
    // "wrong password" from "no such user" (prevents user enumeration - criterion C6).
    expect(wrong.body.error.message).toBe('Invalid email or password');
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });
});

// ===========================================================================
// GET /api/auth/me  (protected by authMiddleware.authenticate)
// ===========================================================================
describe('GET /api/auth/me', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(401);
  });

  it('returns 200 and the authenticated public user when a valid Bearer token is provided', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 when the Bearer token is malformed', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.status).toBe(401);
  });
});

// ===========================================================================
// POST /api/auth/logout
// ===========================================================================
describe('POST /api/auth/logout', () => {
  it('returns 200 and a logout acknowledgement (public; works without a token)', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});
