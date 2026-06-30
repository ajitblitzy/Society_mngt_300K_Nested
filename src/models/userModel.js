// userModel.js - User record factory & shape (pure, CommonJS, no I/O)
'use strict';

/**
 * User model module.
 *
 * MODEL-layer module for the Society Management Login (authentication) feature.
 * It owns the canonical in-memory USER RECORD shape and the factory that builds
 * normalized user records on that shape. The domain layer (`src/domain/user.js`)
 * deliberately exposes only role constants, the field descriptor, and validators
 * and explicitly delegates the user-record FACTORY to this module.
 *
 * Architectural contract (must be preserved):
 *   - PURE SHAPING ONLY. This module declares and normalizes a user record. It
 *     performs NO password hashing (that is `src/utils/passwordUtils.js` +
 *     `authService`), NO persistence/storage (that is `src/repositories`), and
 *     NO HTTP/file/DB/network I/O and NO logging.
 *   - Lockout MUTATION / decision logic — incrementing `failedAttempts`,
 *     setting/clearing `lockedUntil`, and comparing `lockedUntil` to "now" — is
 *     the responsibility of `src/services/authService.js`. This module only
 *     DECLARES those two fields together with safe defaults, and intentionally
 *     returns a MUTABLE record so the service can update them in place.
 *   - The only dependency is the bottom-of-graph domain module `../domain/user`
 *     plus the Node core `crypto` module (for id generation). No third-party
 *     libraries are used.
 *
 * Consumers load these exact symbols via the CommonJS module path
 * `../models/userModel`:
 *   - `src/repositories/userRepository.js` — persists and returns user records.
 *   - `src/services/authService.js` — creates users on registration; reads and
 *     writes the lockout fields.
 *   - `src/controllers/authController.js` — uses `toPublicUser` to shape API
 *     responses without ever leaking the password hash.
 *
 * @module models/userModel
 */

const crypto = require('crypto');
const { DEFAULT_ROLE, isValidRole } = require('../domain/user');

/**
 * Build a normalized, persistable user record.
 *
 * The returned object always has EXACTLY the nine canonical user fields, in the
 * fixed order declared by `USER_FIELDS` in `src/domain/user.js`:
 *
 *   identity      → `id`
 *   credentials   → `email`, `passwordHash`
 *   authorization → `role`
 *   profile       → `name`
 *   audit         → `createdAt`, `updatedAt`
 *   lockout       → `failedAttempts`, `lockedUntil`
 *
 * Normalization rules:
 *   - `id`            — the provided id when truthy, otherwise a freshly
 *                       generated RFC 4122 v4 UUID via `crypto.randomUUID()`.
 *   - `email`         — REQUIRED. Missing, empty, or whitespace-only values
 *                       throw. The value is canonicalized with
 *                       `String(email).trim().toLowerCase()` so that user
 *                       lookups are case-insensitive. Email *format* validation
 *                       (regex) is intentionally NOT performed here — that is the
 *                       job of `src/utils/validation.js`; this model only
 *                       normalizes.
 *   - `passwordHash`  — the provided value, defaulting to `null` when absent.
 *                       Passwords are NEVER hashed here; `authService` hashes via
 *                       `passwordUtils` and passes the resulting hash in.
 *   - `role`          — `undefined`/`null` resolves to `DEFAULT_ROLE`; a value
 *                       accepted by `isValidRole` is used as-is; anything else
 *                       throws. Role strings are sourced from the domain layer,
 *                       never hard-coded here.
 *   - `name`          — optional; defaults to `''` and is trimmed when provided.
 *   - `createdAt`     — the provided value, otherwise the current time as an ISO
 *                       8601 string (`new Date().toISOString()`).
 *   - `updatedAt`     — the provided value, otherwise the same value used for
 *                       `createdAt` (so a brand-new record's timestamps match).
 *   - `failedAttempts`— account-lockout counter (AAP §0.5.2). A non-negative
 *                       integer, defaulting to `0`; non-integer or negative
 *                       inputs are coerced to `0`.
 *   - `lockedUntil`   — account-lockout marker (AAP §0.5.2). Defaults to `null`;
 *                       an ISO timestamp string or epoch-millisecond number is
 *                       preserved as-is.
 *
 * @param {object} [input={}] Raw user attributes to normalize.
 * @param {string} [input.id] Pre-existing id; a UUID is generated when omitted.
 * @param {string} input.email Required login email; normalized to lower-case.
 * @param {string|null} [input.passwordHash] Pre-computed password hash.
 * @param {string} [input.role] One of the domain roles; defaults to `DEFAULT_ROLE`.
 * @param {string} [input.name] Optional display name.
 * @param {string} [input.createdAt] Optional ISO creation timestamp.
 * @param {string} [input.updatedAt] Optional ISO update timestamp.
 * @param {number} [input.failedAttempts] Optional non-negative failed-login count.
 * @param {string|number|null} [input.lockedUntil] Optional lockout expiry.
 * @returns {{
 *   id: string,
 *   email: string,
 *   passwordHash: (string|null),
 *   role: string,
 *   name: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   failedAttempts: number,
 *   lockedUntil: (string|number|null)
 * }} A new, mutable user record carrying exactly the nine canonical fields.
 * @throws {Error} `userModel.createUser: email is required` when `email` is
 *   missing, empty, or whitespace-only.
 * @throws {Error} `userModel.createUser: invalid role: <role>` when a supplied
 *   `role` is not a recognized domain role.
 *
 * @example
 * const user = createUser({ email: ' A@B.COM ', passwordHash: 'hash' });
 * // => { id: '<uuid>', email: 'a@b.com', passwordHash: 'hash', role: <DEFAULT_ROLE>,
 * //      name: '', createdAt: '<iso>', updatedAt: '<iso>',
 * //      failedAttempts: 0, lockedUntil: null }
 */
