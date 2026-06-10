// authController.js - HTTP request/response handlers for authentication (register, login, logout, me).
//
// CONTROLLER LAYER (Login feature). This module is the thin HTTP adapter for the
// authentication feature: it parses/validates the incoming request, delegates ALL
// business logic to the authentication service, and shapes the HTTP response
// (status code + JSON body). It owns ONLY transport concerns.
//
// By design this layer contains:
//   * NO business logic - credential verification, token issuance, account lockout,
//     and user persistence all live in `src/services/authService.js`. The controller
//     never hashes a password, never signs/verifies a JWT, and never touches a
//     repository or the data store directly.
//   * NO hand-built error envelope - thrown/forwarded errors are propagated unchanged
//     via `next(err)` to the centralized error handler (`src/middleware/errorHandler.js`),
//     which renders the single `{ error: { message, status } }` contract and derives
//     the HTTP status from `err.status || err.statusCode`. The service attaches the
//     authoritative status (400 validation, 409 duplicate email, 401 auth failure).
//   * NO token verification - the GET /me route is mounted BEHIND the auth middleware
//     (`authenticate`), which has already verified the Bearer token and attached the
//     decoded payload to `req.user`; this handler simply reads `req.user.sub`.
//
// SECURITY (AAP 0.5.2 / 0.8 / criterion C6):
//   * register NEVER forwards a client-supplied `role` to the service (privilege-
//     escalation prevention) - the service defaults new users to `member`.
//   * login stays GENERIC - the controller adds no field-specific failure detail on
//     the login path; the service throws a single 401 ('Invalid email or password')
//     for every failure cause, so no response enables user enumeration.
//   * This module NEVER logs or echoes passwords, password hashes, tokens, or secrets.
//
// Intended router wiring (see src/routes/authRoutes.js - this file defines the
// authoritative handler names the routes agent must match EXACTLY):
//   POST /api/auth/register -> register
//   POST /api/auth/login    -> login
//   POST /api/auth/logout   -> logout
//   GET  /api/auth/me       -> me   (mounted BEHIND authMiddleware.authenticate, so
//                                     req.user is guaranteed set to the JWT payload)
//
// CommonJS only: wiring is via `require(...)` / `module.exports` (no ESM
// `import`/`export`). This new wiring is the sanctioned additive convention for the
// feature (AAP 0.1.2 / 0.8); the pre-existing scaffold modules are read-only
// synthetic arithmetic padding and are neither referenced nor imported here, and
// remain byte-identical (AAP 0.6.2, criteria C1/C5).

'use strict';

// Sole dependencies of this thin adapter:
//   - authService: the authentication business-logic service. The controller uses
//       * register(input):Promise<publicUser>  -> creates a user (201)
//       * login(creds):Promise<{token,user}>    -> verifies credentials, issues a JWT
//       * getUserById(id):publicUser|null       -> backs GET /me (synchronous)
//     The service is authoritative for validation (re-validates internally), duplicate
//     detection (409), lockout, and generic auth failures (401); it attaches `.status`.
//   - validation: lightweight, dependency-free request-payload validators used as the
//     first, user-friendly gate on the public register endpoint
//       * getMissingFields(obj, required[]) -> string[]  (absent/blank required fields)
//       * isValidEmail(email)               -> boolean
//       * isValidPassword(password)         -> boolean   (>=8 chars, >=1 letter, >=1 digit)
const authService = require('../services/authService');
const validation = require('../utils/validation');

