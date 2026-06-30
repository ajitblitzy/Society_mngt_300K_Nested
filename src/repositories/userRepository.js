// userRepository.js - In-memory user persistence (CommonJS; no DB/ORM; mirrors the scaffold's 'const store = []' idiom)
'use strict';

/**
 * User repository (REPOSITORY layer) for the Society Management Login
 * (authentication) feature.
 *
 * Responsibility (single, narrow): own the in-memory persistence of USER records
 * and expose a small CRUD-style contract over a module-private store. It is the
 * bottom of the Login dependency chain and the persistence contract that
 * `src/services/authService.js` consumes:
 *   - registration creates users (`create`),
 *   - login reads credentials (`findByEmail`),
 *   - lockout logic persists `failedAttempts` / `lockedUntil` (`update`), and
 *   - a successful login resets those same fields (`update`).
 *
 * Architectural contract (must be preserved):
 *   - In-memory ONLY. The canonical records live in a module-level
 *     `const store = []`, mirroring the scaffold's idiom (AAP §0.4.1). There is
 *     intentionally NO database, ORM, SQL, query builder, migration, or
 *     file/network I/O here (AAP §0.6.2). The shape below is deliberately
 *     swappable for a real persistence layer later — every access goes through a
 *     function, never the raw array.
 *   - PERSISTENCE concerns ONLY. This module stores, reads, and mutates records.
 *     It contains NO business rules: email-uniqueness enforcement, credential
 *     verification, token issuance, and lockout DECISIONS (thresholds, when to
 *     lock/unlock) all belong to `src/services/authService.js`.
 *   - NEVER hashes. Passwords are hashed asynchronously by
 *     `src/utils/passwordUtils.js` (via `authService`); this store only persists
 *     the already-computed `passwordHash` (a string, or `null`). This file does
 *     NOT import `bcryptjs`.
 *   - Encapsulation. Every accessor returns shallow CLONES of stored records, so
 *     a caller can never mutate shared module state through a returned value.
 *   - Dependencies: the only internal imports are `../models/userModel` (for the
 *     `createUser` record factory/normalizer) and `../domain/user` (for the
 *     `ROLES` constants, used solely by `seedDefaultAdmin`). There are no
 *     third-party libraries and no Node core I/O modules.
 *
 * @module repositories/userRepository
 */

const { createUser } = require('../models/userModel'); // canonical 9-field user-record factory/normalizer (never hashes)
const { ROLES } = require('../domain/user');           // { ADMIN: 'admin', MEMBER: 'member' } — used only by seedDefaultAdmin

/**
 * Canonical, module-private user store.
 *
 * Holds the authoritative (mutable) user records. It is intentionally NOT
 * exported: all access is funneled through the functions below so the store
 * stays encapsulated and can be swapped for a real database later without
 * changing the public contract.
 *
 * @type {Array<object>}
 */
const store = [];

/**
 * Produce a shallow copy of a stored record (or `null`).
 *
 * User records contain only primitive fields (strings, numbers, and `null`), so
 * a shallow spread fully detaches the returned object from the canonical record.
 * This is the mechanism that prevents callers from mutating shared module state
 * through a returned value. Every function that returns a record returns a clone.
 *
 * @param {object|null|undefined} record A stored user record to copy.
 * @returns {object|null} A new object with the same own enumerable properties,
 *   or `null` when `record` is falsy.
 */
function clone(record) {
  return record ? { ...record } : null;
}

/**
 * Canonicalize an email for case-insensitive, whitespace-insensitive lookups.
 *
 * Mirrors the normalization performed by `userModel.createUser` so that values
 * persisted by {@link create} and values supplied to {@link findByEmail} compare
 * consistently. `null`/`undefined` collapse to the empty string (never throws).
 *
 * @param {*} email The raw email value to normalize.
 * @returns {string} The trimmed, lower-cased string form of `email`.
 */
