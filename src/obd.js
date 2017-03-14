var connection = require('./connection');
var PIDS = require('./pids/pid');
var log = require('./log');
var poller_1 = require('./poller');

function init(connectorFn) {
  log('initialising obd-parser');
  // Expose the connection we've been passed
  connection.setConnectorFn(connectorFn);
  // Call this to get a connection error/success now rather than later
  return connection.getConnection()
    .then(onInitialiseSuccess);

  function onInitialiseSuccess() {
    log('initialised successfully');
  }
}

module.exports = {
  init: init,
  ECUPoller: poller_1,
  PIDS: PIDS
};
