// authService.js - Authentication business logic (CommonJS): register, login (with lockout), token issuance, /me lookup.
// SECURITY: async bcrypt only; generic login errors (no enumeration); never log secrets/tokens/passwords/hashes.
'use strict';

/**
 * Authentication service (SERVICE layer) for the Society Management Login feature.
 *
 * This module is the orchestration core of the Login (authentication) feature. It
 * sits above the repository/model/domain/utility layers and below the
 * controller/route layers, composing them into the three authentication use cases
 * the application exposes:
 *
 *   - {@link register}    — validate input, enforce email uniqueness, hash the
 *                           password (async bcrypt), and persist a new user.
 *   - {@link login}       — verify credentials, enforce account lockout, and issue
 *                           a signed JWT access token on success.
 *   - {@link getUserById} — resolve the public view of a user for the `/me` route.
 *
 * Architectural contract (must be preserved):
 *   - BUSINESS RULES ONLY. Persistence is delegated to
 *     `src/repositories/userRepository.js` (an in-memory store — AAP §0.6.2; there
 *     is intentionally NO database). Record shaping/sanitization is delegated to
 *     `src/models/userModel.js`. Role knowledge comes from `src/domain/user.js`.
 *     Password hashing and JWT signing are delegated to `src/utils/passwordUtils.js`
 *     and `src/utils/tokenUtils.js` respectively — this service NEVER imports
 *     `bcryptjs` or `jsonwebtoken` directly, and NEVER hardcodes a secret or TTL.
 *   - ASYNC bcrypt ONLY. Hashing/comparison go through `passwordUtils` (which uses
 *     the promise-returning bcryptjs APIs). The synchronous `*Sync` variants are
 *     never used because they block the Node.js event loop (security/perf — §0.5.2).
 *   - GENERIC LOGIN ERRORS. Every login failure cause — unknown email, wrong
 *     password, AND a locked account — throws the SAME {@link GENERIC_AUTH_MESSAGE}
 *     with HTTP status `401`, so the response never reveals whether an email exists
 *     or whether an account is locked (anti-enumeration — §0.8, criterion C6).
 *   - NO SECRET LOGGING. This module never logs passwords, password hashes, tokens,
 *     or the JWT secret, and performs no `console` output of any kind.
 *   - ERROR ENVELOPE. Every thrown error carries a numeric `.status` property
 *     (400/401/409). `src/middleware/errorHandler.js` derives the HTTP status from
 *     `err.status || err.statusCode` and emits the shared `{ error: { message,
 *     status } }` envelope (4xx surfaces `err.message`; 5xx is genericized).
 *
 * Consumers:
 *   - `src/controllers/authController.js` — register/login/me request handlers.
 *   - `tests/unit/authService.test.js`    — exercises this service directly.
 *
 * @module services/authService
 */

const userRepository = require('../repositories/userRepository'); // { create, findByEmail, findById, update, findAll, count, clear, seedDefaultAdmin }
const { toPublicUser } = require('../models/userModel');           // toPublicUser(user) -> { id, email, role, name, createdAt, updatedAt } | null
const { DEFAULT_ROLE, isValidRole } = require('../domain/user');   // DEFAULT_ROLE = 'member'; isValidRole(role) -> boolean
const passwordUtils = require('../utils/passwordUtils');           // async { hash(password, rounds), compare(password, hash) } — bcryptjs
const tokenUtils = require('../utils/tokenUtils');                 // { sign(payload, secret, options), verify(token, secret) } — jsonwebtoken
const validation = require('../utils/validation');                // { isNonEmptyString, isValidEmail, isValidPassword, getMissingFields, hasRequiredFields }
const config = require('../config');                              // frozen { port, env, nodeEnv, jwt: { secret, expiresIn }, bcryptRounds }

/**
 * Number of consecutive failed login attempts permitted before an account is
 * temporarily locked. Once `failedAttempts` reaches this threshold, a
 * {@link LOCK_DURATION_MS}-long lock window is applied. Exported so the unit
 * test can drive the lockout scenario without hardcoding the magic number.
 *
 * @constant {number}
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Duration, in milliseconds, of the account-lockout window applied once
 * {@link MAX_FAILED_ATTEMPTS} consecutive failures occur (15 minutes). Exported
 * alongside {@link MAX_FAILED_ATTEMPTS} for the unit test.
 *
 * @constant {number}
 */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * The SINGLE, generic message returned for EVERY login failure — unknown email,
 * wrong password, and locked account alike. Using one indistinguishable message
 * (and status) for all failure causes prevents user/account enumeration
 * (security baseline C6 / AAP §0.5.2, §0.8).
 *
 * @constant {string}
 */
const GENERIC_AUTH_MESSAGE = 'Invalid email or password';

