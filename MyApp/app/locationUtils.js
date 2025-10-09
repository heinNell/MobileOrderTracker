/**
 * Parse PostGIS Point format to coordinates
 * Example: "POINT(longitude latitude)" -> { latitude, longitude }
 */
export function parsePostGISPoint(pointString) {
  if (!pointString || typeof pointString !== 'string') {
    return null;
  }

  // Remove "POINT(" prefix and ")" suffix
  const coords = pointString
    .replace('POINT(', '')
    .replace(')', '')
    .trim()
    .split(' ');

  if (coords.length !== 2) {
    return null;
  }

  const [longitude, latitude] = coords.map(parseFloat);

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

/**
 * Format coordinates to PostGIS Point format
 */
export function toPostGISPoint(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  return `POINT(${longitude} ${latitude})`;
}
