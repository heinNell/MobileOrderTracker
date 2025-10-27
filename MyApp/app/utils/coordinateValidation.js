// Coordinate validation utility
// Place this in app/utils/coordinateValidation.js

/**
 * Validates if coordinates are valid LatLng values
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - True if valid coordinates
 */
export const isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Validates and sanitizes coordinate object
 * @param {Object} coords - Coordinate object with lat/latitude and lng/longitude
 * @returns {Object|null} - Sanitized coordinates or null if invalid
 */
export const validateAndSanitizeCoords = (coords) => {
  if (!coords) return null;

  // Handle different coordinate property names
  const lat = coords.lat || coords.latitude;
  const lng = coords.lng || coords.longitude;

  if (!isValidCoordinate(lat, lng)) {
    console.warn('Invalid coordinates provided:', { lat, lng });
    return null;
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
    latitude: Number(lat),
    longitude: Number(lng)
  };
};

/**
 * Safe map center setter that validates coordinates
 * @param {Object} map - Google Maps instance
 * @param {Object} coords - Coordinates to set as center
 */
export const safeSetMapCenter = (map, coords) => {
  const validCoords = validateAndSanitizeCoords(coords);
  
  if (!validCoords) {
    console.warn('Cannot set map center: Invalid coordinates', coords);
    return false;
  }

  try {
    if (map && typeof map.setCenter === 'function') {
      map.setCenter({ lat: validCoords.lat, lng: validCoords.lng });
      return true;
    }
  } catch (error) {
    console.error('Error setting map center:', error);
    return false;
  }

  return false;
};

/**
 * Default coordinates for fallback (San Francisco)
 */
export const DEFAULT_COORDINATES = {
  lat: 37.7749,
  lng: -122.4194,
  latitude: 37.7749,
  longitude: -122.4194
};