/**
 * Build an {@link Error} that carries a numeric HTTP `status`, so the shared
 * error handler can map it to the correct response code in the
 * `{ error: { message, status } }` envelope.
 *
 * @param {string} message - Human-readable error message. For login failures
 *   this is always {@link GENERIC_AUTH_MESSAGE}; for registration it is a clear,
 *   non-enumerating description.
 * @param {number} status - The HTTP status to associate (e.g. 400, 401, 409).
 * @returns {Error} An error instance with a `.status` property set.
 */
function authError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Determine whether a user account is currently within an active lock window.
 *
 * A `null`/absent `lockedUntil` is treated as "not locked", and any malformed
 * `lockedUntil` value (one that does not parse to a finite epoch time) is also
 * treated as "not locked" so a corrupt record can never permanently lock a user
 * out. The account is considered locked only when the parsed expiry is strictly
 * in the future relative to `Date.now()`.
 *
 * @param {object|null|undefined} user - A full user record (as returned by
 *   `userRepository.findByEmail`), which may carry a `lockedUntil` field.
 * @returns {boolean} `true` if the account is locked right now, else `false`.
 */
function isLocked(user) {
  if (!user || !user.lockedUntil) {
    return false;
  }
  const until = new Date(user.lockedUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}

/**
 * Record a single failed login attempt for a user and persist it.
 *
 * Increments the user's `failedAttempts` counter (coercing a missing/garbage
 * value to `0` first). When the counter reaches {@link MAX_FAILED_ATTEMPTS}, an
 * ISO-8601 `lockedUntil` timestamp {@link LOCK_DURATION_MS} in the future is
 * stamped onto the record, locking the account. The change is persisted through
 * `userRepository.update`, which mutates the canonical in-memory store so the
 * next `findByEmail` observes the updated counters.
 *
 * This is only ever called after a failed password comparison (never while an
 * account is already locked), so the counter does not keep climbing during an
 * active lock window.
 *
 * @param {object} user - The full user record whose failure is being recorded.
 *   Must contain a valid `id`.
 * @returns {void}
 */
function recordFailedAttempt(user) {
  const failedAttempts = (Number(user.failedAttempts) || 0) + 1;
  const changes = { failedAttempts };
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    changes.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
  }
  userRepository.update(user.id, changes);
}

/**
 * Sign a JWT access token for an authenticated user.
 *
 * The payload deliberately carries the minimal claims the rest of the app needs:
 * `sub` (the user id — the subject) and `role` are required by
 * `src/middleware/authMiddleware.js` to populate `req.user` and enforce role
 * guards; `email` is included for convenience/traceability. The token is signed
 * with the configured secret and an `expiresIn` lifetime — both sourced from
 * config (never hardcoded), routed exclusively through `tokenUtils.sign`.
 *
 * @param {object} user - The authenticated user record (needs `id`, `email`,
 *   `role`).
 * @returns {string} The encoded, signed, expiring JWT.
 */
function issueToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return tokenUtils.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Register a new user account.
 *
 * Validates the incoming request body, resolves the role securely, enforces
 * email uniqueness (the repository intentionally does not), hashes the password
 * with the async bcrypt API and the configured cost factor, persists the record,
 * and returns the sanitized public view (never the password hash).
 *
 * SECURITY — role assignment: the role defaults to {@link DEFAULT_ROLE}
 * (`'member'`). A `role` is honoured only when explicitly supplied AND valid; to
 * prevent privilege escalation via public self-registration, the public
 * controller/route MUST call this with only `{ email, password, name }` (so the
 * role defaults to member). The `role` parameter exists so trusted/seed flows and
 * unit tests can provision administrators.
 *
 * @param {object} [input={}] - The registration payload (request body).
 * @param {string} input.email - Login email; normalized to lower-case on persist.
 * @param {string} input.password - Plaintext password (min 8 chars, ≥1 letter,
 *   ≥1 digit). Hashed before storage; never persisted or logged in plaintext.
 * @param {string} [input.name] - Optional display name.
 * @param {string} [input.role] - Optional role; only trusted callers should set
 *   this. Defaults to `'member'`.
 * @returns {Promise<object>} The public user view
 *   `{ id, email, role, name, createdAt, updatedAt }` (no `passwordHash` or
 *   lockout fields).
 * @throws {Error} `.status === 400` when required fields are missing, the email
 *   is invalid, the password is too weak, or an explicit role is invalid.
 * @throws {Error} `.status === 409` when the email is already registered.
 */
