// passwordUtils.js - Async bcrypt password hashing/verification helpers.
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login feature's dependency graph, alongside the other src/utils helpers. It is a
// thin, focused wrapper around the `bcryptjs` library that exposes exactly two
// operations the authentication flow needs: deriving a one-way bcrypt hash from a
// plaintext password (registration) and verifying a candidate password against a
// previously stored hash (login). It contains no business logic, holds no state,
// and makes no policy decisions of its own.
//
// SINGLE DEPENDENCY BY DESIGN (AAP 0.2.3 / 0.3.1): the ONLY thing this file
// requires is the `bcryptjs` npm package - a pure-JavaScript, zero-native-build
// bcrypt implementation chosen deliberately over native `bcrypt` to avoid a
// `node-gyp` toolchain and reduce install risk. This module imports NO application
// config and NO other repository module: the bcrypt cost factor (`rounds`) is
// always supplied by the caller (src/services/authService.js reads BCRYPT_ROUNDS
// from config and passes it in), so this helper stays config-agnostic and trivially
// reusable/testable.
//
// ASYNC API ONLY (security-critical - AAP 0.2.3 / 0.5.2): bcrypt hashing is
// intentionally CPU-intensive. To keep that work off the single-threaded Node.js
// event loop, this module uses ONLY the promise-returning asynchronous bcrypt forms
// (`bcrypt.hash` / `bcrypt.compare` invoked without a callback, which return
// Promises). The blocking synchronous variants (`hashSync`, `compareSync`,
// `genSaltSync`) are NEVER used here and must not be introduced - they would stall
// every other in-flight request while a hash is computed.
//
// SECURITY (AAP 0.8 / C6 - passwords stored only as bcrypt hashes, never plaintext):
// this module performs NO logging whatsoever. It never writes the plaintext
// password, the resulting hash, the cost factor, or any other value to `console` or
// any stream. Callers must likewise avoid logging the inputs/outputs of these
// functions. The returned hash is a self-describing bcrypt string (algorithm, cost,
// and salt are encoded in the value itself), which is exactly what should be
// persisted in the user record - the raw password is never stored.
//
// CommonJS only: wiring is via `module.exports` (no ESM `import`/`export`). The
// existing scaffold `file_*.js` / `src/utils/filler.js` modules are read-only filler
// and are neither referenced nor imported here (AAP 0.6.2).
//
// Consumers load this module by its utils path '../utils/passwordUtils':
//   - src/services/authService.js -> `hash(password, rounds)` during user
//     registration to derive the stored credential, and `compare(password, hash)`
//     during login to verify a submitted password against the stored hash.

'use strict';

// The sole dependency: the pure-JS `bcryptjs` implementation. Required by its bare
// package name so Node resolves it from node_modules. We use only its async
// (Promise-returning) surface - see the ASYNC API note above.
const bcrypt = require('bcryptjs');

/**
 * Asynchronously derive a bcrypt hash of a plaintext password.
 *
 * Delegates directly to `bcrypt.hash(data, saltOrRounds)`. When the second argument
 * is a number, bcryptjs generates a fresh, cryptographically random salt at that
 * cost factor and folds it into the returned hash, so no separate salt-generation
 * step is needed (and none of the synchronous `genSaltSync`/`hashSync` APIs are
 * used). Calling `bcrypt.hash` WITHOUT a callback returns a Promise, which this
 * `async` function awaits implicitly by returning it - keeping the expensive hashing
 * work off the event loop.
 *
 * The `rounds` cost factor is ALWAYS provided by the caller (e.g. authService passes
 * the configured BCRYPT_ROUNDS value); this helper intentionally neither imports
 * config nor hardcodes a default that could silently override the caller. Because
 * environment-derived values commonly arrive as strings, the value is coerced with
 * `Number(...)` so a numeric (salt-rounds) form is always passed to bcrypt rather
 * than a string (which bcryptjs would otherwise treat as a pre-generated salt).
 *
 * Each invocation produces a distinct hash for the same input because the salt is
 * random per call; verification is therefore done via {@link compare}, never by
 * hashing again and comparing strings.
 *
 * @param {string} password - The plaintext password to hash. Never logged or stored.
 * @param {number|string} rounds - The bcrypt cost factor (salt rounds) supplied by
 *   the caller. Accepts a number or a numeric string (coerced via `Number`).
 * @returns {Promise<string>} Resolves to the self-describing bcrypt hash string
 *   (encoding algorithm, cost, and salt) suitable for persisting in the user record.
 */
async function hash(password, rounds) {
  // `rounds` is caller-supplied (from BCRYPT_ROUNDS in config). Coerce to a Number
  // so bcryptjs treats it as a cost factor and auto-generates the salt; passing a
  // numeric rounds value is the preferred single-call form. Returning the Promise
  // from `bcrypt.hash` (no callback) keeps this fully asynchronous.
  return bcrypt.hash(password, Number(rounds));
}

/**
 * Asynchronously verify a plaintext password against a stored bcrypt hash.
 *
 * Delegates directly to `bcrypt.compare(data, encrypted)`. bcryptjs extracts the
 * algorithm, cost factor, and salt embedded in the stored hash, re-derives the hash
 * of the supplied password using those parameters, and performs a constant-time
 * comparison - so this helper does not need (and must not be given) the original
 * cost factor. Calling `bcrypt.compare` WITHOUT a callback returns a Promise, which
 * this `async` function returns directly, keeping the comparison off the event loop.
 *
 * The documented public signature is `compare(password, hash)`; the second parameter
 * is named `hashedPassword` internally purely for readability - it is the previously
 * stored bcrypt hash (e.g. the value produced earlier by {@link hash}).
 *
 * @param {string} password - The candidate plaintext password to verify. Never logged.
 * @param {string} hashedPassword - The previously stored bcrypt hash to verify against.
 * @returns {Promise<boolean>} Resolves to `true` when the password matches the stored
 *   hash, or `false` otherwise. (Rejects only if bcrypt itself throws, e.g. on a
 *   malformed hash string.)
 */
async function compare(password, hashedPassword) {
  // Promise-returning async form (no callback). bcryptjs reads the salt/cost from
  // the stored hash itself, so only the plaintext and the stored hash are needed.
  return bcrypt.compare(password, hashedPassword);
}

// CommonJS named exports. Each function is exported by its exact public name so
// callers can destructure precisely what they need, e.g.
// `const { hash, compare } = require('../utils/passwordUtils');`.
module.exports = {
  hash,
  compare,
};
