// authController.js - HTTP request/response handlers for authentication (register, login, logout, me). CommonJS; thin adapters over authService.
'use strict';

/**
 * src/controllers/authController.js
 *
 * Thin HTTP-adapter layer for the Login (authentication) feature of the Society
 * Management API. Its sole responsibilities are to (1) parse / validate the
 * incoming request, (2) delegate to `services/authService` for ALL business
 * logic (credential verification, password hashing, token issuance, lockout),
 * and (3) shape the HTTP response (status code + JSON body). It contains NO
 * business logic, NO password hashing, NO JWT signing/verifying, and NO
 * repository access — every one of those concerns lives behind `authService`.
 *
 * ── Router wiring (authoritative — `src/routes/authRoutes.js` matches this) ──
 * The auth router is mounted at `/api/auth`; the handlers exported here map to:
 *
 *     POST /api/auth/register -> register   (public; creates a 'member' account)
 *     POST /api/auth/login    -> login      (public; issues a JWT on success)
 *     POST /api/auth/logout   -> logout     (stateless acknowledgement)
 *     GET  /api/auth/me       -> me         (BEHIND authMiddleware.authenticate)
 *
 * The `/me` route is guarded by `src/middleware/authMiddleware.js`
 * (`authenticate`), which verifies the `Authorization: Bearer <token>` header
 * and populates `req.user` with the decoded JWT payload `{ sub, email, role,
 * iat, exp }`. This controller therefore performs NO token verification itself
 * on `/me` — it trusts `req.user` and reads the user id from `req.user.sub`.
 *
 * ── Error convention (shared envelope) ─────────────────────────────────────
 * Service errors already carry a numeric `.status` (400 validation, 401 generic
 * auth failure, 409 duplicate email). Handlers forward them UNCHANGED via
 * `next(err)`; the centralized `src/middleware/errorHandler.js` (registered last
 * in `src/app.js`) converts them into the consistent `{ error: { message,
 * status } }` envelope, deriving the HTTP status from `err.status ||
 * err.statusCode`. This controller never hand-builds that envelope and never
 * rewrites a service-supplied status. The ONLY errors this controller mints are
 * its own request-validation failures (built via {@link httpError}) and a
 * defensive 404 on `/me`.
 *
 * ── Security (AAP §0.5.2, §0.8, criterion C6) ──────────────────────────────
 *   - Privilege-escalation prevention: `register` destructures ONLY
 *     `{ email, password, name }` from the body and NEVER reads or forwards a
 *     client-supplied `role`. New accounts default to `'member'` in the service;
 *     administrators are provisioned only through trusted/seed flows, never via
 *     this public endpoint.
 *   - Anti-enumeration: `login` adds NO field-specific validation messages; it
 *     delegates entirely to the service, which returns ONE generic
 *     `401 'Invalid email or password'` for every failure cause (unknown email,
 *     wrong password, locked account) so responses are indistinguishable.
 *   - No secret logging: this module never logs or echoes passwords, password
 *     hashes, tokens, or secrets, and performs no `console` output.
 *
 * ── Module system / runtime ────────────────────────────────────────────────
 * CommonJS only (`require` / `module.exports`); no ESM. Target Node.js >= 18,
 * Express 5.x. The only dependencies are the sibling auth service and the shared
 * validation helpers. `express` is intentionally NOT imported — handlers receive
 * `(req, res, next)` from the router.
 *
 * @module controllers/authController
 */

// The authentication service: the single home of all auth business logic. The
// controller stays thin by delegating credential verification, password
// hashing, token issuance and lockout to it.
//
// Relevant service contract (see src/services/authService.js):
//   register(input)          -> Promise<publicUser>
//       · input = { email, password, name } (role intentionally NOT forwarded here)
//       · publicUser = { id, email, role, name, createdAt, updatedAt } (NO passwordHash/lockout)
//       · throws Error with `.status === 400` (invalid input) or `.status === 409` (duplicate email)
//   login(credentials)       -> Promise<{ token: string, user: publicUser }>
//       · credentials = { email, password }
//       · throws Error with `.status === 401`, message 'Invalid email or password',
//         for EVERY failure cause (anti-enumeration)
//   getUserById(id)          -> publicUser | null   (SYNCHRONOUS)
const authService = require('../services/authService');

// Lightweight, dependency-free request-payload validators. Used as the first,
// user-friendly gate on the public `register` endpoint (the service re-validates
// internally as defense-in-depth).
//
// Relevant validation contract (see src/utils/validation.js):
//   getMissingFields(obj, requiredFields) -> string[]   (the required names absent from obj)
//   isValidEmail(email)                   -> boolean
//   isValidPassword(password)             -> boolean     (>= 8 chars, >= 1 letter, >= 1 digit)
const validation = require('../utils/validation');