async function register(input = {}) {
  const { email, password, name, role } = input || {};

  // Required-field guard. A clear (non-enumerating) 400 — registration is a
  // public-creation flow, so it may surface specific validation messages.
  if (validation.getMissingFields(input, ['email', 'password']).length) {
    throw authError('Email and password are required', 400);
  }
  if (!validation.isValidEmail(email)) {
    throw authError('A valid email is required', 400);
  }
  if (!validation.isValidPassword(password)) {
    throw authError(
      'Password must be at least 8 characters and include letters and numbers',
      400
    );
  }

  // SECURITY: public registration must default to 'member'; clients must not be
  // able to self-assign 'admin'. Only honour an explicitly provided, valid role.
  let resolvedRole = DEFAULT_ROLE;
  if (role !== undefined && role !== null && role !== '') {
    if (!isValidRole(role)) {
      throw authError('Invalid role', 400);
    }
    resolvedRole = role;
  }

  // Uniqueness is THIS service's responsibility (the repository does not enforce
  // it). The lookup is case-insensitive, matching how the record is stored.
  if (userRepository.findByEmail(email)) {
    throw authError('Email already registered', 409);
  }

  // Hash with the ASYNC bcrypt API and the configured cost factor. Never log the
  // plaintext password or the resulting hash.
  const passwordHash = await passwordUtils.hash(password, config.bcryptRounds);

  // Persist via the repository (which shapes the canonical record internally and
  // never hashes). Return only the sanitized public view.
  const user = userRepository.create({
    email,
    passwordHash,
    role: resolvedRole,
    name,
  });
  return toPublicUser(user);
}

/**
 * Authenticate a user and, on success, issue a JWT access token.
 *
 * The step ordering is deliberate for both correctness and anti-enumeration:
 *   1. Reject non-string/blank credentials with the generic 401 (do not reveal
 *      which field was missing).
 *   2. Look the user up; an unknown email yields the SAME generic 401.
 *   3. Check the lockout window BEFORE verifying the password — a locked account
 *      is rejected with the same generic 401 even when the password is correct,
 *      and the failure counter is NOT incremented further while locked.
 *   4. Defensively reject a record with no stored hash (generic 401).
 *   5. Compare the password with the async bcrypt API. On mismatch, record the
 *      failed attempt (which may trigger a lock) and throw the generic 401.
 *   6. On success, reset the lockout counters and return the token plus the
 *      public user view.
 *
 * @param {object} [credentials={}] - The login payload (request body).
 * @param {string} credentials.email - The account email (any casing/whitespace).
 * @param {string} credentials.password - The candidate plaintext password.
 * @returns {Promise<{ token: string, user: object }>} On success, an object with
 *   a freshly signed `token` and the sanitized public `user`. The controller
 *   responds with this shape; integration tests assert a token is present.
 * @throws {Error} `.status === 401` with message {@link GENERIC_AUTH_MESSAGE} for
 *   EVERY failure cause (missing/blank input, unknown email, locked account,
 *   missing hash, or wrong password) — indistinguishable by design.
 */
async function login(credentials = {}) {
  const { email, password } = credentials || {};

  // Treat any non-string/blank input as a generic failure (no field-level hints).
  if (!validation.isNonEmptyString(email) || !validation.isNonEmptyString(password)) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Unknown email -> same generic failure (do not reveal the email is unknown).
  const user = userRepository.findByEmail(email);
  if (!user) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Lockout is checked BEFORE password verification: a locked account is rejected
  // with the same generic message even if the password is correct, and we do not
  // increment the counter while locked.
  if (isLocked(user)) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Defensive: a record without a stored hash can never authenticate.
  if (!user.passwordHash) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Verify with the ASYNC compare. On failure, record the attempt (which may
  // trigger a lock once the threshold is reached) and fail generically.
  const ok = await passwordUtils.compare(password, user.passwordHash);
  if (!ok) {
    recordFailedAttempt(user);
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Success: clear the lockout bookkeeping, then issue the token.
  userRepository.update(user.id, { failedAttempts: 0, lockedUntil: null });
  return { token: issueToken(user), user: toPublicUser(user) };
}

/**
 * Resolve the public view of a user by id — backs the `GET /api/auth/me` route.
 *
 * The `/me` controller calls this with `req.user.sub` (the JWT `sub` claim set by
 * `authMiddleware`). The returned public view includes profile/audit fields
 * (`name`, `createdAt`, `updatedAt`) that are NOT carried in the token, and never
 * includes the password hash or lockout fields. Synchronous: the lookup hits the
 * in-memory store.
 *
 * @param {string} id - The user id (typically the JWT subject claim).
 * @returns {object|null} The public user view
 *   `{ id, email, role, name, createdAt, updatedAt }`, or `null` when no user
 *   with the given id exists.
 */
function getUserById(id) {
  return toPublicUser(userRepository.findById(id));
}

module.exports = {
  register,
  login,
  getUserById,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
};
