var ramda_1 = require('ramda');
var PIDS = require('../pids');
/**
 * Allows us to get a PID instance by matching an output hex code to
 * the code stored in the PID class.
 */
function getPidByPidCode(pidstring) {
  var names = ramda_1.keys(PIDS);
  var pidname = ramda_1.find(function(name) {
    var curpid = PIDS[name];
    return curpid.getPid() === pidstring;
  })(names);
  if (pidname) {
    return PIDS[pidname];
  } else {
    return null;
  }
}

/**
 * Returns a list that describes the supported PIDs.
 * List includes the PID code and name.
 */
function getSupportedPidInfo() {
  return ramda_1.map(function(p) {
    var ret = {
      name: p.getName(),
      pid: p.getPid()
    };
    return ret;
  })(PIDS);
}

module.exports = {
  getSupportedPidInfo: getSupportedPidInfo,
  getPidByPidCode: getPidByPidCode
};