/**
 * Build an {@link Error} that carries a numeric HTTP `status`, so the shared
 * `errorHandler` can map it to the correct response code within the
 * `{ error: { message, status } }` envelope.
 *
 * This helper is used ONLY for errors the controller itself originates — namely
 * `register`'s request-validation failures (400) and the defensive `/me` 404.
 * Errors thrown by `authService` already carry their own `.status` and are
 * forwarded unchanged; they are never re-wrapped by this helper.
 *
 * @param {string} message - Human-readable, non-enumerating error message.
 * @param {number} status - The HTTP status to associate (e.g. 400, 404).
 * @returns {Error} An `Error` instance with its `.status` property set.
 */
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * POST /api/auth/register — create a new user account (public self-registration).
 *
 * Validates the registration payload as a first, user-friendly gate, then
 * delegates account creation to `authService.register`. Responds `201 Created`
 * with the sanitized public user view on success.
 *
 * SECURITY: only `{ email, password, name }` are read from the body. A
 * client-supplied `role` is deliberately IGNORED (never destructured, never
 * forwarded) so the public endpoint cannot be used to self-provision an
 * administrator — the service defaults new accounts to `'member'`.
 *
 * Validation gates (first failure wins, each a `400`):
 *   1. `email` and `password` must both be present (non-blank).
 *   2. `email` must be syntactically valid.
 *   3. `password` must meet the policy (>= 8 chars, >= 1 letter, >= 1 digit).
 *
 * @param {import('express').Request}  req  - Express request; reads
 *   `req.body.email`, `req.body.password`, `req.body.name`.
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Error-forwarding callback; a
 *   validation failure surfaces as 400 and a duplicate email as the service's
 *   409, both via the shared error handler.
 * @returns {Promise<import('express').Response|void>} Resolves once the response
 *   has been sent (201) or an error has been forwarded to `next`.
 */
async function register(req, res, next) {
  try {
    // SECURITY: destructure ONLY email/password/name — never a client `role`
    // (prevents privilege escalation via public self-registration).
    const { email, password, name } = req.body || {};

    if (validation.getMissingFields(req.body, ['email', 'password']).length) {
      return next(httpError('Email and password are required', 400));
    }
    if (!validation.isValidEmail(email)) {
      return next(httpError('A valid email is required', 400));
    }
    if (!validation.isValidPassword(password)) {
      return next(
        httpError(
          'Password must be at least 8 characters and include letters and numbers',
          400
        )
      );
    }

    // Delegate to the service. It re-validates (defense in depth), enforces
    // email uniqueness, hashes the password with async bcrypt, and returns the
    // PUBLIC user view (no passwordHash / lockout fields). Registration does NOT
    // log the user in, so no token is issued here.
    const user = await authService.register({ email, password, name });
    return res.status(201).json({ user });
  } catch (err) {
    // Propagate service errors unchanged (e.g. 409 duplicate email) so the
    // shared error handler emits the correct status — never coerced to 500.
    return next(err);
  }
}

/**
 * POST /api/auth/login — verify credentials and issue a JWT access token.
 *
 * Delegates entirely to `authService.login`, which is authoritative for both
 * success and failure handling. On success the service returns
 * `{ token, user }`; this handler relays it with `200 OK`.
 *
 * SECURITY (anti-enumeration): this handler performs NO field-specific
 * validation on the login path. Adding, say, a `400 'email required'` here would
 * diverge from the service's single generic `401 'Invalid email or password'`
 * and could let an attacker distinguish failure causes. All failures therefore
 * surface as the service's indistinguishable generic 401.
 *
 * @param {import('express').Request}  req  - Express request; reads
 *   `req.body.email` and `req.body.password`.
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Error-forwarding callback; the
 *   service's generic 401 flows through here to the shared error handler.
 * @returns {Promise<import('express').Response|void>} Resolves once the response
 *   has been sent (200, body `{ token, user }`) or an error has been forwarded.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    // The service returns { token, user } on success, or throws a single generic
    // 401 ('Invalid email or password') for ANY failure cause — no enumeration.
    const result = await authService.login({ email, password });
    return res.status(200).json({ token: result.token, user: result.user });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout — acknowledge logout for a stateless JWT scheme.
 *
 * Access tokens are stateless JWTs: there is no server-side session to destroy,
 * so "logging out" is the client discarding its token. This handler is therefore
 * trivial and side-effect-free — it neither reads `req.user` nor calls the
 * service — and simply returns a success acknowledgement. It works whether or
 * not the route places `authenticate` in front of it.
 *
 * @param {import('express').Request}  req  - Express request (unused).
 * @param {import('express').Response} res  - Express response.
 * @returns {import('express').Response} The `200 OK` acknowledgement
 *   `{ message: 'Logged out successfully' }`.
 */
function logout(req, res) {
  // Stateless JWT: nothing to invalidate server-side; the client discards the token.
  return res.status(200).json({ message: 'Logged out successfully' });
}

/**
 * GET /api/auth/me — return the authenticated user's public profile.
 *
 * This handler runs BEHIND `authMiddleware.authenticate`, which has already
 * verified the bearer token and set `req.user` to the decoded JWT payload
 * `{ sub, email, role, iat, exp }`. The user id is read from `req.user.sub`. The
 * token is NOT re-verified here, and repositories are NOT accessed directly —
 * the lookup goes through `authService.getUserById` (synchronous), which returns
 * the sanitized public view (including profile/audit fields absent from the
 * token) or `null`.
 *
 * A `null` lookup is treated defensively as a `404` (a valid token should always
 * map to an existing user; this guards the edge case where the account vanished
 * after the token was issued).
 *
 * @param {import('express').Request}  req  - Express request; reads
 *   `req.user.sub` (set by the upstream authentication middleware).
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Error-forwarding callback;
 *   forwards a defensive 404 when the user id maps to no account.
 * @returns {Promise<import('express').Response|void>} Resolves once the response
 *   has been sent (200, body `{ user }`) or an error has been forwarded.
 */
async function me(req, res, next) {
  try {
    // `req.user` is guaranteed set by authMiddleware.authenticate; `sub` is the
    // JWT subject claim (the user id). Read defensively in case the guard shape
    // ever changes, falling through to the 404 below if absent.
    const userId = req.user && req.user.sub;

    const user = authService.getUserById(userId);
    if (!user) {
      return next(httpError('User not found', 404));
    }
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me };
