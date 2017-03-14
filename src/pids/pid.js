var __extends = (this && this.__extends) || function(d, b) {
  for (var p in b)
    if (b.hasOwnProperty(p)) d[p] = b[p];

  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype,
    new __());
};
var c = require('case');
var assert = require('assert');
var conversions = require('./conversion');
var util_1 = require('util');
var constants_1 = require('../constants');
/**
 * Parses a hexadecimal string to regular base 10
 * @param  {String} byte
 * @return {Number}
 */
function parseHexToDecimal(byte) {
  return parseInt(byte, 16);
}

function leftpad(input, desiredLen) {
  var padding = new Array(desiredLen - input.length + 1);
  return padding.join('0') + input;
}
/**
 * Used to create PID instances that will parse OBD data
 * @constructor
 * @param {Object} opts
 */
var PID = (function() {
  function PID(opts) {
    this.maxRandomValue = 255;
    this.minRandomValue = 0;
    assert(opts.bytes > 0, 'opts.bytes for PID must be above 0');
    // This can be used to identify this PID
    this.constname = c.constant(opts.name);
    // Save these for use
    this.opts = opts;
  }
  PID.prototype.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  PID.prototype.getRandomBytes = function(min, max) {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;
    // ensure random value is int, then convert to hex
    return [this.getRandomInt(min, max).toString(16)];
  };
  PID.prototype.getName = function() {
    return this.opts.name;
  };
  PID.prototype.getPid = function() {
    return this.opts.pid;
  };
  /**
   * Returns the number of bytes that should should be extracted for
   * parsing in a payload of this PID type
   */
  PID.prototype.getParseableByteCount = function() {
    return this.opts.bytes;
  };
  /**
   * Returns a prettier representation of a value that this PID represents, by
   * using the passed "units" value for the PID
   *
   * e.g f(10) => 10%
   * e.g f(55) => 55°C
   *
   * @param  {Number} value
   * @return {String}
   */
  PID.prototype.getFormattedValueForBytes = function(bytes) {
    var val = this.getValueForBytes(bytes);
    if (this.opts.unit) {
      return util_1.format('%s%s', val, this.opts.unit);
    } else {
      return val.toString();
    }
  };
  /**
   * Generates the code that should be written to the ECU for querying this PID
   * Example is "010C" (CURRENT_DATA + "OC") for the engine RPM
   *
   * @return {String}
   */
  PID.prototype.getWriteString = function() {
    return this.opts.mode + this.opts.pid;
  };
  /**
   * The default conversion function for each PID. It will convert a byte value
   * to a number.
   *
   * Many PIDs will override this since more involved conversions are required
   *
   * @return {Number}
   */
  PID.prototype.getValueForBytes = function(bytes) {
    return conversions.parseHexToDecimal(bytes[1]);
  };
  /**
   * Given an input string of bytes, this will return them as pairs
   * e.g AE01CD => ['AE', '01', 'CD']
   */
  PID.prototype.getByteGroupings = function(str) {
    var byteGroups = [];
    for (var i = 0; i < str.length; i += 2) {
      byteGroups.push(str.slice(i, i + 2));
    }
    return byteGroups;
  };
  return PID;
}());

var FuelLevel = (function(_super) {
  __extends(FuelLevel, _super);

  function FuelLevel() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '2F',
      bytes: 1,
      name: 'Fuel Level Input',
      min: 0,
      max: 100,
      unit: '%'
    });
  }
  FuelLevel.prototype.getValueForBytes = function(bytes) {
    return conversions.percentage(bytes[2]);
  };
  return FuelLevel;
}(PID));

var Rpm = (function(_super) {
  __extends(Rpm, _super);

  function Rpm() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0C',
      bytes: 2,
      name: 'Engine RPM',
      min: 0,
      max: 16383.75,
      unit: 'rpm'
    });
  }
  Rpm.prototype.getValueForBytes = function(bytes) {
    var a = parseHexToDecimal(bytes[2]) * 256;
    var b = parseHexToDecimal(bytes[3]);
    return (a + b) / 4;
  };
  Rpm.prototype.getRandomBytes = function() {
    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(0, 255).toString(16),
      this.getRandomInt(0, 255).toString(16)
    ];
  };
  return Rpm;
}(PID));

