// authService.test.js - Unit tests for the Login (authentication) service: register, login, lockout, getUserById.
//
// Pure SERVICE-LAYER unit tests (no HTTP, no Express app, no server, no supertest). They exercise
// src/services/authService.js directly against the in-memory userRepository, asserting the business
// rules that make up the Login feature (AAP 0.5.1 Group 5, 0.5.2, criterion C3/C6):
//   * register  - public-user projection (no secret fields), email normalization, bcrypt hashing,
//                 duplicate (409) / weak-password (400) / invalid-email (400) / role handling.
//   * login     - { token, user } success + JWT payload (sub/role); and the SINGLE generic 401
//                 'Invalid email or password' returned for unknown-email, wrong-password, AND locked
//                 accounts alike (no user/lock enumeration).
//   * lockout   - after authService.MAX_FAILED_ATTEMPTS failures the account locks and even the
//                 correct password is rejected with the same generic 401.
//   * getUserById - synchronous public-user lookup; null for a missing id.
//
// Jest is zero-config in this repo: describe/it/expect/beforeEach/afterEach are injected globals, so
// this file does NOT require('jest') or require('@jest/globals'). It introduces no dependency on any
// archived file_*.js / src/utils/filler.js module (non-regression C1/C5) and modifies no existing file.
// Wiring is plain CommonJS require() with relative paths (../../src/...).

// CRITICAL setup ordering: these env vars MUST be assigned BEFORE any require(). src/config/authConfig
// reads JWT_SECRET from process.env at module-load time, and the first require below (authService)
// transitively loads src/config -> authConfig. Setting JWT_SECRET first guarantees a real signing
// secret so the login token verifies during the success-path assertion; BCRYPT_ROUNDS keeps hashing
// cheap. (authConfig enforces a secure minimum of 10 rounds, so '4' is clamped up to 10 with a benign
// warning - hashing stays fast enough for deterministic, headless tests either way.)
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';

const authService = require('../../src/services/authService');
const userRepository = require('../../src/repositories/userRepository');
const tokenUtils = require('../../src/utils/tokenUtils');
const config = require('../../src/config');

// A password that satisfies the baseline policy (>= 8 chars, at least one letter AND one digit).
const PASSWORD = 'passw0rd';

// A different, policy-valid password used as the WRONG password on login. It is well-formed (so it
// could never be rejected by validation) yet deliberately does not match the stored hash, which is
// exactly what drives the failed-attempt / lockout paths.
const WRONG_PASSWORD = 'wrongpass9';

// The single generic message every login failure path must surface (no user/lock enumeration).
const GENERIC_LOGIN_ERROR = 'Invalid email or password';

/**
 * Await a promise EXACTLY once and return the error it rejects with.
 *
 * Using this instead of expect(...).rejects (or a re-invoking matcher) is important because login()
 * has side effects (it increments the failed-attempt counter on a wrong password). Awaiting a single
 * time lets a test assert on BOTH err.status AND err.message without triggering the side effect twice.
 * If the promise unexpectedly resolves, we throw so the test fails loudly rather than silently.
 *
 * @param {Promise<*>} promise - The (already-invoked) promise expected to reject.
 * @returns {Promise<Error>} The rejection reason.
 */
async function catchError(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Expected promise to reject, but it resolved');
}

