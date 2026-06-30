// validation.js - Lightweight dependency-free validators for request payloads.
'use strict';

/**
 * Lightweight, dependency-free validation helpers.
 *
 * Part of the Society Management Login + Reporting feature. These helpers are
 * used by controllers and services (e.g. `authController`, `authService`,
 * `reportController`) to validate request payloads — registration/login inputs
 * and required query/body fields — before any processing occurs. Callers decide
 * how to respond to invalid input (typically an HTTP 400); these functions never
 * throw for ordinary invalid input and never produce side effects.
 *
 * Design principles (intentional, per the feature's dependency-hygiene mandate):
 *   - NO validation framework and NO external dependency (no joi/yup/validator/
 *     express-validator). Pure JavaScript only.
 *   - NO module imports of any kind (no `require` of config or any other
 *     repository file) — this module is fully self-contained.
 *   - CommonJS module (`module.exports`); no ESM.
 *   - Every exported function is pure and total: deterministic, free of side
 *     effects (no logging, no mutation of inputs), and guaranteed not to throw
 *     when given arbitrary/ordinary input. Invalid input yields a `false` /
 *     empty-array result rather than an exception.
 *
 * @module utils/validation
 */

/**
 * Minimum number of characters required for a valid password.
 *
 * Password policy baseline (documented and enforced by {@link isValidPassword}):
 *   - at least MIN_PASSWORD_LENGTH (8) characters in length, and
 *   - contains at least one letter (A–Z or a–z), and
 *   - contains at least one digit (0–9).
 *
 * The length is measured against the raw string so that legitimate whitespace
 * inside a password still counts toward its length; {@link isNonEmptyString}
 * separately guarantees the password is not blank.
 *
 * @constant {number}
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Pragmatic e-mail syntax check (deliberately NOT full RFC 5322).
 *
 * Requires: a non-space local part, an `@`, a non-space domain label, a literal
 * dot, and a non-space top-level label — e.g. `user@example.com`. This is a
 * lightweight sanity check sufficient for request validation; authoritative
 * verification (if ever needed) is performed out of band (e.g. a confirmation
 * e-mail), not by a regular expression.
 *
 * @constant {RegExp}
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Matches when a string contains at least one ASCII letter. Part of the
 * password policy enforced by {@link isValidPassword}.
 *
 * @constant {RegExp}
 */
const PASSWORD_LETTER_RE = /[A-Za-z]/;

/**
 * Matches when a string contains at least one digit. Part of the password
 * policy enforced by {@link isValidPassword}.
 *
 * @constant {RegExp}
 */
const PASSWORD_DIGIT_RE = /\d/;

/**
 * Determine whether a value is a string containing at least one
 * non-whitespace character.
 *
 * Non-string values (numbers, booleans, `null`, `undefined`, objects, arrays,
 * etc.) always return `false`. Strings consisting solely of whitespace also
 * return `false`.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} `true` if `value` is a non-blank string, otherwise `false`.
 *
 * @example
 * isNonEmptyString('x');   // => true
 * isNonEmptyString('  ');  // => false
 * isNonEmptyString(5);     // => false
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Determine whether a value is a syntactically reasonable e-mail address.
 *
 * The input is first guarded with {@link isNonEmptyString}, then trimmed and
 * tested against {@link EMAIL_RE}. Surrounding whitespace is ignored so that,
 * for example, `' user@example.com '` is accepted. Internal whitespace is not
 * permitted by the pattern.
 *
 * @param {*} email - The candidate e-mail address.
 * @returns {boolean} `true` if `email` looks like a valid address, else `false`.
 *
 * @example
 * isValidEmail('a@b.com'); // => true
 * isValidEmail('bad');     // => false
 * isValidEmail('');        // => false
 */
function isValidEmail(email) {
  return isNonEmptyString(email) && EMAIL_RE.test(email.trim());
}

/**
 * Determine whether a value satisfies the baseline password policy.
 *
 * Policy: the password must be a non-blank string of at least
 * {@link MIN_PASSWORD_LENGTH} characters that contains at least one letter and
 * at least one digit. The length check uses the raw string (whitespace counts),
 * while {@link isNonEmptyString} ensures the password is not entirely blank.
 *
 * @param {*} password - The candidate password.
 * @returns {boolean} `true` if the password meets the policy, otherwise `false`.
 *
 * @example
 * isValidPassword('passw0rd'); // => true
 * isValidPassword('short1');   // => false (too short)
 * isValidPassword('password'); // => false (no digit)
 */
function isValidPassword(password) {
  return (
    isNonEmptyString(password) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    PASSWORD_LETTER_RE.test(password) &&
    PASSWORD_DIGIT_RE.test(password)
  );
}

/**
 * Return the subset of required field names that are missing from an object.
 *
 * A field is considered "missing" when any of the following hold:
 *   - `obj` is not a non-null object (in which case every required field is
 *     reported as missing), or
 *   - the value at that field is `undefined` or `null`, or
 *   - the value is a string that is empty after trimming.
 *
 * The function is pure: it never mutates `obj` or `requiredFields` and always
 * returns a brand-new array (never an alias of `requiredFields`). If
 * `requiredFields` is not an array, an empty array is returned.
 *
 * @param {*} obj - The object whose fields should be inspected.
 * @param {string[]} requiredFields - The names of the fields that must be present.
 * @returns {string[]} The required field names that are missing (possibly empty).
 *
 * @example
 * getMissingFields({ a: 'x' }, ['a', 'b']); // => ['b']
 * getMissingFields(null, ['a', 'b']);       // => ['a', 'b']
 * getMissingFields({ a: 'x', b: 'y' }, ['a', 'b']); // => []
 */
function getMissingFields(obj, requiredFields) {
  const fields = Array.isArray(requiredFields) ? requiredFields : [];

  // Guard: a non-object payload cannot satisfy any required field. Return a
  // copy (never the caller's array) so the result is always independent.
  if (!obj || typeof obj !== 'object') {
    return [...fields];
  }

  // `filter` produces a new array, so the result never aliases `requiredFields`.
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
 * Convenience predicate: report whether all required fields are present.
 *
 * Equivalent to `getMissingFields(obj, requiredFields).length === 0`.
 *
 * @param {*} obj - The object whose fields should be inspected.
 * @param {string[]} requiredFields - The names of the fields that must be present.
 * @returns {boolean} `true` if no required field is missing, otherwise `false`.
 *
 * @example
 * hasRequiredFields({ a: 'x', b: 'y' }, ['a', 'b']); // => true
 * hasRequiredFields({ a: 'x' }, ['a', 'b']);         // => false
 */
function hasRequiredFields(obj, requiredFields) {
  return getMissingFields(obj, requiredFields).length === 0;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  getMissingFields,
  hasRequiredFields,
  // Exposed so callers/tests can reference the documented policy threshold
  // without hard-coding the literal value (optional per the file spec).
  MIN_PASSWORD_LENGTH,
};
