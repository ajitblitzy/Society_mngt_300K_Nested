// authService.js - Authentication business logic (CommonJS): register, login (with lockout), token issuance, /me lookup.
//
// SERVICE LAYER (Login feature - the prerequisite capability that Reporting reuses).
// This module is the orchestration core of the Society Management authentication
// flow. It is the single place that composes the lower layers into the three
// business operations the API needs:
//   * register(input)      -> validate + de-duplicate + hash + persist a new user.
//   * login(credentials)   -> verify credentials, enforce account lockout, issue a JWT.
//   * getUserById(id)      -> resolve the authenticated principal for GET /api/auth/me.
//
// It deliberately owns ONLY business rules; it delegates every cross-cutting
// concern to a dedicated collaborator so each layer stays single-purpose:
//   - persistence            -> src/repositories/userRepository.js (in-memory store)
//   - record shape / sanitize -> src/models/userModel.js (toPublicUser)
//   - role policy            -> src/domain/user.js (DEFAULT_ROLE, isValidRole)
//   - password hashing       -> src/utils/passwordUtils.js (ASYNC bcryptjs)
//   - token issuance         -> src/utils/tokenUtils.js (jsonwebtoken)
//   - input validation       -> src/utils/validation.js (pure predicates)
//   - configuration          -> src/config (frozen { jwt:{secret,expiresIn}, bcryptRounds })
//
// SECURITY (AAP 0.5.2, 0.8, criterion C6):
//   * ASYNC bcrypt ONLY - this file never calls a synchronous hash/compare and
//     never requires('bcryptjs') directly; all hashing flows through passwordUtils
//     so the CPU-intensive work stays off the Node.js event loop.
//   * GENERIC login errors - an unknown email, a wrong password, AND a locked
//     account all reject with the identical message + 401 status, so an attacker
//     cannot enumerate which emails exist or which accounts are locked.
//   * Account lockout - consecutive failed password checks increment a per-user
//     counter; once it reaches MAX_FAILED_ATTEMPTS the account is locked for
//     LOCK_DURATION_MS. The lockout is checked BEFORE password verification and is
//     reset on a successful login.
//   * NO logging of secrets - passwords, password hashes, tokens, and the JWT
//     secret are never written to the console or any stream.
//   * Public views only - every returned user is projected through toPublicUser so
//     the bcrypt hash and the internal lockout fields can never leak over the API.
//
// Consumed by src/controllers/authController.js (register/login/me request handlers)
// and exercised directly by tests/unit/authService.test.js.
//
// Module system: CommonJS (require / module.exports). This new wiring is the
// sanctioned additive convention (AAP 0.1.2 / 0.8); the pre-existing read-only
// scaffold modules are never imported, referenced, or modified here (AAP 0.6.2;
// non-regression criteria C1/C2/C5).

'use strict';

// ---------------------------------------------------------------------------
// Collaborator imports (CommonJS). Each is a sibling layer module whose public
// contract was verified against its actual export shape. NOTHING here imports a
// third-party package directly: bcryptjs is reached only via passwordUtils and
// jsonwebtoken only via tokenUtils, keeping this service config- and library-
// agnostic and trivially testable.
// ---------------------------------------------------------------------------

// In-memory user persistence. Used here: create (register), findByEmail (login +
// uniqueness check), findById (/me lookup), update (persist/reset lockout fields).
const userRepository = require('../repositories/userRepository');

// Pure sanitizer that maps a full user record to its leak-safe public view
// ({ id, email, role, name, createdAt, updatedAt }) - never the passwordHash or
// the lockout fields. Used for every user value this service returns.
const { toPublicUser } = require('../models/userModel');

// Domain role policy (single source of truth). DEFAULT_ROLE ('member') is applied
// to self-registration; isValidRole gates any explicitly-provided role.
const { DEFAULT_ROLE, isValidRole } = require('../domain/user');

// ASYNC bcrypt helpers. hash(password, rounds) -> Promise<string> on register;
// compare(password, hash) -> Promise<boolean> on login. The synchronous bcrypt
// APIs are intentionally never used.
const passwordUtils = require('../utils/passwordUtils');

