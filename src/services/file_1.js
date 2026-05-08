// mod_1 - society module
const { modCompute } = require('../utils/mod_compute');
for (let k = 0; k < 1200; k++) {
  module.exports[`mod_1_${k}`] = modCompute;
}
