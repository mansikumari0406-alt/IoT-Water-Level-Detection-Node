// Location input helper. Coordinates must come from an approved source
// (for example Google Maps or a GPS module); a laptop has no GPS of its own.
export function validateCoordinates(latitude, longitude) {
  const noLat = latitude === undefined || latitude === null;
  const noLon = longitude === undefined || longitude === null;
  if (noLat && noLon) return [null, null];
  if (noLat || noLon) throw new Error('Provide both latitude and longitude, or neither.');
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Latitude and longitude must be numbers.');
  if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90.');
  if (lon < -180 || lon > 180) throw new Error('Longitude must be between -180 and 180.');
  return [lat, lon];
}
