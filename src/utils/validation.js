// validation.js - Lightweight, dependency-free input validators (no external packages).
//
// UTILS LAYER (foundational leaf): this module sits at the very bottom of the new
// Login + Reporting feature's dependency graph, alongside the other src/utils
// helpers. It exposes a handful of small, pure predicate/utility functions that
// callers use to vet untrusted request input *before* it reaches business logic -
// e.g. checking that a registration body carries a syntactically valid email and
// a policy-compliant password, or that a request body/query carries every field a
// handler needs.
//
// ZERO DEPENDENCIES BY DESIGN (AAP 0.3.1 - validation stays vanilla): this file
// imports NOTHING. It pulls in no npm validation framework (no joi, yup, validator,
// or express-validator) and no other repository module, and it deliberately does
// NOT load application config. Keeping it self-contained makes it safe to use at
// any layer (controllers, services, middleware) and at any point in the request
// lifecycle, and it keeps the feature's dependency footprint minimal.
//
// PURE & TOTAL FUNCTIONS: every export is a pure function - it has no side effects,
// performs no logging or I/O, mutates none of its arguments, and never throws for
// ordinary invalid input. Each function instead *returns a value describing
// validity* (a boolean, or an array of the offending field names). This leaves the
// HTTP concern - typically responding with `400 Bad Request` - entirely to the
// caller, and makes each function trivially unit-testable in isolation.
//
// CommonJS only: wiring is via `module.exports` (no ESM `import`/`export`). The
// existing scaffold `file_*.js` / `src/utils/filler.js` modules are read-only
// filler and are neither referenced nor imported here (AAP 0.6.2).
//
// Consumers load this module by its utils path '../utils/validation', for example:
//   - src/controllers/authController.js -> validate register/login payloads.
//   - src/services/authService.js       -> defensively re-check credentials shape.
//   - src/controllers/reportController.js -> validate required report params.

'use strict';

/**
 * Minimum number of characters a password must contain to satisfy the baseline
 * password policy enforced by {@link isValidPassword}.
 *
 * Exposed on the module exports (see bottom of file) so that callers and tests can
 * reference the single source of truth for the threshold rather than hard-coding
 * the literal `8` at multiple call sites.
 *
 * @type {number}
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Pragmatic email syntax matcher.
 *
 * This intentionally does NOT attempt full RFC 5322 compliance (which is famously
 * complex and of little practical value for a server-side sanity check). Instead it
 * enforces a simple, dependency-free shape that catches the overwhelming majority
 * of malformed input: a non-empty local part containing no whitespace and no `@`,
 * a single `@`, a domain segment, a literal dot, and a top-level-domain segment -
 * i.e. `local@domain.tld`.
 *
 * The regex carries no `g`/`y` flag, so it holds no `lastIndex` state and is safe to
 * reuse across many `.test()` calls from this shared module-level constant.
 *
 * @type {RegExp}
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Matches a password that contains at least one ASCII letter (`A`-`Z` / `a`-`z`).
 * Part of the {@link isValidPassword} baseline policy. Stateless (no `g` flag).
 *
 * @type {RegExp}
 */
const PASSWORD_HAS_LETTER_RE = /[A-Za-z]/;

/**
 * Matches a password that contains at least one decimal digit (`0`-`9`).
 * Part of the {@link isValidPassword} baseline policy. Stateless (no `g` flag).
 *
 * @type {RegExp}
 */
const PASSWORD_HAS_DIGIT_RE = /\d/;

/**
 * Determine whether a value is a non-empty, non-whitespace-only string.
 *
 * Returns `true` only when `value` is of type `string` AND contains at least one
 * non-whitespace character (so `''`, `'   '`, `'\t\n'` all return `false`).
 * Non-string inputs - `undefined`, `null`, numbers, booleans, objects, arrays -
 * always return `false` without throwing.
 *
 * This is the primitive guard upon which the other text validators are built; it
 * exists so that callers never have to repeat the `typeof` + `trim()` dance.
 *
 * @param {*} value - Any value to test.
 * @returns {boolean} `true` if `value` is a string with meaningful (non-blank) content.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Determine whether a value is a syntactically reasonable email address.
 *
 * The input is first guarded by {@link isNonEmptyString} (so non-strings and blank
 * strings short-circuit to `false`), then trimmed of surrounding whitespace and
 * tested against {@link EMAIL_RE}. The check is deliberately pragmatic, not RFC
 * 5322 exhaustive - it confirms the `local@domain.tld` shape and rejects values
 * containing whitespace or a missing `@`/dot, which is sufficient for server-side
 * payload validation.
 *
 * Note: validation does not normalize or persist the value; callers that wish to
 * store a canonical form should trim/lowercase the email themselves.
 *
 * @param {*} email - The candidate email address (any type accepted; only strings can pass).
 * @returns {boolean} `true` if `email` looks like a valid email address.
 */
