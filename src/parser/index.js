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
var R = require('ramda');
var stream_1 = require('stream');
var constants_1 = require('../constants');
var VError = require('verror');
var Promise = require('bluebird');
var pids = require('../pids/index');
var log = require('../log');
var parser;
var OBDStreamParser = (function(_super) {
  __extends(OBDStreamParser, _super);

  function OBDStreamParser() {
    _super.call(this);
    this._buffer = '';
  }
  OBDStreamParser.prototype._flush = function(done) {
    this._buffer = '';
    done();
  };
  OBDStreamParser.prototype._transform = function(input, encoding, done) {
    var data = input.toString('utf8');
    var self = this;
    log('received data %s', data);
    // Remove any linebreaks from input, and add to buffer. We need the double
    // escaped replace due to some data having extra back ticks...wtf
    self._buffer += data;
    log('current buffer: %s', JSON.stringify(self._buffer));
    if (hasPrompt(self._buffer)) {
      // We have a full output from the OBD interface e.g "410C1B56\r\r>"
      log('serial output completed. parsing');
      // Let listeners know that they can start to write again
      self.emit('line-break');
      // The hex lines from the current buffer
      var outputs = extractOutputStrings(self._buffer);
      // Trigger a "data" event for each valid hex output received
      Promise.map(outputs, function(o) {
          return parseObdString(o)
            .then(function(parsed) {
              if (parsed) {
                self.emit('data', parsed);
              }
            })
            .catch(function(err) {
              self.emit('error', err);
            });
        })
        .finally(function() {
          // Reset the buffer since we've successfully parsed it
          self._flush(done);
        });
    } else {
      log('data was not a complete output');
      done();
    }
    return;
  };
  return OBDStreamParser;
}(stream_1.Transform));
/**
 * Determines if the passed buffer/string has a delimeter
 * that indicates it has been completed.
 * @param   {String} data
 * @return  {Boolean}
 */
function hasPrompt(data) {
  // Basically, we check that the a newline has started
  return data.indexOf(constants_1.OBD_OUTPUT_DELIMETER) !== -1;
}
/**
 * Commands can be separated on multiple lines, we need each line separately
 * @param  {String} buffer
 * @return {Array}
 */
function extractOutputStrings(buffer) {
  log('extracting command strings from buffer %s', JSON.stringify(buffer));
  // Extract multiple commands if they exist in the String by replacing
  // linebreaks and splitting on the newline delimeter
  // We replace double backticks. They only seem to occur in a test case
  // but we need to deal with it anyway, just in case...
  var cmds = buffer
    .replace(/\n/g, '')
    .replace(/\\r/g, '\r')
    .split(/\r/g);
  // Remove the new prompt char
  cmds = R.map(function(c) {
    return c
      .replace(constants_1.OBD_OUTPUT_DELIMETER, '')
      .replace(/ /g, '')
      .trim();
  })(cmds);
  // Remove empty commands
  cmds = R.filter(function(c) {
    return !R.isEmpty(c);
  }, cmds);
  log('extracted strings %s from buffer %s', JSON.stringify(cmds), buffer);
  return cmds;
}
/**
 * Determines if an OBD string is parseable by ensuring it's not a
 * generic message output
 * @param  {String}  str
 * @return {Boolean}
 */
function isHex(str) {
  return (str.match(/^[0-9A-F]+$/)) ? true : false;
}
/**
 * Convert the returned bytes into their pairs if possible, or return null
 * @param  {String} str
 * @return {Array|null}
 */
function getByteGroupings(str) {
  log('extracting byte groups from %s', JSON.stringify(str));
  // Remove white space (if any exists) and get byte groups as pairs
  return str.replace(/\ /g, '').match(/.{1,2}/g);
}
/**
 * Parses an OBD output into useful data for developers
 * @param  {String} str
 * @return {Object}
 */
function parseObdString(str) {
  log('parsing command string %s', str);
  var bytes = getByteGroupings(str);
  var ret = {
    ts: new Date(),
    bytes: str,
    value: null,
    pretty: null
  };
  if (!isHex(str)) {
    log('received generic (non hex) string output "%s", not parsing', str);
    return Promise.resolve(ret);
  } else if (bytes && bytes[0] === constants_1.OBD_OUTPUT_MESSAGE_TYPES.MODE_01) {
    log('received valid output "%s" of type "%s", parsing', str, constants_1.OBD_OUTPUT_MESSAGE_TYPES
      .MODE_01);
    var pidCode = bytes[1];
    var pid = pids.getPidByPidCode(pidCode);
    if (pid) {
      log('found match for pid %s', pidCode);
      // We have a class that knows how to deal with this pid output. Parse it!
      ret.pretty = pid.getFormattedValueForBytes(bytes);
      // pass all bytes returned and have the particular PID figure it out
      ret.value = pid.getValueForBytes(bytes.slice(0));
      ret.name = pid.getName();
      ret.pid = pid.getPid();
      return Promise.resolve(ret);
    } else {
      log('no match found for pid %s', pidCode);
      // Emit the data, but just the raw bytes
      return Promise.resolve(ret);
    }
  } else {
    // Wasn't a recognised message type - was probably our own bytes
    // since the serial module outputs those as "data" for some reason
    return Promise.resolve(null);
  }
}
/**
 * Parses realtime type OBD data to a useful format
 * @param  {Array} byteGroups
 * @return {Mixed}
 */
function getValueForPidFromPayload(bytes) {
  log('parsing a realtime command with bytes', bytes.join());
  var pidType = bytes[1];
  return Promise.resolve(bytes)
    .then(function(bytes) {
      return pids.getPidByPidCode(pidType);
    })
    .then(function(pid) {
      if (!pid) {
        // We don't have a class for this PID type so we can't handle it
        return Promise.reject(new VError(
          'failed to find an implementation for PID "%s" in payload "%s"',
          pidType, bytes.join('')));
      }
      // Depending on the payload type we only parse a certain number of bytes
      var bytesToParse = bytes.slice(2, pid.getParseableByteCount());
      // TODO: method overloading vs. apply? TS/JS (-_-)
      return pid.getValueForBytes.apply(pid, bytesToParse);
    });
}

function getParser() {
  if (parser) {
    return parser;
  } else {
    return parser = new OBDStreamParser();
  }
}

module.exports = {
  OBDStreamParser: OBDStreamParser,
  getParser: getParser
};
