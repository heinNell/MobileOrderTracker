// Utility functions for converting between PostGIS WKT and Location objects
import { Location } from "./types";

/**
 * Normalize various WKT inputs by stripping optional SRID prefix.
 * Accepts inputs like:
 * - "SRID=4326;POINT(lng lat)"
 * - "POINT(lng lat)"
 */
function normalizeWkt(input: string): string {
  const trimmed = input.trim();
  const semicolonIdx = trimmed.indexOf(";");
  return semicolonIdx !== -1 ? trimmed.slice(semicolonIdx + 1) : trimmed;
}

/**
 * Parse PostGIS WKT to Location object.
 * Accepts:
 * - string in format "SRID=4326;POINT(longitude latitude)" or "POINT(longitude latitude)"
 * - Location object (returned as-is with validation)
 */
export function parsePostGISPoint(wkt: string | Location): Location {
  // If already a Location-like object, validate and return it
  if (typeof wkt === "object" && wkt !== null) {
    const maybe = wkt as Partial<Location>;
    if (
      typeof maybe.latitude === "number" &&
      typeof maybe.longitude === "number"
    ) {
      if (!isValidLatLng(maybe.latitude, maybe.longitude)) {
        throw new Error(
          `Coordinates out of range (lat -90..90, lng -180..180): lat=${maybe.latitude}, lng=${maybe.longitude}`
        );
      }
      return { latitude: maybe.latitude, longitude: maybe.longitude };
    }
    throw new Error(
      "Invalid Location object: latitude/longitude must be numbers"
    );
  }

  // Handle string input
  if (typeof wkt !== "string") {
    throw new Error(
      `Unsupported input type for parsePostGISPoint: ${typeof wkt}`
    );
  }

  const normalized = normalizeWkt(wkt);
  // Enhanced regex to handle scientific notation and more flexible whitespace
  const match = normalized.match(/POINT\s*\(\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*\)/i);

  if (!match) {
    throw new Error(`Invalid PostGIS POINT format: ${wkt}`);
  }

  const longitude = parseFloat(match[1]);
  const latitude = parseFloat(match[2]);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(`Invalid numeric coordinates in WKT: ${wkt}`);
  }
  if (!isValidLatLng(latitude, longitude)) {
    throw new Error(
      `Coordinates out of range (lat -90..90, lng -180..180): lat=${latitude}, lng=${longitude}`
    );
  }

  return { latitude, longitude };
}

/**
 * Convert Location object to PostGIS WKT string.
 * Output: "SRID=4326;POINT(longitude latitude)"
 */
export function toPostGISPoint(location: Location): string {
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    throw new Error("Invalid Location: latitude and longitude must be numbers");
  }
  if (!isValidLatLng(location.latitude, location.longitude)) {
    throw new Error(
      `Coordinates out of range (lat -90..90, lng -180..180): lat=${location.latitude}, lng=${location.longitude}`
    );
  }
  // Format with reasonable precision (6 decimal places ≈ 0.1m accuracy)
  const lng = Number(location.longitude.toFixed(6));
  const lat = Number(location.latitude.toFixed(6));
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/**
 * Parse location from various formats:
 * - WKT string ("SRID=4326;POINT(lng lat)" or "POINT(lng lat)")
 * - Location object { latitude, longitude }
 * - GeoJSON { type: "Point", coordinates: [lng, lat] }
 */
export function parseLocation(value: string | Location | any): Location {
  if (typeof value === "string") {
    return parsePostGISPoint(value);
  }

  if (value && typeof value === "object") {
    // Location object
    if ("latitude" in value && "longitude" in value) {
      const lat = value.latitude;
      const lng = value.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error(
          "Invalid Location object: latitude/longitude must be numbers"
        );
      }
      if (!isValidLatLng(lat, lng)) {
        throw new Error(
          `Coordinates out of range (lat -90..90, lng -180..180): lat=${lat}, lng=${lng}`
        );
      }
      return { latitude: lat, longitude: lng };
    }

    // GeoJSON Point
    if (value.type === "Point" && Array.isArray(value.coordinates)) {
      if (value.coordinates.length < 2) {
        throw new Error("Invalid GeoJSON: coordinates array must have at least 2 elements");
      }
      const [lng, lat] = value.coordinates;
      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error("Invalid GeoJSON: coordinates must be numbers");
      }
      if (!isValidLatLng(lat, lng)) {
        throw new Error(
          `Coordinates out of range (lat -90..90, lng -180..180): lat=${lat}, lng=${lng}`
        );
      }
      return { latitude: lat, longitude: lng };
    }
  }

  throw new Error(`Unsupported location format: ${safeStringify(value)}`);
}

/**
 * Calculate distance between two locations using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(loc2.latitude - loc1.latitude);
  const dLon = toRadians(loc2.longitude - loc1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.latitude)) *
      Math.cos(toRadians(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within a circular geofence
 */
export function isWithinGeofence(
  location: Location,
  center: Location,
  radiusKm: number
): boolean {
  return calculateDistance(location, center) <= radiusKm;
}

/**
 * Calculate bearing (direction) from one location to another
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(from: Location, to: Location): number {
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
}

/**
 * Validate if coordinates are within South Africa bounds (approximate)
 */
export function isWithinSouthAfrica(location: Location): boolean {
  const { latitude, longitude } = location;
  // Approximate bounds for South Africa
  return (
    latitude >= -35.0 && latitude <= -22.0 &&
    longitude >= 16.0 && longitude <= 33.0
  );
}

/* ---------------- Helpers ---------------- */

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
