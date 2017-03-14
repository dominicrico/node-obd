'use strict';
var __extends = (this && this.__extends) || function(d, b) {
  for (var p in b)
    if (b.hasOwnProperty(p)) d[p] = b[p];

  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype,
    new __());
};
var connection_1 = require('../connection');
var events_1 = require('events');
var parser_1 = require('../parser');
var Promise = require('bluebird');
var log = require('../log');
/**
 * Constructor function to create a poller instance.
 *
 * Poller instances will request data from the ECU at a defined refresh rate.
 *
 * @param {Object} opts
 */
var ECUPoller = (function(_super) {
  __extends(ECUPoller, _super);

  function ECUPoller(args) {
    _super.call(this);
    this.args = args;
    this.lastResponseTs = null;
    this.lastPollTs = null;
    this.pollTimer = null;
    this.polling = false;
    this.locked = false;
    log('created poller for %s', args.pid.getName());
  }
  /**
   * We want to get as close to the requested refresh rate as possible.
   * This means if the ECU has a response delay then we account for it.
   *
   * @param  {Number} max         The max delay in between pools
   * @param  {Number} lastPollTs  The time we issued the last poll
   * @return {Number}
   */
  ECUPoller.prototype.getNextPollDelay = function() {
    if (this.lastPollTs) {
      log('getting poll time for %s, using last time of %s vs now %s',
        this.args.pid.getName(), this.lastPollTs, Date.now());
      // A poll has occurred previously. If we're calling this function
      // before the max interval time is reached then we must wait n ms
      // where n is the difference between the max poll rate and last poll sent
      var delta = this.lastResponseTs - this.lastPollTs;
      return delta > this.args.interval ? 0 : this.args.interval - delta;
    } else {
      // No previous poll has occurred yet so fire one right away
      return 0;
    }
  };
  /**
   * Locks this poller to prevent it sending any more messages to the ECU
   * @return {void}
   */
  ECUPoller.prototype.lock = function() {
    this.locked = true;
  };
  /**
   * Unlocks this poller to allow it to send more messages to the ECU
   * @return {void}
   */
  ECUPoller.prototype.unlock = function() {
    this.locked = false;
  };
  /**
   * Returns a boolean, where true indicates this instance is locked
   * @return {boolean}
   */
  ECUPoller.prototype.isLocked = function() {
    return this.locked;
  };
  /**
   * Returns a boolean indicating if the provided OBDOutput is designated
   * for this Poller instance
   * @return {boolean}
   */
  ECUPoller.prototype.isMatchingPayload = function(data) {
    return data.bytes ?
      data.bytes.substr(2, 2) === this.args.pid.getPid() : false;
  };
  /**
   * Polls the ECU for this specifc ECUPoller's PID. Use this if you want to
   * poll on demand rather than on an interval.
   *
   * This method returns a Promise, but you can also bind a handler for the
   * "data" event if that is preferable.
   */
  ECUPoller.prototype.poll = function() {
    var self = this;
    if (self.isLocked()) {
      log('poll was called for poller %s, but it was locked!', self.args.pid
        .getName());
      // Reject the promise with an error
      return Promise.reject(new Error(self.args.pid.getName() +
        ' cannot poll() when isLocked() is true'));
    }
    return new Promise(function(resolve, reject) {
      // Need to prevent sending multiple polls unless we get a response
      self.lock();
      // Generate the bytes to send to our ECU
      var bytesToWrite = self.args.pid.getWriteString();
      // Callback for when "data" is emitted by the OBDStreamParser
      var handler = function(output) {
        if (self.isMatchingPayload(output)) {
          // Remove this listener since it has been called for our probe
          parser_1.getParser().removeListener('data', handler);
          // The emitted event is a match for this poller's PID
          log('parser emitted a data event for pid %s (%s)', self.args
            .pid.getPid(), self.args.pid.getName());
          // Let listeners know we got data
          self.emit('data', output);
          // Track when we got this response
          self.lastResponseTs = Date.now();
          // Polls can be queued since we got a response
          self.unlock();
          // If this poller is polling then queue the next poll
          if (self.polling) {
            self.pollTimer = global.setTimeout(self.poll.bind(self),
              self.getNextPollDelay());
          }
          resolve(output);
        }
      };

      function pollEcu(conn) {
        log('performing poll for %s, command is:', self.args.pid.getName(),
          bytesToWrite);
        // listen for data events sicne we need to watch for
        // this PID in responses
        parser_1.getParser().addListener('data', handler);
        // Track when we fired this poll
        self.lastPollTs = Date.now();
        // Now write our request to the ECU
        conn.write(bytesToWrite);
      }

      function onPollError(err) {
        log('failed to poll for %s', self.args.pid.getName());
        // Remove the listener, could cause nasty side effects if we forget!
        parser_1.getParser().removeListener('data', handler);
        // No longer need to keep this poller locked
        self.unlock();
        self.emit('error', err);
        reject(err);
      }
      connection_1.getConnection()
        .then(pollEcu)
        .catch(onPollError);
    });
  };
  /**
   * Starts this poller polling. This means it will poll at the interval
   * defined in the args, or as close as possible to that
   * @return {void}
   */
  ECUPoller.prototype.startPolling = function() {
    log('start poll interval for %s', this.args.pid.getName());
    if (!this.polling) {
      this.polling = true;
      this.pollTimer = global.setTimeout(this.poll.bind(this), this.getNextPollDelay());
    }
  };
  /**
   * Stops the polling process and cancels any polls about to be queued
   * @return {void}
   */
  ECUPoller.prototype.stopPolling = function() {
    log('cacelling poll interval for %s', this.args.pid.getName());
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  };;
  return ECUPoller;
}(events_1.EventEmitter));

module.exports = ECUPoller;
