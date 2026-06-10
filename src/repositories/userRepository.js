// userRepository.js - In-memory user persistence (CommonJS; no DB/ORM; mirrors the scaffold's 'const store = []' idiom)
//
// REPOSITORY LAYER (Login feature). This module owns in-memory user persistence
// (CRUD) over a single module-level `const store = [];`, which is this feature's
// realization of the scaffold's `const store = [];` idiom. It deliberately holds
// ONLY persistence/data-access concerns:
//   * It STORES, READS, and MUTATES canonical user records (the 9-field shape
//     produced by src/models/userModel.createUser).
//   * It RETURNS shallow clones of every record so callers can never mutate the
//     canonical store by reference.
//
// By design there is intentionally:
//   * NO database, ORM, SQL, query builder, or migration,
//   * NO file system, HTTP, or any other network/disk I/O,
//   * NO external/third-party dependency,
//   * NO password hashing here (hashing is async and belongs to
//     src/utils/passwordUtils.js + src/services/authService.js; this store only
//     persists an already-computed `passwordHash`, never the plaintext),
//   * and NO business rules (email-uniqueness enforcement, lockout thresholds,
//     credential verification, and token issuance all live in authService).
//
// The structure (functions over a private array) is intentionally shaped so a
// real database-backed implementation could replace the in-memory store later
// without changing this module's public contract.
//
// Consumers load this module via CommonJS `require('../repositories/userRepository')`:
//   - src/services/authService.js -> create() on registration; findByEmail() to
//     read credentials on login; update() to persist/reset the lockout fields
//     (failedAttempts, lockedUntil). NOTE: the services layer is built AFTER this
//     repository; the exported names/shapes below are the contract it consumes.
//
// The role constant used by the optional admin seed comes from the DOMAIN layer
// (src/domain/user.js) -- this file imports ROLES rather than hardcoding 'admin'.

'use strict';

// User-record factory/normalizer (single source of truth for the record shape).
// createUser(input) returns a normalized record with EXACTLY the nine canonical
// fields, in order: id, email, passwordHash, role, name, createdAt, updatedAt,
// failedAttempts, lockedUntil. It lowercases/trims `email`, generates a UUID `id`
// when absent, defaults passwordHash=null / failedAttempts=0 / lockedUntil=null,
// preserves a provided id/createdAt (so re-shaping is idempotent), and NEVER
// hashes -- it stores the passwordHash as provided. It throws when `email` is
// missing/blank or `role` is invalid.
const { createUser } = require('../models/userModel');

// Domain role constants (single source of truth): a frozen object
// { ADMIN: 'admin', MEMBER: 'member' }. Used ONLY by seedDefaultAdmin() to assign
// ROLES.ADMIN to the seeded administrator instead of a bare 'admin' literal.
const { ROLES } = require('../domain/user');

/**
 * Module-private canonical user store.
 *
 * A plain JavaScript array that holds the authoritative user records. It is kept
 * module-private (never exported) so the only way to read or mutate users is
 * through the functions below; this keeps the store encapsulated and lets a real
 * database replace it later without changing the public contract. Each element is
 * a canonical 9-field record produced by {@link createUser}.
 *
 * @type {Array<Object>}
 */
const store = [];

/**
 * Produce a shallow copy of a single user record (or pass through null).
 *
 * Every function that returns a record routes it through this helper so callers
 * receive an independent object: mutating a returned record can never reach back
 * and corrupt the canonical record held in {@link store}. A canonical record holds
 * only primitive field values, so a shallow spread (`{ ...record }`) is a complete,
 * safe copy. This function is private (NOT exported).
 *
 * @param {Object|null|undefined} record - A canonical user record, or a falsy
 *   value (e.g. the `undefined` returned by `Array.prototype.find` on a miss).
 * @returns {Object|null} A new object cloning `record`, or `null` when `record`
 *   is falsy.
 */
function clone(record) {
  return record ? { ...record } : null;
}

/**
 * Normalize an email into the canonical lookup form.
 *
 * Mirrors the normalization performed by {@link createUser} so lookups are
 * case-insensitive and whitespace-insensitive, and so a value stored via
 * `create()` can always be found again via `findByEmail()`. Tolerates `null` and
 * `undefined` (both collapse to an empty string) and coerces any other type via
 * `String(...)` before trimming and lower-casing. This function is private
 * (NOT exported).
 *
 * @param {*} email - A candidate email value of any type.
 * @returns {string} The trimmed, lower-cased email, or `''` when unusable.
 */
