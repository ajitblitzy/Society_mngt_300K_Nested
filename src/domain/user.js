// user.js - User domain entity shape, roles, and pure validators (no I/O, no deps)
//
// DOMAIN LAYER (foundational): this module is the bottom of the dependency graph.
// It contains only immutable constants and tiny pure functions describing the
// User entity. It performs NO I/O, has NO side effects, is NOT async, and
// imports NOTHING (no other src layers, no external packages, no Node core).
//
// Consumers load this module by its domain path '../domain/user':
//   - src/middleware/authMiddleware.js -> role guard uses ROLES.
//   - src/services/authService.js       -> role validation + DEFAULT_ROLE on register.
//   - src/models/userModel.js           -> builds user records on the USER_FIELDS shape.
//
// NOTE: The user-record factory lives in src/models/userModel.js, NOT here. This
// file deliberately holds only constants, the shape descriptor, and validators.

'use strict';

/**
 * Canonical role constants for Society Management users.
 *
 * Exactly two first-class roles exist per the product definition:
 *   - ADMIN  -> administrators with elevated privileges.
 *   - MEMBER -> standard society members.
 *
 * The values are the lowercase wire/storage strings ('admin', 'member') used in
 * persisted user records and inside signed JWT payloads. The object is frozen to
 * guarantee these canonical values can never be mutated at runtime.
 *
 * @constant
 * @type {Readonly<{ ADMIN: 'admin', MEMBER: 'member' }>}
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

/**
 * Frozen array of the role string values derived from {@link ROLES}.
 *
 * Deriving this from `Object.values(ROLES)` keeps it in lock-step with ROLES so
 * there is a single source of truth: adding a role to ROLES automatically extends
 * the set of valid values. Used by {@link isValidRole} and by callers that need to
 * enumerate or whitelist roles. Result: `['admin', 'member']`.
 *
 * @constant
 * @type {ReadonlyArray<string>}
 */
const ROLE_VALUES = Object.freeze(Object.values(ROLES));

/**
 * The role assigned to newly registered users by default.
 *
 * New self-service registrations become MEMBER ('member'); elevation to ADMIN is
 * an explicit, separately-authorized action and never the registration default.
 *
 * @constant
 * @type {string}
 */
const DEFAULT_ROLE = ROLES.MEMBER;

/**
 * Canonical, ordered list of field names that make up a User entity record (the
 * "shape descriptor"). src/models/userModel.js builds concrete records on this
 * shape; keeping the field list here, in the domain layer, gives every layer a
 * single authoritative definition of what a user record contains.
 *
 * Field groups:
 *   - Identity:    'id', 'email', 'role', 'name'
 *   - Credentials: 'passwordHash' (bcrypt hash only; plaintext is never stored)
 *   - Auditing:    'createdAt', 'updatedAt'
 *   - Lockout:     'failedAttempts', 'lockedUntil' (brute-force throttling state)
 *
 * The array is frozen so the canonical shape cannot be mutated at runtime.
 *
 * @constant
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
 * Pure predicate that reports whether a given value is a recognized user role.
 *
 * Returns `true` only when `role` is strictly one of the canonical role strings
 * in {@link ROLE_VALUES} ('admin' or 'member'). Returns `false` for everything
 * else, including `undefined`, `null`, numbers, booleans, objects, and any
 * unknown string (e.g. 'superuser'). Performs no coercion and has no side effects.
 *
 * @param {*} role - The candidate role value to validate.
 * @returns {boolean} `true` if `role` is a valid canonical role, otherwise `false`.
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