// JWT helpers. sign(payload, secret, options) -> token string, used to mint the
// access token after a successful login. (verify is consumed by authMiddleware.)
const tokenUtils = require('../utils/tokenUtils');

// Pure input validators: required-field detection, email syntax, password policy
// (>=8 chars with at least one letter and one digit), and non-empty-string guards.
const validation = require('../utils/validation');

// Frozen runtime configuration. Read here: config.jwt.secret + config.jwt.expiresIn
// for token signing, and config.bcryptRounds for password hashing. The secret/TTL
// and cost factor are NEVER hardcoded - they always come from config.
const config = require('../config');

// ---------------------------------------------------------------------------
// Module-level constants (account-lockout policy + the single generic auth
// message). MAX_FAILED_ATTEMPTS and LOCK_DURATION_MS are exported so the unit
// tests can drive the lockout scenario without hardcoding magic numbers.
// ---------------------------------------------------------------------------

/**
 * Number of consecutive failed login attempts permitted before an account is
 * temporarily locked. The lock engages once the failure counter REACHES this
 * threshold (i.e. on the Nth failed attempt).
 *
 * @constant
 * @type {number}
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Duration of an account lock, in milliseconds (15 minutes). After this window
 * elapses the stored `lockedUntil` timestamp is in the past and {@link isLocked}
 * once again reports the account as unlocked.
 *
 * @constant
 * @type {number}
 */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * The SINGLE message returned for every login failure - unknown email, wrong
 * password, missing-credential, malformed-credential, and locked-account alike.
 * Using one identical message (paired with a 401 status) is what prevents user
 * and lockout-state enumeration on the authentication path (AAP 0.5.2 / 0.8).
 *
 * @constant
 * @type {string}
 */
const GENERIC_AUTH_MESSAGE = 'Invalid email or password';

// ---------------------------------------------------------------------------
// Private helpers (NOT exported).
// ---------------------------------------------------------------------------

/**
 * Build an Error carrying a numeric HTTP `status` property.
 *
 * The application's shared error envelope ({ error: { message, status } }) and
 * src/middleware/errorHandler.js derive the response code from `err.status ||
 * err.statusCode` (default 500; 5xx -> a generic message, 4xx -> err.message).
 * Every error thrown by this service therefore MUST carry a numeric `status` so
 * the correct HTTP code and message reach the client.
 *
 * @param {string} message - Human-readable error message.
 * @param {number} status - HTTP status code to attach (e.g. 400, 401, 409).
 * @returns {Error} An Error instance with `.status` set to `status`.
 */
function authError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Report whether a user account is currently locked.
 *
 * An account is locked only when it has a `lockedUntil` value that parses to a
 * finite timestamp in the future. A null/absent `lockedUntil` is treated as "not
 * locked", and any malformed value (one that yields `NaN` from `new Date(...)`)
 * is tolerated as "not locked" rather than throwing - so a corrupt field can
 * never permanently wedge an account out of (or into) a locked state.
 *
 * @param {Object|null|undefined} user - A full user record (may be null).
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
 * Record a single failed login attempt and engage a lock when the threshold is
 * reached, persisting the change through the repository.
 *
 * The failure counter is read defensively (`Number(...) || 0`) so a missing or
 * non-numeric `failedAttempts` starts from zero, then incremented by one. When
 * the new count reaches {@link MAX_FAILED_ATTEMPTS}, a `lockedUntil` timestamp
 * {@link LOCK_DURATION_MS} in the future is added to the change set. The partial
 * change is persisted via `userRepository.update`, which also bumps `updatedAt`.
 *
 * This is only ever called AFTER a genuine password mismatch (never while the
 * account is already locked), so the counter advances by exactly one per real
 * failed verification.
 *
 * @param {Object} user - The full user record whose failure state is advancing.
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
 * Sign and return a JWT access token for an authenticated user.
 *
 * The payload always carries at least `{ sub, role }` (plus `email`) so that
 * src/middleware/authMiddleware.js can populate `req.user` and enforce role
 * guards, and so GET /api/auth/me can resolve the principal via `req.user.sub`.
 * The token is signed with the configured secret and given the configured
 * lifetime; neither the secret nor the TTL is ever hardcoded here.
 *
 * @param {Object} user - The full user record (must have id, email, role).
 * @returns {string} A signed, compact JWT string.
 */
function issueToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return tokenUtils.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// ---------------------------------------------------------------------------
// Public service API.
// ---------------------------------------------------------------------------

/**
 * Register a new Society Management user.
 *
 * Validates the payload, enforces email uniqueness, hashes the password with the
 * async bcrypt API at the configured cost, persists the record, and returns the
 * leak-safe public view of the created user (never the password hash).
 *
 * Validation / error contract (every thrown Error carries a numeric `.status`):
 *   - 400 when `email` or `password` is missing/blank.
 *   - 400 when `email` is not a syntactically valid address.
 *   - 400 when `password` fails the policy (>= 8 chars with a letter and a digit).
 *   - 400 when an explicitly-provided `role` is not a recognized role.
 *   - 409 when the (case-insensitive) email is already registered.
 *
 * SECURITY - role resolution: the role defaults to DEFAULT_ROLE ('member'). A
 * caller MAY pass an explicit `role` (validated via isValidRole) so trusted/seed
 * flows and unit tests can create admins, but to prevent privilege escalation via
 * public self-registration the public controller/route MUST NOT forward a
 * client-controlled `role` - it should call this with only { email, password,
 * name } so the role safely defaults to 'member'.
 *
 * @param {Object} [input={}] - The registration body.
 * @param {string} input.email - Required. Email address (stored lower-cased).
 * @param {string} input.password - Required. Plaintext password (hashed, never stored/logged).
 * @param {string} [input.name] - Optional display name.
 * @param {string} [input.role] - Optional explicit role; defaults to 'member' when omitted.
 * @returns {Promise<{id: string, email: string, role: string, name: string,
 *   createdAt: string, updatedAt: string}>} The created user's public view.
 * @throws {Error} With `.status` 400 (validation) or 409 (duplicate email).
 */
async function register(input = {}) {
  // Normalize to a safe object so an explicit null/non-object argument cannot
  // throw on destructuring (the `= {}` default only covers a strictly-undefined
  // argument). getMissingFields also tolerates a non-object, but normalizing keeps
  // the destructure and the validators consistent.
  const body = input && typeof input === 'object' ? input : {};
  const { email, password, name, role } = body;

  // --- required fields --------------------------------------------------------
  if (validation.getMissingFields(body, ['email', 'password']).length) {
    throw authError('Email and password are required', 400);
  }

  // --- email syntax -----------------------------------------------------------
  if (!validation.isValidEmail(email)) {
    throw authError('A valid email is required', 400);
  }

  // --- password policy (>= 8 chars, at least one letter and one digit) --------
  if (!validation.isValidPassword(password)) {
    throw authError(
      'Password must be at least 8 characters and include letters and numbers',
      400
    );
  }

  // --- role resolution (secure default; validate only when explicitly given) --
  // SECURITY: public registration must default to 'member'; clients must not be
  // able to self-assign 'admin'. The optional, validated parameter exists solely
  // for trusted/seed flows and tests.
  let resolvedRole = DEFAULT_ROLE;
  if (role !== undefined && role !== null && role !== '') {
    if (!isValidRole(role)) {
      throw authError('Invalid role', 400);
    }
    resolvedRole = role;
  }

  // --- uniqueness (the repository does NOT enforce this) ----------------------
  // findByEmail is case-insensitive, matching how the record stores the email.
  if (userRepository.findByEmail(email)) {
    throw authError('Email already registered', 409);
  }

  // --- hash with the ASYNC bcrypt API at the configured cost ------------------
  // Never the sync API; the plaintext and the resulting hash are never logged.
  const passwordHash = await passwordUtils.hash(password, config.bcryptRounds);

  // --- persist + return the leak-safe public view -----------------------------
  // The repository shapes the record via userModel.createUser (which lower-cases
  // the email and defaults the lockout fields); we pass only the hashed password.
  const user = userRepository.create({
    email,
    passwordHash,
    role: resolvedRole,
    name,
  });
  return toPublicUser(user);
}

