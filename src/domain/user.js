// user.js - User domain entity shape, roles, and pure validators (no I/O, no deps)
'use strict';

/**
 * User domain module.
 *
 * Foundational DOMAIN-layer module for the Society Management Login feature.
 * It holds ONLY pure, immutable domain knowledge about the User entity:
 *   - canonical role constants,
 *   - the default role assigned at registration,
 *   - the canonical user-record field shape (descriptor), and
 *   - pure validators over the above.
 *
 * Architectural contract (must be preserved):
 *   - This is the BOTTOM of the dependency graph: it has ZERO imports
 *     (no other `src` layers, no third-party libraries, no Node core modules).
 *   - It performs NO I/O, has NO side effects, is NOT async, and never logs.
 *   - Every exported object/array is frozen so consumers cannot mutate shared
 *     domain state.
 *   - The actual user-record FACTORY lives in `src/models/userModel.js`; this
 *     module intentionally exposes only the field descriptor, not a builder.
 *
 * Consumers load these exact symbols via the CommonJS module path
 * `../domain/user`:
 *   - `src/middleware/authMiddleware.js` — uses `ROLES` for its role guard.
 *   - `src/services/authService.js` — uses `isValidRole` / `DEFAULT_ROLE`.
 *   - `src/models/userModel.js` — uses `USER_FIELDS` to build user records.
 *
 * @module domain/user
 */

/**
 * Canonical user role constants for the Society Management application.
 *
 * The two first-class roles are administrators and members. Values are the
 * lowercase strings persisted on user records and embedded in JWT claims, so
 * they MUST remain stable: `'admin'` and `'member'`.
 *
 * @readonly
 * @enum {string}
 * @property {string} ADMIN  Administrator role (`'admin'`) — elevated privileges.
 * @property {string} MEMBER Member role (`'member'`) — standard society member.
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

/**
 * Immutable list of every valid role string value, derived from {@link ROLES}.
 *
 * Deriving this from `ROLES` (rather than hard-coding) guarantees the two stay
 * in lockstep if roles are ever added. Order mirrors declaration: `['admin', 'member']`.
 *
 * @type {ReadonlyArray<string>}
 */
const ROLE_VALUES = Object.freeze(Object.values(ROLES));

/**
 * Default role granted to newly registered users.
 *
 * Registration assigns the least-privileged role unless explicitly overridden
 * by an administrative flow, so this resolves to {@link ROLES.MEMBER} (`'member'`).
 *
 * @type {string}
 */
const DEFAULT_ROLE = ROLES.MEMBER;

/**
 * Canonical field-name descriptor for a persisted user record (the "shape").
 *
 * This is the single source of truth for which fields a user record carries.
 * `src/models/userModel.js` builds concrete records on this shape; the order is
 * significant for that consumer and for any column/CSV projection, so it is
 * fixed as:
 *   identity      → `id`
 *   credentials   → `email`, `passwordHash`
 *   authorization → `role`
 *   profile       → `name`
 *   audit         → `createdAt`, `updatedAt`
 *   lockout       → `failedAttempts`, `lockedUntil`
 *
 * The lockout fields (`failedAttempts`, `lockedUntil`) back the in-memory
 * account-lockout logic in the auth service (AAP §0.5.2).
 *
 * @type {ReadonlyArray<string>}
 */
const USER_FIELDS = Object.freeze([
  'id',
  'email',
  'passwordHash',
  'role',
  'name',
  'createdAt',
  'updatedAt',
  'failedAttempts',
  'lockedUntil',
]);

/**
 * Pure predicate: is the supplied value one of the canonical role strings?
 *
 * Uses `Array.prototype.includes` (SameValueZero comparison) so non-string and
 * absent inputs are rejected safely: `undefined`, `null`, numbers, booleans,
 * objects, and any unknown string all yield `false`. No coercion is performed.
 *
 * @param {*} role The candidate role value to validate.
 * @returns {boolean} `true` only when `role` exactly equals a value in
 *   {@link ROLE_VALUES}; otherwise `false`.
 *
 * @example
 * isValidRole('admin');     // => true
 * isValidRole('member');    // => true
 * isValidRole('superuser'); // => false
 * isValidRole(undefined);   // => false
 */
function isValidRole(role) {
  return ROLE_VALUES.includes(role);
}

module.exports = {
  ROLES,
  ROLE_VALUES,
  DEFAULT_ROLE,
  USER_FIELDS,
  isValidRole,
};
