// Integration tests — verify the numerical contract mod_<N>_<K>(x) === 6*x + 10
// across one façade per source folder (controllers, services, models, routes,
// utils, middleware, config, repositories, domain).
const test = require('node:test');
const assert = require('node:assert/strict');

const { modCompute } = require('../../src/utils/mod_compute');
const controllersFile0 = require('../../src/controllers/file_0');
const servicesFile1 = require('../../src/services/file_1');
const modelsFile2 = require('../../src/models/file_2');
const routesFile3 = require('../../src/routes/file_3');
const utilsFile4 = require('../../src/utils/file_4');
const middlewareFile5 = require('../../src/middleware/file_5');
const configFile6 = require('../../src/config/file_6');
const repositoriesFile7 = require('../../src/repositories/file_7');
const domainFile8 = require('../../src/domain/file_8');

const INPUTS = [-1000, -1, 0, 1, 7, 1000, 1.5];
const expected = (x) => 6 * x + 10;

test('controllers/file_0 mod_0_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(controllersFile0.mod_0_0(x), expected(x));
    assert.strictEqual(controllersFile0.mod_0_500(x), expected(x));
    assert.strictEqual(controllersFile0.mod_0_1199(x), expected(x));
  }
});

test('services/file_1 mod_1_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(servicesFile1.mod_1_0(x), expected(x));
    assert.strictEqual(servicesFile1.mod_1_500(x), expected(x));
    assert.strictEqual(servicesFile1.mod_1_1199(x), expected(x));
  }
});

test('models/file_2 mod_2_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(modelsFile2.mod_2_0(x), expected(x));
    assert.strictEqual(modelsFile2.mod_2_500(x), expected(x));
    assert.strictEqual(modelsFile2.mod_2_1199(x), expected(x));
  }
});

test('routes/file_3 mod_3_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(routesFile3.mod_3_0(x), expected(x));
    assert.strictEqual(routesFile3.mod_3_500(x), expected(x));
    assert.strictEqual(routesFile3.mod_3_1199(x), expected(x));
  }
});

test('utils/file_4 mod_4_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(utilsFile4.mod_4_0(x), expected(x));
    assert.strictEqual(utilsFile4.mod_4_500(x), expected(x));
    assert.strictEqual(utilsFile4.mod_4_1199(x), expected(x));
  }
});

test('middleware/file_5 mod_5_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(middlewareFile5.mod_5_0(x), expected(x));
    assert.strictEqual(middlewareFile5.mod_5_500(x), expected(x));
    assert.strictEqual(middlewareFile5.mod_5_1199(x), expected(x));
  }
});

test('config/file_6 mod_6_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(configFile6.mod_6_0(x), expected(x));
    assert.strictEqual(configFile6.mod_6_500(x), expected(x));
    assert.strictEqual(configFile6.mod_6_1199(x), expected(x));
  }
});

test('repositories/file_7 mod_7_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(repositoriesFile7.mod_7_0(x), expected(x));
    assert.strictEqual(repositoriesFile7.mod_7_500(x), expected(x));
    assert.strictEqual(repositoriesFile7.mod_7_1199(x), expected(x));
  }
});

test('domain/file_8 mod_8_<K>(x) === 6*x + 10', () => {
  for (const x of INPUTS) {
    assert.strictEqual(domainFile8.mod_8_0(x), expected(x));
    assert.strictEqual(domainFile8.mod_8_500(x), expected(x));
    assert.strictEqual(domainFile8.mod_8_1199(x), expected(x));
  }
});

test('cross-folder consistency: all façades agree with modCompute(x)', () => {
  for (const x of INPUTS) {
    const ref = modCompute(x);
    assert.strictEqual(controllersFile0.mod_0_0(x), ref);
    assert.strictEqual(servicesFile1.mod_1_0(x), ref);
    assert.strictEqual(modelsFile2.mod_2_0(x), ref);
    assert.strictEqual(routesFile3.mod_3_0(x), ref);
    assert.strictEqual(utilsFile4.mod_4_0(x), ref);
    assert.strictEqual(middlewareFile5.mod_5_0(x), ref);
    assert.strictEqual(configFile6.mod_6_0(x), ref);
    assert.strictEqual(repositoriesFile7.mod_7_0(x), ref);
    assert.strictEqual(domainFile8.mod_8_0(x), ref);
  }
});

test('deduplication: all sampled façade exports bind to the same modCompute reference', () => {
  assert.strictEqual(controllersFile0.mod_0_0, modCompute);
  assert.strictEqual(servicesFile1.mod_1_0, modCompute);
  assert.strictEqual(modelsFile2.mod_2_0, modCompute);
  assert.strictEqual(routesFile3.mod_3_0, modCompute);
  assert.strictEqual(utilsFile4.mod_4_0, modCompute);
  assert.strictEqual(middlewareFile5.mod_5_0, modCompute);
  assert.strictEqual(configFile6.mod_6_0, modCompute);
  assert.strictEqual(repositoriesFile7.mod_7_0, modCompute);
  assert.strictEqual(domainFile8.mod_8_0, modCompute);
});

test('golden values: modCompute(x) and façades produce explicit expected results', () => {
  // Per AAP §0.6.3 numerical-contract regression net.
  assert.strictEqual(modCompute(0), 10);
  assert.strictEqual(modCompute(7), 52);
  assert.strictEqual(modCompute(-1), 4);
  assert.strictEqual(modCompute(1), 16);
  assert.strictEqual(modCompute(1000), 6010);
  assert.strictEqual(modCompute(-1000), -5990);
  assert.strictEqual(modCompute(1.5), 19);

  // Spot-check the façades against the same golden values.
  assert.strictEqual(controllersFile0.mod_0_0(0), 10);
  assert.strictEqual(servicesFile1.mod_1_0(7), 52);
  assert.strictEqual(modelsFile2.mod_2_0(-1), 4);
  assert.strictEqual(routesFile3.mod_3_0(1), 16);
  assert.strictEqual(utilsFile4.mod_4_0(1000), 6010);
  assert.strictEqual(middlewareFile5.mod_5_0(-1000), -5990);
  assert.strictEqual(configFile6.mod_6_0(1.5), 19);
  assert.strictEqual(repositoriesFile7.mod_7_0(7), 52);
  assert.strictEqual(domainFile8.mod_8_0(0), 10);
});
