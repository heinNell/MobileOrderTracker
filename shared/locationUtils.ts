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
  const match = normalized.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);

  if (!match || !match[1] || !match[2]) {
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
  // PostGIS expects "POINT(longitude latitude)"
  return `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
}

/**
 * Parse location from various formats:
 * - WKT string ("SRID=4326;POINT(lng lat)" or "POINT(lng lat)")
 * - Location object { latitude, longitude }
 * - GeoJSON { type: "Point", coordinates: [lng, lat] }
 */
export function parseLocation(value: string | Location | any): Location {
  // String -> WKT
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

/* ---------------- Helpers ---------------- */

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