function isValidEmail(email) {
  return isNonEmptyString(email) && EMAIL_RE.test(email.trim());
}

/**
 * Determine whether a password satisfies the baseline password policy.
 *
 * BASELINE PASSWORD POLICY (intentionally simple and dependency-free):
 *   1. Must be a non-empty string (guarded by {@link isNonEmptyString}).
 *   2. Must be at least {@link MIN_PASSWORD_LENGTH} (8) characters long. Length is
 *      measured on the raw string - leading/trailing spaces are NOT trimmed here,
 *      because spaces are legitimate password characters and trimming would both
 *      undercount length and silently alter the user's chosen secret.
 *   3. Must contain at least one letter ({@link PASSWORD_HAS_LETTER_RE}).
 *   4. Must contain at least one digit ({@link PASSWORD_HAS_DIGIT_RE}).
 *
 * The function evaluates the cheapest, most-likely-to-fail conditions first and
 * relies on short-circuit evaluation, so a non-string or too-short password never
 * reaches the regex tests. It returns a boolean and never throws.
 *
 * @param {*} password - The candidate password (any type accepted; only strings can pass).
 * @returns {boolean} `true` if `password` meets every rule of the baseline policy.
 */
function isValidPassword(password) {
  return (
    isNonEmptyString(password) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    PASSWORD_HAS_LETTER_RE.test(password) &&
    PASSWORD_HAS_DIGIT_RE.test(password)
  );
}

/**
 * Compute which of a set of required fields are missing from an object.
 *
 * A field name is considered "missing" when ANY of the following hold:
 *   - `obj` is not a usable object (e.g. `undefined`, `null`, or a primitive), in
 *     which case EVERY required field is reported as missing; or
 *   - the field's value is `undefined`; or
 *   - the field's value is `null`; or
 *   - the field's value is a string that is empty after trimming (`''`, `'   '`).
 *
 * Values that are present but falsy in other ways - notably the number `0`, the
 * boolean `false`, or an empty array/object - are treated as PRESENT (not missing),
 * because their presence is a deliberate caller-supplied value rather than an
 * omission. This makes the helper safe for validating mixed-type payloads.
 *
 * The function is pure and total: it never mutates its inputs and never throws. To
 * guarantee callers cannot mutate internal state, the "everything is missing"
 * branch returns a fresh shallow copy of the requested field list. A non-array
 * `requiredFields` argument is tolerated and treated as "no required fields",
 * yielding an empty result.
 *
 * @param {*} obj - The object whose fields are inspected (any type accepted).
 * @param {string[]} requiredFields - Names of fields that must be present and non-blank.
 * @returns {string[]} The subset of `requiredFields` that are missing; empty when all are present.
 */
function getMissingFields(obj, requiredFields) {
  // Tolerate a non-array `requiredFields` rather than throwing: treat it as an
  // empty requirement set so callers get a total, predictable function.
  const fields = Array.isArray(requiredFields) ? requiredFields : [];

  // If there is no usable object to inspect, every required field is missing.
  // Return a copy so the caller cannot mutate the original `requiredFields` array.
  if (!obj || typeof obj !== 'object') {
    return fields.slice();
  }

  return fields.filter((field) => {
    const value = obj[field];
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    );
  });
}

/**
 * Convenience predicate: report whether an object carries every required field.
 *
 * This is a thin wrapper over {@link getMissingFields} - it returns `true` exactly
 * when no required field is missing. Use it at call sites that only need a yes/no
 * answer; use {@link getMissingFields} directly when you want to tell the client
 * *which* fields were absent.
 *
 * @param {*} obj - The object whose fields are inspected (any type accepted).
 * @param {string[]} requiredFields - Names of fields that must be present and non-blank.
 * @returns {boolean} `true` if no required field is missing.
 */
function hasRequiredFields(obj, requiredFields) {
  return getMissingFields(obj, requiredFields).length === 0;
}

// CommonJS named exports. Every function is exported by its exact public name so
// callers can destructure precisely what they need, e.g.
// `const { isValidEmail, hasRequiredFields } = require('../utils/validation');`.
// MIN_PASSWORD_LENGTH is also exported as the single source of truth for the
// password length threshold (useful for callers building user-facing messages and
// for tests asserting the policy).
module.exports = {
  MIN_PASSWORD_LENGTH,
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  getMissingFields,
  hasRequiredFields,
};
