// userModel.js - User record factory & shape (pure, CommonJS, no I/O)
//
// MODEL LAYER (Login feature). This module owns the canonical in-memory User
// record: it DECLARES the record shape and NORMALIZES arbitrary input into that
// shape. It performs pure shaping ONLY -- there is deliberately:
//   * NO password hashing      (belongs to src/utils/passwordUtils.js + authService),
//   * NO persistence/storage   (belongs to src/repositories/userRepository.js),
//   * NO HTTP / file / DB I/O, no logging, no networking, and nothing async.
//
// Consumers load this module via CommonJS `require('../models/userModel')`:
//   - src/repositories/userRepository.js -> persists/returns records built here.
//   - src/services/authService.js        -> creates users on registration and
//                                            reads/writes the lockout fields.
//   - src/controllers/authController.js   -> uses toPublicUser() to shape safe
//                                            API responses (e.g. GET /api/auth/me).
//
// The canonical field list + order (USER_FIELDS), the role constants, and the
// role validator all live in the DOMAIN layer (src/domain/user.js), which is the
// single source of truth. This model IMPORTS them rather than re-declaring or
// inlining any literal role strings.

'use strict';

// Node.js core module only -- used solely for crypto.randomUUID() to mint RFC4122
// v4 identifiers. This is a standard-library import, not a third-party dependency.
const crypto = require('crypto');

// Domain constants/validators (single source of truth):
//   - DEFAULT_ROLE : role assigned to a new user when none is supplied.
//   - isValidRole  : pure predicate accepting only canonical role strings.
//   - USER_FIELDS  : frozen, ordered list of the 9 canonical user-record fields;
//                    used here to guarantee the produced record's key SET + ORDER
//                    stay in lock-step with the domain definition.
const { DEFAULT_ROLE, isValidRole, USER_FIELDS } = require('../domain/user');

/**
 * Normalize the optional account-lockout "failed attempts" counter into a safe,
 * non-negative integer.
 *
 * Any value that is not a non-negative integer (undefined, null, floats, NaN,
 * negative numbers, strings, etc.) collapses to 0. This module only DECLARES the
 * field and its safe default; the actual increment/reset decision logic lives in
 * authService (AAP 0.5.2).
 *
 * @param {*} value - Candidate failedAttempts value taken from the factory input.
 * @returns {number} A non-negative integer (0 when the input is unusable).
 */
