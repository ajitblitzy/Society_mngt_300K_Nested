// mod_16 - society module
const { modCompute } = require('../utils/mod_compute');
for (let k = 0; k < 1200; k++) {
  module.exports[`mod_16_${k}`] = modCompute;
}