var CoolantTemp = (function(_super) {
  __extends(CoolantTemp, _super);

  function CoolantTemp() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '05',
      bytes: 1,
      name: 'Engine Coolant Temperature',
      min: -40,
      max: 215,
      unit: '°C'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255; // only a litte too fast...
  }
  CoolantTemp.prototype.getValueForBytes = function(byte) {
    return parseHexToDecimal(byte[2]) - 40;
  };
  return CoolantTemp;
}(PID));

var VehicleSpeed = (function(_super) {
  __extends(VehicleSpeed, _super);

  function VehicleSpeed() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0D',
      bytes: 1,
      name: 'Vehicle Speed',
      min: 0,
      max: 255,
      unit: 'km/h'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  VehicleSpeed.prototype.getValueForBytes = function(bytes) {
    return parseHexToDecimal(bytes[2]);
  };
  return VehicleSpeed;
}(PID));

var CalculatedEngineLoad = (function(_super) {
  __extends(CalculatedEngineLoad, _super);

  function CalculatedEngineLoad() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '04',
      bytes: 1,
      name: 'Calculated Engine Load',
      min: 0,
      max: 100,
      unit: '%'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  CalculatedEngineLoad.prototype.getValueForBytes = function(bytes) {
    return parseHexToDecimal(bytes[2]) / 2.5;
  };
  return CalculatedEngineLoad;
}(PID));

var FuelPressure = (function(_super) {
  __extends(FuelPressure, _super);

  function FuelPressure() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0A',
      bytes: 1,
      name: 'Fuel Pressure',
      min: 0,
      max: 765,
      unit: 'kPa'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  FuelPressure.prototype.getValueForBytes = function(bytes) {
    return parseHexToDecimal(bytes[2]) * 3;
  };
  return FuelPressure;
}(PID));

var IntakeManifoldAbsolutePressure = (function(_super) {
  __extends(IntakeManifoldAbsolutePressure, _super);

  function IntakeManifoldAbsolutePressure() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0B',
      bytes: 1,
      name: 'Intake Manifold Absolute Pressure',
      min: 0,
      max: 255,
      unit: 'kPa'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  IntakeManifoldAbsolutePressure.prototype.getValueForBytes = function(
    bytes) {
    return parseHexToDecimal(bytes[2]);
  };
  return IntakeManifoldAbsolutePressure;
}(PID));

var IntakeAirTemperature = (function(_super) {
  __extends(IntakeAirTemperature, _super);

  function IntakeAirTemperature() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '0F',
      bytes: 1,
      name: 'Intake Air Temperature',
      min: -40,
      max: 215,
      unit: '°C'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  IntakeAirTemperature.prototype.getValueForBytes = function(bytes) {
    return parseHexToDecimal(bytes[2]) - 40;
  };
  return IntakeAirTemperature;
}(PID));

var MafAirFlowRate = (function(_super) {
  __extends(MafAirFlowRate, _super);

  function MafAirFlowRate() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '10',
      bytes: 2,
      name: 'MAF Air Flow Rate',
      min: 0,
      max: 655.35,
      unit: 'grams/sec'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  MafAirFlowRate.prototype.getRandomBytes = function(min, max) {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;
    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  };
  MafAirFlowRate.prototype.getValueForBytes = function(bytes) {
    var a = parseHexToDecimal(bytes[2]);
    var b = parseHexToDecimal(bytes[3]);
    return ((256 * a) + b) / 100;
  };
  return MafAirFlowRate;
}(PID));

var ThrottlePosition = (function(_super) {
  __extends(ThrottlePosition, _super);

  function ThrottlePosition() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '11',
      bytes: 1,
      name: 'Throttle Position',
      min: 0,
      max: 100,
      unit: '%'
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  ThrottlePosition.prototype.getValueForBytes = function(bytes) {
    return (100 / 255) * parseHexToDecimal(bytes[2]);
  };
  return ThrottlePosition;
}(PID));