function normalizeEmail(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

/**
 * create - shape, persist, and return a new user record.
 *
 * The raw input is normalized into the canonical 9-field shape by
 * {@link createUser} (which lowercases/trims the email, generates a UUID `id` when
 * absent, and defaults the lockout fields), then pushed into the store. The
 * persisted record is returned as a clone so the caller receives its generated
 * `id` without holding a live reference into the store.
 *
 * Intentionally NOT done here (these are business rules owned by authService):
 *   - Email-uniqueness enforcement: authService calls findByEmail() before
 *     registering; this repository accepts duplicates if asked to.
 *   - Password hashing: `userInput.passwordHash` is expected to already be a
 *     bcrypt hash (or null). This store never hashes.
 *
 * @param {Object} userInput - Raw user attributes accepted by {@link createUser}
 *   (must include a non-blank `email`; `passwordHash` should already be hashed).
 * @returns {Object} A clone of the persisted canonical user record.
 * @throws {Error} Propagates `createUser`'s errors when `email` is missing/blank
 *   or `role` is invalid.
 */
function create(userInput) {
  const record = createUser(userInput);
  store.push(record);
  return clone(record);
}

/**
 * findByEmail - case-insensitive lookup of a user by email.
 *
 * The query email is normalized the same way stored emails are, so matching is
 * case- and whitespace-insensitive. A blank/normalizable-to-empty query yields
 * `null` without scanning the store.
 *
 * The returned clone contains the FULL record -- including `passwordHash`,
 * `failedAttempts`, and `lockedUntil` -- because authService needs the hash to
 * verify credentials and the lockout fields to enforce locking. Producing a
 * public/leak-safe view (via userModel.toPublicUser) is the model/controller's
 * job, not this repository's.
 *
 * @param {*} email - The email to look up (any case/whitespace).
 * @returns {Object|null} A clone of the matching record, or `null` when the email
 *   is blank or no user matches.
 */
function findByEmail(email) {
  const target = normalizeEmail(email);
  if (!target) {
    return null;
  }
  return clone(store.find((user) => user.email === target));
}

/**
 * findById - lookup of a user by its `id`.
 *
 * A `null`/`undefined` id yields `null` without scanning the store. Matching is a
 * strict `===` comparison against each record's `id`.
 *
 * @param {*} id - The user id to look up.
 * @returns {Object|null} A clone of the matching record, or `null` when `id` is
 *   nullish or no user matches.
 */
function findById(id) {
  if (id == null) {
    return null;
  }
  return clone(store.find((user) => user.id === id));
}

/**
 * update - persist a partial change set onto an existing user record.
 *
 * Locates the canonical record in the store by `id` and shallow-merges `changes`
 * onto it in place, with two invariants always enforced:
 *   - the record's `id` can NEVER be changed (any `id` in `changes` is stripped
 *     and the original id is reapplied), and
 *   - `updatedAt` is ALWAYS bumped to a fresh ISO-8601 timestamp.
 *
 * This is the method authService uses to persist lockout state during failed
 * logins (e.g. `{ failedAttempts, lockedUntil }`) and to reset it on a successful
 * login (`{ failedAttempts: 0, lockedUntil: null }`).
 *
 * @param {*} id - The id of the record to update.
 * @param {Object} [changes] - Partial fields to merge. A `changes.id` is ignored.
 *   A nullish `changes` is treated as an empty change set (only `updatedAt` moves).
 * @returns {Object|null} A clone of the updated record, or `null` when no record
 *   has the given `id`.
 */
function update(id, changes) {
  const record = store.find((user) => user.id === id);
  if (!record) {
    return null;
  }
  // Strip any incoming `id` so a caller can never reassign the primary key, then
  // merge the remaining changes and force a fresh `updatedAt`.
  const { id: _ignoredId, ...safeChanges } = changes || {};
  Object.assign(record, safeChanges, {
    id: record.id,
    updatedAt: new Date().toISOString(),
  });
  return clone(record);
}

/**
 * findAll - return clones of every stored user.
 *
 * A convenience read that returns a new array of shallow clones, so neither the
 * returned array nor its elements are live references into the store. Order
 * follows insertion order.
 *
 * @returns {Array<Object>} A new array of cloned user records (empty when the
 *   store is empty).
 */
function findAll() {
  return store.map(clone);
}

/**
 * count - the number of users currently stored.
 *
 * @returns {number} The store's length.
 */
function count() {
  return store.length;
}

/**
 * clear - remove every user from the store.
 *
 * Empties the store in place (preserving the same array reference) so tests can
 * establish a deterministic, isolated starting state in setup/teardown. The store
 * is truncated via `store.length = 0` rather than reassigned because it is a
 * `const`.
 *
 * @returns {void}
 */
function clear() {
  store.length = 0;
}

/**
 * seedDefaultAdmin - OPTIONAL, idempotent async seed of a default administrator.
 *
 * Creates a single ADMIN user if (and only if) one with the resolved email does
 * not already exist. Hashing is intentionally delegated to a caller-supplied
 * async `hashFn` (e.g. `require('../utils/passwordUtils').hash`) so that this
 * repository never imports `bcryptjs` and never performs (blocking) hashing
 * itself -- it only persists the resulting hash.
 *
 * Idempotency: a repeat call with the same email returns the already-seeded admin
 * (a clone, via findByEmail) instead of creating a duplicate.
 *
 * IMPORTANT: this function is OPTIONAL and is NOT invoked at module load, by the
 * `src/app.js` composition root, or by `src/server.js`. It exists so a future
 * bootstrap/service can seed an admin without modifying any existing file.
 *
 * @param {function(string): Promise<string>} hashFn - Async function that hashes
 *   a plaintext password and resolves to the hash. REQUIRED.
 * @param {Object} [options={}] - Optional overrides for the seeded admin.
 * @param {string} [options.email='admin@society.local'] - Admin email.
 * @param {string} [options.password='ChangeMe123!'] - Plaintext password to hash.
 *   This default is an intentionally-weak placeholder meant to be overridden via
 *   configuration in any real deployment; it is not a real credential.
 * @param {string} [options.name='Society Administrator'] - Admin display name.
 * @returns {Promise<Object>} A clone of the existing-or-newly-created admin record.
 * @throws {Error} When `hashFn` is not a function (message contains "hashFn").
 */
async function seedDefaultAdmin(hashFn, options = {}) {
  if (typeof hashFn !== 'function') {
    throw new Error(
      'userRepository.seedDefaultAdmin: an async hashFn(plaintext) is required'
    );
  }

  const email = normalizeEmail(options.email || 'admin@society.local');

  // Idempotent guard: never create a second admin for the same email.
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
