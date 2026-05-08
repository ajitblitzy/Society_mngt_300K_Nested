// mod_4 - society module
const { modCompute } = require('./mod_compute');
for (let k = 0; k < 1200; k++) {
  module.exports[`mod_4_${k}`] = modCompute;
}
