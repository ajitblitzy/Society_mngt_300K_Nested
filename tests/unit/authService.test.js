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
// Used only by the trusted admin-seeding test below as the async `hashFn` that
// `userRepository.seedDefaultAdmin` delegates password hashing to.
const passwordUtils = require('../../src/utils/passwordUtils');

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

    it('is concurrency-safe: two simultaneous registrations for the same email create exactly ONE account (one 409)', async () => {
      // RACE-CONDITION REGRESSION (CP5 finding #3). Fire two registrations for the
      // SAME email CONCURRENTLY. Both invocations run synchronously up to the
      // `await` on bcrypt hashing, so BOTH pass the pre-hash fast-fail check while
      // the store is still empty, and both then await hashing — exactly the
      // interleaving that previously allowed two accounts. The repository's atomic
      // `createUniqueByEmail` (a synchronous, await-free check+insert) must let
      // only ONE win: we assert exactly one fulfilled result and one rejection
      // carrying the duplicate-email 409, and that exactly one record persisted.
      const email = 'race@example.com';
      const results = await Promise.allSettled([
        authService.register({ email, password: PASSWORD, name: 'A' }),
        authService.register({ email, password: PASSWORD, name: 'B' }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      // The loser is rejected with the duplicate-email 409 — never a 500 or a
      // second successful create.
      expect(rejected[0].reason.status).toBe(409);

      // Data-integrity invariant: exactly ONE account exists for that email; no
      // duplicate identity slipped into the in-memory store.
      const matches = userRepository.findAll().filter((u) => u.email === email);
      expect(matches).toHaveLength(1);
      expect(userRepository.count()).toBe(1);
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

    it('ignores a caller-supplied role and always defaults to member (no privilege escalation)', async () => {
      // SECURITY (AAP §0.8 / CP2): generic/public registration must NEVER honor a
      // caller-supplied role. Even when an attacker submits role: 'admin', the
      // created account is a plain member — there is no path from this untrusted
      // input to an elevated role. Admins are provisioned only via the trusted
      // seeding path exercised in the 'trusted admin seeding' suite below.
      const user = await authService.register({
        email: 'sneaky@example.com',
        password: PASSWORD,
        role: 'admin',
      });
      expect(user.role).toBe('member');

      // Defense in depth: the PERSISTED record is a member too, proving the
      // escalation is blocked at the service boundary, not merely in the response.
      const stored = userRepository.findByEmail('sneaky@example.com');
      expect(stored.role).toBe('member');
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

    it('returns an IDENTICAL generic 401 for unknown-email, wrong-password, AND locked-account (parity)', async () => {
      // ANTI-ENUMERATION PARITY (AAP C6): capture the error from all three
      // distinct failure modes in a SINGLE test and assert they are byte-identical
      // in both `.status` and `.message`, so no branch reveals which check failed.

      // 1) Unknown email.
      const unknownErr = await catchError(
        authService.login({ email: 'ghost@example.com', password: PASSWORD }),
      );

      // 2) Wrong password against a known, not-yet-locked account.
      await authService.register({ email: 'wrong@example.com', password: PASSWORD });
      const wrongPassErr = await catchError(
        authService.login({ email: 'wrong@example.com', password: 'wrongpass9' }),
      );

      // 3) Locked account: cross the failed-attempt threshold (using the EXPORTED
      // constant), then attempt the CORRECT password — rejected because locked.
      await authService.register({ email: 'locked@example.com', password: PASSWORD });
      for (let i = 0; i < authService.MAX_FAILED_ATTEMPTS; i += 1) {
        await catchError(authService.login({ email: 'locked@example.com', password: 'wrongpass9' }));
      }
      const lockedErr = await catchError(
        authService.login({ email: 'locked@example.com', password: PASSWORD }),
      );

      // Parity: identical status AND message across all three branches.
      expect(unknownErr.status).toBe(401);
      expect(wrongPassErr.status).toBe(401);
      expect(lockedErr.status).toBe(401);
      expect(unknownErr.message).toBe('Invalid email or password');
      expect(wrongPassErr.message).toBe(unknownErr.message);
      expect(lockedErr.message).toBe(unknownErr.message);
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

  describe('trusted admin seeding (userRepository.seedDefaultAdmin)', () => {
    // The async hashFn the repository delegates to — mirrors how authService
    // hashes, using the configured (cheap, in tests) bcrypt cost factor.
    const hashFn = (plaintext) => passwordUtils.hash(plaintext, config.bcryptRounds);

    it('creates an admin ONLY through the explicit trusted path, with an explicit password', async () => {
      // This is the SOLE sanctioned way to provision an administrator: an
      // explicit, trusted call supplying a hashFn and an explicit (non-hard-coded)
      // password. The generic register() path can never produce an admin.
      const admin = await userRepository.seedDefaultAdmin(hashFn, {
        email: 'root@society.local',
        password: 'Admin1234',
        name: 'Root Admin',
      });
      expect(admin.role).toBe('admin');
      expect(admin.email).toBe('root@society.local');
      // The explicit password was bcrypt-hashed (never stored as plaintext).
      expect(admin.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(admin.passwordHash).not.toBe('Admin1234');

      // The seeded admin can authenticate, and its token carries the admin role —
      // proving the trusted path is the genuine source of administrators.
      const { token, user } = await authService.login({ email: 'root@society.local', password: 'Admin1234' });
      expect(user.role).toBe('admin');
      const payload = tokenUtils.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      expect(payload.role).toBe('admin');
    });

    it('refuses to seed an admin without an explicit password (no hard-coded credential)', async () => {
      // SECURITY regression gate: there is NO default password. Omitting it must
      // throw, so an account is never created with a known, embedded credential.
      const err = await catchError(
        userRepository.seedDefaultAdmin(hashFn, { email: 'nopass@society.local' }),
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/password is required/i);
      // Nothing was persisted for that email.
      expect(userRepository.findByEmail('nopass@society.local')).toBeNull();
    });
  });
});