function normalizeEmail(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

/**
 * Create and persist a new user record.
 *
 * The input is shaped through `userModel.createUser`, which guarantees the
 * canonical nine-field record (lower-cased email, generated UUID `id` when
 * absent, and defaulted `passwordHash`/`failedAttempts`/`lockedUntil`). Because
 * `createUser` is idempotent, callers may pass either raw attributes or an
 * already-shaped record. The shaped record is appended to the store and a CLONE
 * is returned so the caller receives the persisted record (including its
 * generated `id`) without holding a live reference into the store.
 *
 * This method deliberately does NOT enforce email uniqueness — that is a
 * business rule owned by `authService`, which calls {@link findByEmail} before
 * registering. It also NEVER hashes: `userInput.passwordHash` is expected to
 * already be a bcrypt hash (or `null`).
 *
 * @param {object} userInput Raw user attributes (or an already-shaped record).
 *   Must satisfy `userModel.createUser` (requires a non-empty `email`; `role`,
 *   when supplied, must be a valid domain role).
 * @returns {object} A clone of the persisted nine-field user record.
 * @throws {Error} Propagates from `userModel.createUser` when `email` is missing
 *   or a supplied `role` is invalid.
 */
function create(userInput) {
  const record = createUser(userInput); // canonical 9-field shape; never hashes
  store.push(record);
  return clone(record);
}

/**
 * Find a user by email, case-insensitively.
 *
 * The lookup key is normalized via {@link normalizeEmail}; an empty/blank email
 * yields `null` without scanning the store. The returned clone contains the
 * FULL record — including `passwordHash`, `failedAttempts`, and `lockedUntil` —
 * because `authService` needs the hash to verify credentials and the lockout
 * fields to enforce locking. Stripping sensitive fields for API responses is the
 * job of `userModel.toPublicUser` (model/controller layer), NOT this repository.
 *
 * @param {string} email The email to look up (any casing / surrounding space).
 * @returns {object|null} A clone of the matching full user record, or `null`
 *   when no user matches (or `email` is empty/blank).
 */
function findByEmail(email) {
  const target = normalizeEmail(email);
  if (!target) {
    return null;
  }
  return clone(store.find((u) => u.email === target));
}

/**
 * Find a user by its unique `id`.
 *
 * @param {string} id The user id to look up.
 * @returns {object|null} A clone of the matching full user record, or `null`
 *   when `id` is `null`/`undefined` or no user matches.
 */
function findById(id) {
  if (id == null) {
    return null;
  }
  return clone(store.find((u) => u.id === id));
}

/**
 * Apply a partial update to a stored user and persist it.
 *
 * Locates the canonical record by `id` and shallow-merges `changes` onto it. The
 * record's immutable identity is protected (`id` can never be changed through
 * this method) and `updatedAt` is always refreshed to the current time. This is
 * the method `authService` uses to persist lockout bookkeeping — e.g.
 * `{ failedAttempts, lockedUntil }` on failed attempts, and
 * `{ failedAttempts: 0, lockedUntil: null }` to reset on a successful login.
 *
 * The canonical record is mutated in place (so subsequent lookups observe the
 * change), and a CLONE of the updated record is returned to the caller.
 *
 * @param {string} id The id of the user to update.
 * @param {object} [changes] Partial fields to merge. Any `id` property in
 *   `changes` is ignored. A missing/`null` `changes` is treated as no field
 *   changes (only `updatedAt` is refreshed).
 * @returns {object|null} A clone of the updated record, or `null` when no user
 *   with the given `id` exists.
 */
function update(id, changes) {
  const record = store.find((u) => u.id === id);
  if (!record) {
    return null;
  }
  // Strip any attempt to change the immutable identity, then merge and always
  // bump the audit timestamp. `id` is reasserted last so it can never drift.
  const { id: _ignore, ...safeChanges } = changes || {};
  Object.assign(record, safeChanges, {
    id: record.id,
    updatedAt: new Date().toISOString(),
  });
  return clone(record);
}

/**
 * Return every stored user as an array of independent clones.
 *
 * A convenience read for administrative/reporting flows. Mutating the returned
 * array (or any of its records) never affects the canonical store.
 *
 * @returns {Array<object>} A fresh array of cloned user records (empty when the
 *   store is empty).
 */
function findAll() {
  return store.map(clone);
}

/**
 * Report how many users are currently stored.
 *
 * @returns {number} The number of records in the store.
 */
function count() {
  return store.length;
}

/**
 * Remove all users from the store.
 *
 * Primarily a test-isolation helper enabling deterministic Jest setup/teardown
 * (AAP §0.5.2). Truncates the existing array in place (preserving the original
 * reference) rather than reassigning it.
 *
 * @returns {void}
 */
function clear() {
  store.length = 0;
}

/**
 * Optionally seed a default administrator account (idempotent, async).
 *
 * Hashing is CPU-bound and asynchronous, so it is delegated to a caller-supplied
 * `hashFn` (e.g. `passwordUtils.hash`). This keeps the repository free of any
 * password-hashing concern and free of a `bcryptjs` dependency. The operation is
 * idempotent: if an admin with the resolved email already exists, the existing
 * record (clone) is returned and no duplicate is created.
 *
 * IMPORTANT: this function is OPTIONAL and is NOT invoked at module load, by
 * `src/app.js`, or by `src/server.js`. It exists so a future bootstrap/service
 * can seed an administrator without modifying any existing files.
 *
 * @param {function(string): Promise<string>} hashFn Async function that maps a
 *   plaintext password to its hash. REQUIRED.
 * @param {object} [options={}] Optional overrides.
 * @param {string} [options.email='admin@society.local'] Admin login email.
 * @param {string} [options.password='ChangeMe123!'] Plaintext password to hash.
 * @param {string} [options.name='Society Administrator'] Admin display name.
 * @returns {Promise<object>} A clone of the existing-or-newly-created admin
 *   user record.
 * @throws {Error} `userRepository.seedDefaultAdmin: an async hashFn(plaintext)
 *   is required` when `hashFn` is not a function.
 */
async function seedDefaultAdmin(hashFn, options = {}) {
  if (typeof hashFn !== 'function') {
    throw new Error(
      'userRepository.seedDefaultAdmin: an async hashFn(plaintext) is required'
    );
  }
  const email = normalizeEmail(options.email || 'admin@society.local');
  const existing = findByEmail(email);
  if (existing) {
    return existing;
  }
  const passwordHash = await hashFn(options.password || 'ChangeMe123!');
  return create({
    email,
    passwordHash,
    role: ROLES.ADMIN,
    name: options.name || 'Society Administrator',
  });
}

module.exports = {
  create,
  findByEmail,
  findById,
  update,
  findAll,
  count,
  clear,
  seedDefaultAdmin,
};
