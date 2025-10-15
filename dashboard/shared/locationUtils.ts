// Utility functions for converting between PostGIS WKT and Location objects
import type { Location } from "./types";

/**
 * Normalize various WKT inputs by stripping optional SRID prefix.
 * Accepts inputs like:
 * - "SRID=4326;POINT(lng lat)"
 * - "POINT(lng lat)"
 */
function normalizeWkt(input: string): string {
  // Trim and remove SRID prefix if present
  const trimmed = input.trim();
  const semicolonIdx = trimmed.indexOf(";");
  if (semicolonIdx !== -1) {
    // e.g., "SRID=4326;POINT(...)" -> "POINT(...)"
    return trimmed.slice(semicolonIdx + 1);
  }
  return trimmed;
}

/**
 * Parse PostGIS WKT to Location object.
 * Accepts:
 * - string in format "SRID=4326;POINT(longitude latitude)" or "POINT(longitude latitude)"
 * - Location object (returned as-is)
 */
export function parsePostGISPoint(wkt: string | Location): Location {
  // If already a Location-like object, return it (and ensure numeric types)
  if (typeof wkt === "object" && wkt !== null) {
    const maybe = wkt as Partial<Location>;
    if (
      typeof maybe.latitude === "number" &&
      typeof maybe.longitude === "number"
    ) {
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
  // PostGIS POINT format: POINT(longitude latitude)
  const match = normalized.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) {
    throw new Error(`Invalid WKT POINT format: ${wkt}`);
  }

  const longitude = parseFloat(match[1]);
  const latitude = parseFloat(match[2]);

  if (isNaN(longitude) || isNaN(latitude)) {
    throw new Error(`Invalid coordinates in WKT: ${wkt}`);
  }

  return { latitude, longitude };
}

/**
 * Convert Location object to PostGIS WKT format
 */
export function toPostGISPoint(location: Location): string {
  if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    throw new Error("Location must have numeric latitude and longitude");
  }

  if (
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("Invalid GPS coordinates");
  }

  // PostGIS format: POINT(longitude latitude) with SRID prefix
  return `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 6371; // Earth's radius in kilometers

  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(location: Location): string {
  // Check if coordinates exist and are valid numbers
  if (!location || 
      typeof location.latitude !== 'number' || 
      typeof location.longitude !== 'number' ||
      isNaN(location.latitude) || 
      isNaN(location.longitude)) {
    return 'N/A';
  }
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

/**
 * Check if a location is within bounds
 */
export function isLocationWithinBounds(
  location: Location,
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean {
  return (
    location.latitude >= bounds.south &&
    location.latitude <= bounds.north &&
    location.longitude >= bounds.west &&
    location.longitude <= bounds.east
  );
}

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(from: Location, to: Location): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}