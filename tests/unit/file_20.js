// Unit tests for src/middleware/*.js façades — verifies mod_<N>_<K>(x) === 6*x + 10
// SPECIAL CASE: src/middleware/file_27.js has only 705 named exports (mod_27_0..mod_27_704)
const test = require('node:test');
const assert = require('node:assert/strict');
const { modCompute } = require('../../src/utils/mod_compute');
const file_5 = require('../../src/middleware/file_5');
const file_16 = require('../../src/middleware/file_16');
const file_27 = require('../../src/middleware/file_27');

const INPUTS = [-1000, -1, 0, 1, 7, 1000, 1.5];
const expected = (x) => 6 * x + 10;

test('middleware/file_5: sampled mod_5_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_5.mod_5_0(x), expected(x));
    assert.strictEqual(file_5.mod_5_500(x), expected(x));
    assert.strictEqual(file_5.mod_5_1199(x), expected(x));
  }
});

test('middleware/file_16: sampled mod_16_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_16.mod_16_0(x), expected(x));
    assert.strictEqual(file_16.mod_16_500(x), expected(x));
    assert.strictEqual(file_16.mod_16_1199(x), expected(x));
  }
});

test('middleware/file_27 SPECIAL CASE: 705 valid exports (mod_27_0..mod_27_704)', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_27.mod_27_0(x), expected(x));     // first
    assert.strictEqual(file_27.mod_27_352(x), expected(x));   // middle
    assert.strictEqual(file_27.mod_27_704(x), expected(x));   // last valid
  }
});

test('middleware/file_27 SPECIAL CASE: indices >= 705 are undefined (no invented symbols)', () => {
  // Per AAP §0.7.3 — public symbol surface must NOT include invented exports
  assert.strictEqual(file_27.mod_27_705, undefined);
  assert.strictEqual(file_27.mod_27_900, undefined);
  assert.strictEqual(file_27.mod_27_1199, undefined);
  assert.strictEqual(Object.keys(file_27).length, 705);
});

test('middleware: all sampled façades agree with modCompute(x)', () => {
  for (const x of INPUTS) {
    const ref = modCompute(x);
    assert.strictEqual(file_5.mod_5_0(x), ref);
    assert.strictEqual(file_16.mod_16_0(x), ref);
    assert.strictEqual(file_27.mod_27_0(x), ref);
  }
});

test('middleware: deduplication — all bindings reference the same modCompute', () => {
  assert.strictEqual(file_5.mod_5_0, modCompute);
  assert.strictEqual(file_5.mod_5_1199, modCompute);
  assert.strictEqual(file_16.mod_16_0, modCompute);
  assert.strictEqual(file_16.mod_16_1199, modCompute);
  assert.strictEqual(file_27.mod_27_0, modCompute);
  assert.strictEqual(file_27.mod_27_704, modCompute);
});

test('middleware: file_5 and file_16 expose exactly 1,200 named exports each', () => {
  assert.strictEqual(Object.keys(file_5).length, 1200);
  assert.strictEqual(Object.keys(file_16).length, 1200);
  // file_27 has 705 — already asserted in the SPECIAL CASE test above
});

test('middleware: 1.5 input case (per AAP §0.6.3) — mod_<N>_<K>(1.5) === 19', () => {
  // Binding numerical contract: 6*1.5 + 10 = 19, NOT 9
  assert.strictEqual(file_5.mod_5_0(1.5), 19);
  assert.strictEqual(file_16.mod_16_500(1.5), 19);
  assert.strictEqual(file_27.mod_27_704(1.5), 19);
});