var ObdStandard = (function(_super) {
  __extends(ObdStandard, _super);

  function ObdStandard() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '1C',
      bytes: 1,
      name: 'OBD Standard',
      min: 0,
      max: 255,
      unit: ''
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 34;
  }
  ObdStandard.prototype.getValueForBytes = function(bytes) {
    var type = parseHexToDecimal(bytes[2]);
    var obdStandards = require('./data/obd-spec-list.json');
    return obdStandards[type] || 'Unknown';
  };
  return ObdStandard;
}(PID));

var FuelSystemStatus = (function(_super) {
  __extends(FuelSystemStatus, _super);

  function FuelSystemStatus() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '03',
      bytes: 2,
      name: 'Fuel System Status',
      min: 0,
      max: 16,
      unit: ''
    });
    this.types = {
      '1': 'Open loop due to insufficient engine temperature',
      '2': 'Closed loop, using oxygen sensor feedback to determine fuel mix',
      '4': 'Open loop due to engine load OR fuel cut due to deceleration',
      '8': 'Open loop due to system failure',
      '16': 'Closed loop, using at least one oxygen sensor but there is a ' +
        'fault in the feedback system'
    };
    this.minRandomValue = 0;
    this.maxRandomValue = 10;
  }
  FuelSystemStatus.prototype.getRandomBytes = function(min, max) {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;
    // ensure random value is int, then convert to hex
    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  };
  FuelSystemStatus.prototype.getValueForBytes = function(bytes) {
    var typeA = parseHexToDecimal(bytes[2]);
    var typeB = parseHexToDecimal(bytes[3]);
    if (typeB) {
      var a = this.types[typeA] || 'Unknown';
      var b = this.types[typeB] || 'Unknown';
      return "System A: " + a + ". System B: " + b;
    } else {
      return this.types[typeA.toString()];
    }
  };
  return FuelSystemStatus;
}(PID));

var SupportedPids = (function(_super) {
  __extends(SupportedPids, _super);

  function SupportedPids() {
    _super.call(this, {
      mode: constants_1.OBD_MESSAGE_TYPES.CURRENT_DATA,
      pid: '20',
      bytes: 4,
      name: 'Supported PIDs',
      unit: ''
    });
    this.minRandomValue = 0;
    this.maxRandomValue = 255;
  }
  SupportedPids.prototype.getRandomBytes = function(min, max) {
    min = min || this.minRandomValue;
    max = max || this.maxRandomValue;
    return [
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16),
      this.getRandomInt(min, max).toString(16)
    ];
  };
  SupportedPids.prototype.getValueForBytes = function(bytes) {
    // Get all bytes after the initial message identifier byte
    var allBytes = bytes.join('').substr(2);
    var supportedPids = [];
    for (var i = 0; i < allBytes.length; i++) {
      // e.g ensures '100' becomes '0100'
      var asBinary = leftpad(parseHexToDecimal(allBytes[i]).toString(2),
        4);
      for (var j = 0; j < asBinary.length; j++) {
        // our offset into the 32 standard pids, e.g if i==2 we start at "09"
        var startIdx = (4 * i) + 1;
        var pid = (startIdx + j).toString(16);
        if (asBinary[j] === '1') {
          // ensure a result such as '8' becomes '08'
          supportedPids.push(leftpad(pid, 2));
        }
      }
    }
    return supportedPids.join(',');
  };
  return SupportedPids;
}(PID));

module.exports = {
  PID: PID,
  FuelLevel: FuelLevel,
  Rpm: Rpm,
  CoolantTemp: CoolantTemp,
  VehicleSpeed: VehicleSpeed,
  CalculatedEngineLoad: CalculatedEngineLoad,
  FuelPressure: FuelPressure,
  IntakeManifoldAbsolutePressure: IntakeManifoldAbsolutePressure,
  IntakeAirTemperature: IntakeAirTemperature,
  MafAirFlowRate: MafAirFlowRate,
  ThrottlePosition: ThrottlePosition,
  ObdStandard: ObdStandard,
  FuelSystemStatus: FuelSystemStatus,
  SupportedPids: SupportedPids
};