describe('authService', () => {
  // Reset the in-memory user store before AND after every scenario so each test starts from a clean,
  // deterministic state and leaves nothing behind for the next suite.
  beforeEach(() => {
    userRepository.clear();
  });
  afterEach(() => {
    userRepository.clear();
  });

  describe('register', () => {
    it('returns a public user (lowercased email, default role member, no secret fields)', async () => {
      const user = await authService.register({ email: 'Asha@Example.com', password: PASSWORD, name: 'Asha' });

      expect(typeof user.id).toBe('string');
      expect(user.id.length).toBeGreaterThan(0);
      expect(user.email).toBe('asha@example.com'); // normalized: lowercased + trimmed
      expect(user.role).toBe('member'); // default role
      expect(user.name).toBe('Asha');
      // Security baseline (C6): the public view must never carry the credential or lockout internals.
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('failedAttempts');
      expect(user).not.toHaveProperty('lockedUntil');
    });

    it('stores a bcrypt hash, never the plaintext password', async () => {
      await authService.register({ email: 'asha@example.com', password: PASSWORD, name: 'Asha' });

      // findByEmail returns the FULL stored record (including passwordHash) - read it to prove the
      // password was hashed and never persisted in plaintext.
      const stored = userRepository.findByEmail('asha@example.com');
      expect(stored.passwordHash).toBeTruthy();
      expect(stored.passwordHash).not.toBe(PASSWORD);
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash signature
    });

    it('rejects a duplicate email with status 409', async () => {
      await authService.register({ email: 'dup@example.com', password: PASSWORD });

      const err = await catchError(authService.register({ email: 'dup@example.com', password: PASSWORD }));
      expect(err.status).toBe(409);
      expect(err.message).toBe('Email already registered');
    });

    it('rejects a too-short password with status 400', async () => {
      const err = await catchError(authService.register({ email: 'weak@example.com', password: 'short' }));
      expect(err.status).toBe(400);
    });

    it('rejects a password with no digit with status 400', async () => {
      const err = await catchError(authService.register({ email: 'nodigit@example.com', password: 'passwordonly' }));
      expect(err.status).toBe(400);
    });

    it('rejects an invalid email with status 400', async () => {
      const err = await catchError(authService.register({ email: 'not-an-email', password: PASSWORD }));
      expect(err.status).toBe(400);
    });

    it('creates an admin when role: admin is provided', async () => {
      const admin = await authService.register({ email: 'admin@example.com', password: PASSWORD, role: 'admin' });
      expect(admin.role).toBe('admin');
    });
  });

  describe('login', () => {
    const email = 'login@example.com';

    it('returns { token, user } and the token verifies with sub + role', async () => {
      await authService.register({ email, password: PASSWORD, name: 'Log In' });

      const { token, user } = await authService.login({ email, password: PASSWORD });

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(user.email).toBe(email);
      expect(user).not.toHaveProperty('passwordHash');

      // Decode + verify the JWT with the configured secret and assert it exposes the principal id
      // (sub) and role so authMiddleware / GET /api/auth/me can rely on them.
      const payload = tokenUtils.verify(token, config.jwt.secret);
      expect(payload.sub).toBe(user.id);
      expect(payload.role).toBe('member');
    });

    it('rejects an unknown email with a generic 401', async () => {
      const err = await catchError(authService.login({ email: 'nobody@example.com', password: PASSWORD }));
      expect(err.status).toBe(401);
      expect(err.message).toBe(GENERIC_LOGIN_ERROR);
    });

    it('rejects a wrong password with the SAME generic 401', async () => {
      await authService.register({ email, password: PASSWORD });

      const err = await catchError(authService.login({ email, password: WRONG_PASSWORD }));
      expect(err.status).toBe(401);
      // MUST be byte-identical to the unknown-email message: no path reveals which condition failed.
      expect(err.message).toBe(GENERIC_LOGIN_ERROR);
    });
  });

  describe('lockout', () => {
    it('locks after MAX_FAILED_ATTEMPTS and rejects the correct password with a generic 401', async () => {
      const email = 'lock@example.com';
      await authService.register({ email, password: PASSWORD });

      // Drive exactly MAX_FAILED_ATTEMPTS failed logins using the exported constant (never a literal 5)
      // so the loop tracks the single source of truth for the lockout threshold.
      for (let i = 0; i < authService.MAX_FAILED_ATTEMPTS; i += 1) {
        const err = await catchError(authService.login({ email, password: WRONG_PASSWORD }));
        expect(err.status).toBe(401);
        expect(err.message).toBe(GENERIC_LOGIN_ERROR);
      }

      // The account is now locked: even the CORRECT password is rejected, and with the same generic
      // 401 message (proving the lock state is not disclosed - no enumeration).
      const err = await catchError(authService.login({ email, password: PASSWORD }));
      expect(err.status).toBe(401);
      expect(err.message).toBe(GENERIC_LOGIN_ERROR);

      // Cross-check the persisted lockout state: lockedUntil is a future timestamp.
      const record = userRepository.findByEmail(email);
      expect(new Date(record.lockedUntil).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getUserById', () => {
    it('returns the public user for a known id and null for a missing id', async () => {
      const created = await authService.register({ email: 'me@example.com', password: PASSWORD, name: 'Me' });

      const found = authService.getUserById(created.id);
      expect(found).toMatchObject({ id: created.id, email: 'me@example.com', role: 'member' });
      expect(found).not.toHaveProperty('passwordHash');

      expect(authService.getUserById('does-not-exist')).toBeNull();
    });
  });
});