function createUser(input = {}) {
  const {
    id,
    email,
    passwordHash,
    role,
    name,
    createdAt,
    updatedAt,
    failedAttempts,
    lockedUntil,
  } = input;

  // Email is the only mandatory attribute; reject missing / blank values up
  // front so downstream layers can rely on a usable lookup key.
  if (!email || !String(email).trim()) {
    throw new Error('userModel.createUser: email is required');
  }

  // Resolve the role exclusively through the domain layer so role strings are
  // never hard-coded in this file.
  let resolvedRole;
  if (role === undefined || role === null) {
    resolvedRole = DEFAULT_ROLE;
  } else if (isValidRole(role)) {
    resolvedRole = role;
  } else {
    throw new Error('userModel.createUser: invalid role: ' + role);
  }

  // A single timestamp shared by createdAt/updatedAt for brand-new records.
  const now = new Date().toISOString();
  const created = createdAt || now;

  // Return a plain, MUTABLE object: authService updates the lockout/audit
  // fields in place, so the record must not be frozen.
  return {
    id: id || crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    passwordHash: passwordHash || null,
    role: resolvedRole,
    name: name ? String(name).trim() : '',
    createdAt: created,
    updatedAt: updatedAt || created,
    failedAttempts:
      Number.isInteger(failedAttempts) && failedAttempts >= 0
        ? failedAttempts
        : 0,
    lockedUntil: lockedUntil || null,
  };
}

/**
 * Produce a safe, externally shareable view of a user record.
 *
 * Returns a shallow copy of `user` with the sensitive `passwordHash` and the
 * internal lockout fields (`failedAttempts`, `lockedUntil`) removed, yielding
 * `{ id, email, role, name, createdAt, updatedAt }`. This is what API responses
 * (e.g. `GET /api/auth/me` and the register/login payloads) expose, guaranteeing
 * the password hash and lockout bookkeeping never leak to clients (security
 * baseline C6). The input record is not mutated.
 *
 * @param {object|null|undefined} user A user record (typically from
 *   {@link createUser}).
 * @returns {({
 *   id: string,
 *   email: string,
 *   role: string,
 *   name: string,
 *   createdAt: string,
 *   updatedAt: string
 * })|null} A new sanitized object, or `null` when `user` is falsy.
 *
 * @example
 * toPublicUser(createUser({ email: 'a@b.com', passwordHash: 'hash' }));
 * // => { id, email: 'a@b.com', role: <DEFAULT_ROLE>, name: '', createdAt, updatedAt }
 */
function toPublicUser(user) {
  if (!user) {
    return null;
  }

  // Destructure-and-rest strips the sensitive fields without mutating `user`.
  const { passwordHash, failedAttempts, lockedUntil, ...publicView } = user;
  return publicView;
}

module.exports = { createUser, toPublicUser };
