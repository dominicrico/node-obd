'use strict';
/**
 * Parses a hexadecimal string to regular base 10
 * @param  {String} byte
 * @return {Number}
 */
function parseHexToDecimal(byte) {
  return parseInt(byte, 16);
}
/**
 * Converts an OBD value to a percentage
 * @param  {String} byte
 * @return {Number}
 */
function percentage(byte) {
  return parseHexToDecimal(byte) * (100 / 255);
}

module.exports = {
  percentage: percentage,
  parseHexToDecimal: parseHexToDecimal
};
