// Unit tests for src/controllers/*.js façades — verifies mod_<N>_<K>(x) === 6*x + 10
const test = require('node:test');
const assert = require('node:assert/strict');
const { modCompute } = require('../../src/utils/mod_compute');
const file_0 = require('../../src/controllers/file_0');
const file_11 = require('../../src/controllers/file_11');
const file_22 = require('../../src/controllers/file_22');

const INPUTS = [-1000, -1, 0, 1, 7, 1000, 1.5];
const expected = (x) => 6 * x + 10;

test('controllers/file_0: sampled mod_0_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_0.mod_0_0(x), expected(x));
    assert.strictEqual(file_0.mod_0_500(x), expected(x));
    assert.strictEqual(file_0.mod_0_1199(x), expected(x));
  }
});

test('controllers/file_11: sampled mod_11_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_11.mod_11_0(x), expected(x));
    assert.strictEqual(file_11.mod_11_500(x), expected(x));
    assert.strictEqual(file_11.mod_11_1199(x), expected(x));
  }
});

test('controllers/file_22: sampled mod_22_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(file_22.mod_22_0(x), expected(x));
    assert.strictEqual(file_22.mod_22_500(x), expected(x));
    assert.strictEqual(file_22.mod_22_1199(x), expected(x));
  }
});

test('controllers: all sampled façades agree with modCompute(x)', () => {
  for (const x of INPUTS) {
    const ref = modCompute(x);
    assert.strictEqual(file_0.mod_0_0(x), ref);
    assert.strictEqual(file_11.mod_11_0(x), ref);
    assert.strictEqual(file_22.mod_22_0(x), ref);
  }
});

test('controllers: deduplication — all bindings reference the same modCompute', () => {
  assert.strictEqual(file_0.mod_0_0, modCompute);
  assert.strictEqual(file_0.mod_0_1199, modCompute);
  assert.strictEqual(file_11.mod_11_0, modCompute);
  assert.strictEqual(file_11.mod_11_1199, modCompute);
  assert.strictEqual(file_22.mod_22_0, modCompute);
  assert.strictEqual(file_22.mod_22_1199, modCompute);
});

test('controllers: each façade exposes exactly 1,200 named exports', () => {
  assert.strictEqual(Object.keys(file_0).length, 1200);
  assert.strictEqual(Object.keys(file_11).length, 1200);
  assert.strictEqual(Object.keys(file_22).length, 1200);
});

test('controllers: 1.5 input case (per AAP §0.6.3) — mod_<N>_<K>(1.5) === 19', () => {
  // Binding numerical contract: 6*1.5 + 10 = 19, NOT 9
  assert.strictEqual(file_0.mod_0_0(1.5), 19);
  assert.strictEqual(file_11.mod_11_500(1.5), 19);
  assert.strictEqual(file_22.mod_22_1199(1.5), 19);
});
