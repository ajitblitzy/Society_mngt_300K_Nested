// authService.test.js - Unit tests for the Login (authentication) service: register, login, lockout, getUserById.
//
// Pure, framework-agnostic Jest unit tests for the Society Management Login
// (authentication) feature. They exercise the service-layer business logic in
// `src/services/authService.js` in COMPLETE ISOLATION - no HTTP layer, no Express
// app, no HTTP assertion library, no integration harness, and no database (the in-memory
// `userRepository` is the only persistence). Coverage spans the full public
// contract: `register`, `login`, account `lockout`, and `getUserById`.
//
// STRICTLY ADDITIVE / NON-REGRESSION (AAP C1/C5): this file does not import,
// reference, copy, or depend on any of the archived synthetic scaffold modules.
// Those ship only inside `society_mgmt_300k.zip`, are non-functional arithmetic
// padding, and are never executed by Jest (they are not named `*.test.js`).
//
// SECURITY BASELINE (AAP C6): asserts passwords are stored only as bcrypt hashes
// (never plaintext), the public user view never exposes `passwordHash`, and every
// login failure path returns ONE generic message/status (no user enumeration).
//
// Determinism & headless safety: hashing uses a low bcrypt cost factor (4 rounds,
// set below) for fast, deterministic-speed runs; the lockout scenario is proven
// synchronously via the exported failed-attempt threshold - it never waits out
// the real `LOCK_DURATION_MS` window, so there are no timers, sleeps, or flakes.

// CRITICAL SETUP ORDERING: these env vars MUST be assigned BEFORE any module is
// loaded, so the shared `src/config` loader initializes with a real
// signing secret and a cheap bcrypt cost factor. `src/config` loads dotenv
// non-destructively (it never overwrites already-set `process.env`) and only
// `console.warn`s - never throws - when `JWT_SECRET` is unset, so setting these
// first guarantees `config.jwt.secret === 'test-secret'` and a 4-round hash cost.
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';

const authService = require('../../src/services/authService');
const userRepository = require('../../src/repositories/userRepository');
const tokenUtils = require('../../src/utils/tokenUtils');
const config = require('../../src/config');

// A password that satisfies the policy: >= 8 chars, contains letters AND a digit.
const PASSWORD = 'passw0rd';

/**
 * Await a promise EXACTLY ONCE and return the rejection error.
 *
 * `login` has side effects (it increments the failed-attempts counter on a wrong
 * password), so assertions on both `.status` and `.message` must inspect a single
 * settled rejection rather than re-invoking the service. Throws a descriptive
 * error if the promise unexpectedly resolves, turning a missing rejection into a
 * clear test failure instead of a silent pass.
 *
 * @param {Promise<unknown>} promise - The promise expected to reject.
 * @returns {Promise<Error>} The error the promise rejected with.
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
  // Reset the in-memory user store before AND after every scenario so each test
  // starts from a known-empty state and leaves nothing behind for the next one.
  beforeEach(() => {
    userRepository.clear();
  });
  afterEach(() => {
    userRepository.clear();
  });

  describe('register', () => {
    it('returns a public user (lowercased email, default role member, no secret fields)', async () => {
      const user = await authService.register({
        email: 'Asha@Example.com',
        password: PASSWORD,
        name: 'Asha',
      });
      expect(typeof user.id).toBe('string');
      expect(user.id.length).toBeGreaterThan(0);
      expect(user.email).toBe('asha@example.com'); // normalized: lowercased + trimmed
      expect(user.role).toBe('member'); // default role
      expect(user.name).toBe('Asha');
      // The public view must NEVER carry secret/lockout bookkeeping (C6).
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('failedAttempts');
      expect(user).not.toHaveProperty('lockedUntil');
    });

    it('stores a bcrypt hash, never the plaintext password', async () => {
      await authService.register({ email: 'asha@example.com', password: PASSWORD, name: 'Asha' });
      // findByEmail returns the FULL stored record (including the hash).
      const stored = userRepository.findByEmail('asha@example.com');
      expect(stored.passwordHash).toBeTruthy();
      expect(stored.passwordHash).not.toBe(PASSWORD);
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash signature
    });

    it('rejects a duplicate email with status 409', async () => {
      await authService.register({ email: 'dup@example.com', password: PASSWORD });
      const err = await catchError(
        authService.register({ email: 'dup@example.com', password: PASSWORD }),
      );
      expect(err.status).toBe(409);
    });

    it('rejects a weak (too short) password with status 400', async () => {
      const err = await catchError(
        authService.register({ email: 'weak@example.com', password: 'short' }),
      );
      expect(err.status).toBe(400);
    });

    it('rejects a password with no digit with status 400', async () => {
      const err = await catchError(
        authService.register({ email: 'nodigit@example.com', password: 'passwordonly' }),
      );
      expect(err.status).toBe(400);
    });

    it('rejects an invalid email with status 400', async () => {
      const err = await catchError(
        authService.register({ email: 'not-an-email', password: PASSWORD }),
      );
      expect(err.status).toBe(400);
    });

    it('creates an admin when role: admin is provided', async () => {
      const admin = await authService.register({
        email: 'admin@example.com',
        password: PASSWORD,
        role: 'admin',
      });
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
      // The signed token must decode to the user's id (sub) and role.
      const payload = tokenUtils.verify(token, config.jwt.secret);
      expect(payload.sub).toBe(user.id);
      expect(payload.role).toBe('member');
    });

    it('rejects an unknown email with a generic 401', async () => {
      const err = await catchError(
        authService.login({ email: 'nobody@example.com', password: PASSWORD }),
      );
      expect(err.status).toBe(401);
      expect(err.message).toBe('Invalid email or password');
    });

    it('rejects a wrong password with the SAME generic 401', async () => {
      await authService.register({ email, password: PASSWORD });
      const err = await catchError(authService.login({ email, password: 'wrongpass9' }));
      expect(err.status).toBe(401);
      // Identical to the unknown-email case: no path reveals which check failed.
      expect(err.message).toBe('Invalid email or password');
    });
  });

  describe('lockout', () => {
    it('locks after MAX_FAILED_ATTEMPTS and rejects the correct password with a generic 401', async () => {
      const email = 'lock@example.com';
      await authService.register({ email, password: PASSWORD });

      // Drive exactly MAX_FAILED_ATTEMPTS wrong-password attempts. Use the
      // EXPORTED constant - never a hardcoded literal - so the test tracks the
      // service's real threshold. Every attempt returns the SAME generic 401.
      for (let i = 0; i < authService.MAX_FAILED_ATTEMPTS; i += 1) {
        const err = await catchError(authService.login({ email, password: 'wrongpass9' }));
        expect(err.status).toBe(401);
        expect(err.message).toBe('Invalid email or password');
      }

      // The account is now locked: even the CORRECT password is rejected, with
      // the identical generic message (the lock condition is not disclosed).
      const err = await catchError(authService.login({ email, password: PASSWORD }));
      expect(err.status).toBe(401);
      expect(err.message).toBe('Invalid email or password');

      // Cross-check: the persisted lock window is stamped into the future.
      const rec = userRepository.findByEmail(email);
      expect(new Date(rec.lockedUntil).getTime()).toBeGreaterThan(Date.now());
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
