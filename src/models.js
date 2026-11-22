// Data model for a processed sensor reading.
export function createReading(waterLevelMm, latitude = null, longitude = null, source = 'simulation') {
  return {
    water_level_mm: waterLevelMm,
    latitude,
    longitude,
    source,
    timestamp: new Date().toISOString(),
  };
}
