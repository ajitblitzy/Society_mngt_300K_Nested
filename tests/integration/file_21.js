// Integration tests (alternative sampling) — verify the numerical contract
// mod_<N>_<K>(x) === 6*x + 10 across a different file from each source folder
// (controllers, services, models, routes, utils, middleware, config,
// repositories, domain). Includes the file_27.js SPECIAL CASE: only 705
// exported symbols (mod_27_0 through mod_27_704), not 1,200.
const test = require('node:test');
const assert = require('node:assert/strict');

const { modCompute } = require('../../src/utils/mod_compute');
const controllersFile22 = require('../../src/controllers/file_22');
const servicesFile23 = require('../../src/services/file_23');
const modelsFile24 = require('../../src/models/file_24');
const routesFile25 = require('../../src/routes/file_25');
const utilsFile26 = require('../../src/utils/file_26');
const middlewareFile27 = require('../../src/middleware/file_27'); // SPECIAL: 705 funcs
const configFile17 = require('../../src/config/file_17');
const repositoriesFile18 = require('../../src/repositories/file_18');
const domainFile19 = require('../../src/domain/file_19');

const INPUTS = [-1000, -1, 0, 1, 7, 1000, 1.5];
const expected = (x) => 6 * x + 10;

test('controllers/file_22 mod_22_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(controllersFile22.mod_22_0(x), expected(x));
    assert.strictEqual(controllersFile22.mod_22_600(x), expected(x));
    assert.strictEqual(controllersFile22.mod_22_1199(x), expected(x));
  }
});

test('services/file_23 mod_23_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(servicesFile23.mod_23_0(x), expected(x));
    assert.strictEqual(servicesFile23.mod_23_600(x), expected(x));
    assert.strictEqual(servicesFile23.mod_23_1199(x), expected(x));
  }
});

test('models/file_24 mod_24_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(modelsFile24.mod_24_0(x), expected(x));
    assert.strictEqual(modelsFile24.mod_24_600(x), expected(x));
    assert.strictEqual(modelsFile24.mod_24_1199(x), expected(x));
  }
});

test('routes/file_25 mod_25_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(routesFile25.mod_25_0(x), expected(x));
    assert.strictEqual(routesFile25.mod_25_600(x), expected(x));
    assert.strictEqual(routesFile25.mod_25_1199(x), expected(x));
  }
});

test('utils/file_26 mod_26_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(utilsFile26.mod_26_0(x), expected(x));
    assert.strictEqual(utilsFile26.mod_26_600(x), expected(x));
    assert.strictEqual(utilsFile26.mod_26_1199(x), expected(x));
  }
});

test('middleware/file_27 SPECIAL CASE: 705 exports only (mod_27_0..mod_27_704)', () => {
  // Valid indices 0..704: must exist and obey the numerical contract.
  assert.strictEqual(typeof middlewareFile27.mod_27_0, 'function');
  assert.strictEqual(typeof middlewareFile27.mod_27_352, 'function');
  assert.strictEqual(typeof middlewareFile27.mod_27_704, 'function');
  for (const x of INPUTS) {
    assert.strictEqual(middlewareFile27.mod_27_0(x), expected(x));
    assert.strictEqual(middlewareFile27.mod_27_352(x), expected(x));
    assert.strictEqual(middlewareFile27.mod_27_704(x), expected(x));
  }
  // Invalid indices must NOT exist (preserve public symbol surface per AAP §0.7.3).
  assert.strictEqual(middlewareFile27.mod_27_705, undefined);
  assert.strictEqual(middlewareFile27.mod_27_706, undefined);
  assert.strictEqual(middlewareFile27.mod_27_1199, undefined);
  // Total exported symbol count must be exactly 705 (no inventions, no omissions).
  assert.strictEqual(Object.keys(middlewareFile27).length, 705);
});

test('config/file_17 mod_17_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(configFile17.mod_17_0(x), expected(x));
    assert.strictEqual(configFile17.mod_17_600(x), expected(x));
    assert.strictEqual(configFile17.mod_17_1199(x), expected(x));
  }
});

test('repositories/file_18 mod_18_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(repositoriesFile18.mod_18_0(x), expected(x));
    assert.strictEqual(repositoriesFile18.mod_18_600(x), expected(x));
    assert.strictEqual(repositoriesFile18.mod_18_1199(x), expected(x));
  }
});

test('domain/file_19 mod_19_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(domainFile19.mod_19_0(x), expected(x));
    assert.strictEqual(domainFile19.mod_19_600(x), expected(x));
    assert.strictEqual(domainFile19.mod_19_1199(x), expected(x));
  }
});

test('cross-folder consistency (alternative sampling): all façades agree with modCompute(x)', () => {
  for (const x of INPUTS) {
    const ref = modCompute(x);
    assert.strictEqual(controllersFile22.mod_22_0(x), ref);
    assert.strictEqual(servicesFile23.mod_23_0(x), ref);
    assert.strictEqual(modelsFile24.mod_24_0(x), ref);
    assert.strictEqual(routesFile25.mod_25_0(x), ref);
    assert.strictEqual(utilsFile26.mod_26_0(x), ref);
    assert.strictEqual(middlewareFile27.mod_27_0(x), ref);
    assert.strictEqual(configFile17.mod_17_0(x), ref);
    assert.strictEqual(repositoriesFile18.mod_18_0(x), ref);
    assert.strictEqual(domainFile19.mod_19_0(x), ref);
  }
});

test('deduplication (alternative sampling): all sampled façade exports bind to the same modCompute reference', () => {
  assert.strictEqual(controllersFile22.mod_22_0, modCompute);
  assert.strictEqual(servicesFile23.mod_23_0, modCompute);
  assert.strictEqual(modelsFile24.mod_24_0, modCompute);
  assert.strictEqual(routesFile25.mod_25_0, modCompute);
  assert.strictEqual(utilsFile26.mod_26_0, modCompute);
  assert.strictEqual(middlewareFile27.mod_27_0, modCompute);
  assert.strictEqual(middlewareFile27.mod_27_704, modCompute);
  assert.strictEqual(configFile17.mod_17_0, modCompute);
  assert.strictEqual(repositoriesFile18.mod_18_0, modCompute);
  assert.strictEqual(domainFile19.mod_19_0, modCompute);
});

test('golden values (alternative sampling): explicit expected results across façades', () => {
  // Per AAP §0.6.3 numerical-contract regression net.
  assert.strictEqual(controllersFile22.mod_22_0(0), 10);
  assert.strictEqual(servicesFile23.mod_23_600(7), 52);
  assert.strictEqual(modelsFile24.mod_24_1199(-1), 4);
  assert.strictEqual(routesFile25.mod_25_0(1), 16);
  assert.strictEqual(utilsFile26.mod_26_600(1000), 6010);
  assert.strictEqual(middlewareFile27.mod_27_704(-1000), -5990);
  assert.strictEqual(configFile17.mod_17_0(1.5), 19);
  assert.strictEqual(repositoriesFile18.mod_18_1199(7), 52);
  assert.strictEqual(domainFile19.mod_19_0(0), 10);
});