/**
 * Build a transport-layer error carrying an explicit HTTP status code.
 *
 * Used ONLY for the controller's OWN validation failures (the user-friendly first
 * gate on register). The returned Error is forwarded via `next(err)` so the
 * centralized error handler can derive the status from `err.status` and render the
 * single `{ error: { message, status } }` envelope. The controller never builds that
 * envelope itself, and never mutates or re-wraps errors thrown by the service (those
 * already carry their authoritative `.status`).
 *
 * @param {string} message - Human-readable, non-enumerating client message.
 * @param {number} status - HTTP status code to attach (e.g. 400 or 404).
 * @returns {Error} An Error instance with a numeric `.status` property.
 */
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * POST /api/auth/register -- create a new account and return its public view (201).
 *
 * Flow:
 *   1. Read ONLY `email`, `password`, and `name` from the body. The client-supplied
 *      `role` is deliberately NOT read or forwarded - the service defaults new users
 *      to `member`, which prevents privilege escalation via the public endpoint.
 *   2. Apply the first, user-friendly validation gate using `utils/validation`,
 *      forwarding a `400` on the first failure (missing fields, invalid email, weak
 *      password). The service re-validates internally as defense in depth.
 *   3. Delegate creation to `authService.register`, which returns the PUBLIC user
 *      (no `passwordHash` / lockout fields). Registration does NOT log the user in,
 *      so no token is issued here.
 *
 * Errors (e.g. the service's `409` duplicate-email) are propagated unchanged via
 * `next(err)` to the centralized error handler.
 *
 * @param {object} req - Express request; `req.body` carries `{ email, password, name }`.
 * @param {object} res - Express response.
 * @param {Function} next - Express next-middleware callback; forwards errors.
 * @returns {Promise<void>} Resolves after the `201` JSON response is sent, or after
 *   forwarding an error via `next(err)`.
 *
 * @example
 * // 201 Created
 * // { "user": { "id": "...", "email": "a@b.com", "role": "member", "name": "Asha", ... } }
 */
async function register(req, res, next) {
  try {
    // Destructure ONLY the allowed fields. SECURITY: `req.body.role` is intentionally
    // never read here, so a client cannot self-assign an elevated role on signup.
    const { email, password, name } = req.body || {};

    // First validation gate (clear, non-enumerating messages). Fail fast on the first
    // problem; the service performs the authoritative re-check as defense in depth.
    if (validation.getMissingFields(req.body, ['email', 'password']).length) {
      return next(httpError('Email and password are required', 400));
    }
    if (!validation.isValidEmail(email)) {
      return next(httpError('A valid email is required', 400));
    }
    if (!validation.isValidPassword(password)) {
      return next(
        httpError('Password must be at least 8 characters and include letters and numbers', 400),
      );
    }

    // Delegate to the service. Note `role` is NOT passed - the service defaults it.
    const user = await authService.register({ email, password, name });

    // The service returns the PUBLIC user (no hash/lockout fields). No token here -
    // registration does not authenticate the session.
    return res.status(201).json({ user });
  } catch (err) {
    // Propagate unchanged - e.g. the service's `409` duplicate-email keeps its status.
    return next(err);
  }
}

/**
 * POST /api/auth/login -- verify credentials and issue a signed JWT (200).
 *
 * This handler deliberately performs NO field-specific validation: doing so (e.g. a
 * `400 'email required'`) would diverge from the service's single generic `401` and
 * could enable user enumeration. Instead it delegates straight to the service, which
 * returns `{ token, user }` on success or throws ONE generic error
 * (`.status === 401`, message `'Invalid email or password'`) for every failure cause
 * (unknown email, wrong password, locked account). That error flows unchanged to the
 * centralized error handler.
 *
 * @param {object} req - Express request; `req.body` carries `{ email, password }`.
 * @param {object} res - Express response.
 * @param {Function} next - Express next-middleware callback; forwards errors.
 * @returns {Promise<void>} Resolves after the `200` JSON response is sent, or after
 *   forwarding the generic `401` (or any other error) via `next(err)`.
 *
 * @example
 * // 200 OK
 * // { "token": "<jwt>", "user": { "id": "...", "email": "a@b.com", "role": "member", ... } }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    // Delegate to the service: returns { token, user } or throws a generic 401.
    const result = await authService.login({ email, password });

    // `result` is exactly `{ token, user }`; relay both fields. The integration test
    // asserts a non-empty `token` string is present in the body.
    return res.status(200).json({ token: result.token, user: result.user });
  } catch (err) {
    // The service's generic 401 (or any other error) propagates unchanged.
    return next(err);
  }
}

/**
 * POST /api/auth/logout -- acknowledge logout (200).
 *
 * Authentication is STATELESS (signed JWT): there is no server-side session to
 * destroy, so logout is a trivial, side-effect-free acknowledgment - the client
 * simply discards its token. This handler does not read `req.user` and does not call
 * the service, so it works whether or not the route places `authenticate` in front of
 * it (that choice belongs to the routes agent). It is synchronous by design.
 *
 * @param {object} req - Express request (unused).
 * @param {object} res - Express response.
 * @returns {object} The Express response after sending the `200` acknowledgment.
 *
 * @example
 * // 200 OK
 * // { "message": "Logged out successfully" }
 */
function logout(req, res) {
  // Stateless JWT: nothing to invalidate server-side; the client discards the token.
  return res.status(200).json({ message: 'Logged out successfully' });
}

/**
 * GET /api/auth/me -- return the authenticated user's public profile (200).
 *
 * Mounted BEHIND `authMiddleware.authenticate`, which has already verified the Bearer
 * token and attached the decoded JWT payload `{ sub, email, role, iat, exp }` to
 * `req.user`. This handler therefore does NOT re-verify the token; it reads the user
 * id from `req.user.sub` and resolves the public user via `authService.getUserById`
 * (synchronous; returns the public user or `null`). A `null` result is defensive - a
 * valid token should always map to an existing user - and yields a `404`.
 *
 * @param {object} req - Express request; `req.user.sub` is the authenticated user id.
 * @param {object} res - Express response.
 * @param {Function} next - Express next-middleware callback; forwards errors.
 * @returns {Promise<void>} Resolves after the `200` JSON response is sent, or after
 *   forwarding a `404` (or any other error) via `next(err)`.
 *
 * @example
 * // 200 OK
 * // { "user": { "id": "...", "email": "a@b.com", "role": "member", ... } }
 */
async function me(req, res, next) {
  try {
    // The auth middleware guarantees `req.user`; read the id from the JWT `sub` claim.
    const userId = req.user && req.user.sub;

    // Synchronous lookup through the service (never the repository directly).
    const user = authService.getUserById(userId);
    if (!user) {
      // Defensive: a verified token should map to a real user.
      return next(httpError('User not found', 404));
    }

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

// CommonJS named exports consumed by the auth router (src/routes/authRoutes.js).
// Exactly the four Express handlers - no default export and no extra exports.
module.exports = { register, login, logout, me };
