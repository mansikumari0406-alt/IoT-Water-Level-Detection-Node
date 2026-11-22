// Simulation helper. Replace with verified A121/controller output processing.
export function getSimulatedWaterLevelMm() {
  // A fake reading for software practice; not a real measurement.
  const value = 50 + Math.random() * 850;
  return Math.round(value * 10) / 10;
}

// Water level from a distance reading: sensor mounted above the water, pointing down.
export function waterLevelFromDistance(sensorHeightMm, measuredDistanceMm) {
  return sensorHeightMm - measuredDistanceMm;
}