function normalizeFailedAttempts(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * createUser - primary factory for a normalized, in-memory User record.
 *
 * Accepts a loosely-typed input object and returns a plain object containing
 * EXACTLY the nine canonical fields declared by the domain's USER_FIELDS, in that
 * exact order:
 *
 *   id, email, passwordHash, role, name, createdAt, updatedAt,
 *   failedAttempts, lockedUntil
 *
 * Normalization rules:
 *   - id            : the provided id when truthy, otherwise a fresh
 *                     crypto.randomUUID().
 *   - email         : REQUIRED. Canonicalized with String(email).trim().toLowerCase()
 *                     so lookups are case-insensitive. NOTE: format validation
 *                     (regex) is the responsibility of src/utils/validation.js --
 *                     this model only normalizes, it does not validate the format.
 *   - passwordHash  : the provided value, or null. NEVER hashed here; the service
 *                     hashes via passwordUtils and passes the resulting hash in.
 *   - role          : undefined/null -> DEFAULT_ROLE; a value accepted by
 *                     isValidRole() is kept as-is; anything else throws.
 *   - name          : optional; defaults to '' and is trimmed when provided.
 *   - createdAt     : the provided value, otherwise the current ISO-8601 instant.
 *   - updatedAt     : the provided value, otherwise mirrors createdAt.
 *   - failedAttempts: non-negative integer; coerced to 0 when unusable.
 *   - lockedUntil   : an ISO timestamp string, an epoch-ms number, or null
 *                     (defaults to null).
 *
 * @param {object} [input={}] - Raw user attributes.
 * @param {string} [input.id] - Pre-existing id; generated when omitted.
 * @param {string} input.email - REQUIRED email address (any case/whitespace).
 * @param {string|null} [input.passwordHash] - Pre-computed bcrypt hash.
 * @param {string} [input.role] - One of the domain's canonical roles.
 * @param {string} [input.name] - Optional display name.
 * @param {string} [input.createdAt] - Optional creation timestamp (ISO-8601).
 * @param {string} [input.updatedAt] - Optional update timestamp (ISO-8601).
 * @param {number} [input.failedAttempts] - Optional lockout counter.
 * @param {string|number|null} [input.lockedUntil] - Optional lockout expiry.
 * @returns {{id: string, email: string, passwordHash: (string|null), role: string,
 *   name: string, createdAt: string, updatedAt: string, failedAttempts: number,
 *   lockedUntil: (string|number|null)}} A fully normalized user record.
 * @throws {Error} 'userModel.createUser: email is required' when email is missing/blank.
 * @throws {Error} 'userModel.createUser: invalid role: <role>' for an unknown role.
 */
function createUser(input = {}) {
  // Defensive: tolerate null / non-object inputs (e.g. createUser(null),
  // createUser('x')) by treating them as "no fields supplied". This surfaces the
  // explicit required-email error below instead of a cryptic destructuring
  // TypeError. (The `input = {}` default only applies when the argument is
  // strictly undefined, so an explicit null still needs guarding.)
  const source = input && typeof input === 'object' ? input : {};

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
  } = source;

  // --- email: required + canonicalized -------------------------------------
  if (email === undefined || email === null || String(email).trim() === '') {
    throw new Error('userModel.createUser: email is required');
  }

  // --- role: default via DEFAULT_ROLE, else validate via isValidRole --------
  let resolvedRole;
  if (role === undefined || role === null) {
    resolvedRole = DEFAULT_ROLE;
  } else if (isValidRole(role)) {
    resolvedRole = role;
  } else {
    throw new Error('userModel.createUser: invalid role: ' + role);
  }

  // --- timestamps: created defaults to now; updated mirrors created ---------
  const nowIso = new Date().toISOString();
  const created = createdAt || nowIso;

  // Fully normalized values for every canonical field. passwordHash is stored as
  // provided (already a bcrypt hash) or null -- this module NEVER hashes.
  const normalized = {
    id: id || crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    passwordHash: passwordHash || null,
    role: resolvedRole,
    name: name ? String(name).trim() : '',
    createdAt: created,
    updatedAt: updatedAt || created,
    failedAttempts: normalizeFailedAttempts(failedAttempts),
    lockedUntil: lockedUntil || null,
  };

  // Project the normalized values through the domain's USER_FIELDS so the DOMAIN
  // layer remains the single source of truth for both the canonical field SET and
  // its ORDER. The returned record therefore always has exactly these keys, in
  // exactly this order: id, email, passwordHash, role, name, createdAt,
  // updatedAt, failedAttempts, lockedUntil.
  const record = {};
  for (const field of USER_FIELDS) {
    record[field] = normalized[field];
  }
  return record;
}

/**
 * toPublicUser - pure sanitizer producing a leak-safe view of a user record.
 *
 * Returns a shallow object containing ONLY the fields that are safe to expose
 * over the API: id, email, role, name, createdAt, updatedAt. The credential
 * (passwordHash) and the internal lockout fields (failedAttempts, lockedUntil)
 * are intentionally excluded, supporting the security baseline (C6) that the
 * password hash must never be leaked.
 *
 * An allowlist ("private by default") is used rather than deleting known-secret
 * keys: any field added to the user record in the future stays private unless it
 * is explicitly opted into this projection.
 *
 * @param {object|null|undefined} user - A user record (typically from createUser).
 * @returns {{id: string, email: string, role: string, name: string,
 *   createdAt: string, updatedAt: string}|null} The public view, or null when
 *   `user` is falsy or not an object.
 */
function toPublicUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const { id, email, role, name, createdAt, updatedAt } = user;
  return { id, email, role, name, createdAt, updatedAt };
}

module.exports = { createUser, toPublicUser };
