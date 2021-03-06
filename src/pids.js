var PIDS = require('./pids/pid');
module.exports = {
  FuelLevel: new PIDS.FuelLevel(),
  Rpm: new PIDS.Rpm(),
  CoolantTemp: new PIDS.CoolantTemp(),
  VehicleSpeed: new PIDS.VehicleSpeed(),
  CalculatedEngineLoad: new PIDS.CalculatedEngineLoad(),
  FuelPressure: new PIDS.FuelPressure(),
  IntakeManifoldAbsolutePressure: new PIDS.IntakeManifoldAbsolutePressure(),
  IntakeAirTemperature: new PIDS.IntakeAirTemperature(),
  MafAirFlowRate: new PIDS.MafAirFlowRate(),
  ThrottlePosition: new PIDS.ThrottlePosition(),
  ObdStandard: new PIDS.ObdStandard(),
  FuelSystemStatus: new PIDS.FuelSystemStatus(),
  SupportedPids: new PIDS.SupportedPids()
};