/**
 * Authenticate a user and issue a JWT access token.
 *
 * The step order is security-significant and intentional: shape-guard the inputs,
 * resolve the user, check lockout BEFORE verifying the password (so a locked
 * account is rejected even with the correct password and its counter is not
 * advanced further), then verify the password. EVERY failure path - missing or
 * malformed credentials, unknown email, locked account, missing stored hash, and
 * wrong password - rejects with the SAME {@link GENERIC_AUTH_MESSAGE} and a 401
 * status, so no response reveals whether the email exists or whether the account
 * is locked.
 *
 * On a wrong password the per-user failure counter is incremented (and the
 * account locked once it reaches {@link MAX_FAILED_ATTEMPTS}). On success the
 * lockout state is reset ({ failedAttempts: 0, lockedUntil: null }) and a signed
 * token is returned alongside the user's public view.
 *
 * @param {Object} [credentials={}] - The login body.
 * @param {string} credentials.email - The account email (case-insensitive).
 * @param {string} credentials.password - The plaintext password to verify.
 * @returns {Promise<{token: string, user: {id: string, email: string, role: string,
 *   name: string, createdAt: string, updatedAt: string}}>} A signed JWT plus the
 *   authenticated user's public view.
 * @throws {Error} With `.status` 401 and message {@link GENERIC_AUTH_MESSAGE} for
 *   every authentication failure (no failure cause is distinguishable).
 */
async function login(credentials = {}) {
  const body = credentials && typeof credentials === 'object' ? credentials : {};
  const { email, password } = body;

  // Shape guard: both credentials must be non-empty strings. Do not reveal which
  // one is missing/blank - reject generically.
  if (
    !validation.isNonEmptyString(email) ||
    !validation.isNonEmptyString(password)
  ) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Resolve the full record (includes passwordHash + lockout fields). Unknown
  // email -> generic 401 (do not disclose that the email is unregistered).
  const user = userRepository.findByEmail(email);
  if (!user) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Lockout is checked BEFORE password verification: a locked account is rejected
  // even with the correct password, using the same generic 401, and its counter
  // is NOT advanced while locked (no distinct "locked" response -> no enumeration).
  if (isLocked(user)) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Defensive: a record with no stored hash can never authenticate.
  if (!user.passwordHash) {
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Verify with the ASYNC compare (constant-time inside bcryptjs).
  const ok = await passwordUtils.compare(password, user.passwordHash);
  if (!ok) {
    // Genuine password mismatch: advance the lockout counter (and lock at the
    // threshold), then reject generically.
    recordFailedAttempt(user);
    throw authError(GENERIC_AUTH_MESSAGE, 401);
  }

  // Success: clear any accumulated failure state, then issue the token.
  userRepository.update(user.id, { failedAttempts: 0, lockedUntil: null });
  return { token: issueToken(user), user: toPublicUser(user) };
}

/**
 * Resolve a user by id and return its leak-safe public view (the GET
 * /api/auth/me lookup).
 *
 * Synchronous by design: no hashing or token work is involved. The /me controller
 * calls this with `req.user.sub` (the JWT `sub` set by authMiddleware). Returns
 * the public user - which includes fields not present in the token, such as
 * `name` and `createdAt` - or `null` when no user has the given id.
 *
 * @param {string} id - The user id (typically the JWT `sub` claim).
 * @returns {{id: string, email: string, role: string, name: string,
 *   createdAt: string, updatedAt: string}|null} The public user, or null if not found.
 */
function getUserById(id) {
  return toPublicUser(userRepository.findById(id));
}

// CommonJS named exports. The two lockout constants are exported so the unit
// tests can drive the lockout scenario against the single source of truth. The
// private helpers (authError/isLocked/recordFailedAttempt/issueToken) are
// intentionally NOT exported.
module.exports = {
  register,
  login,
  getUserById,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
};
