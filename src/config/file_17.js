// mod_17 - society module
const { modCompute } = require('../utils/mod_compute');
for (let k = 0; k < 1200; k++) {
  module.exports[`mod_17_${k}`] = modCompute;
}
