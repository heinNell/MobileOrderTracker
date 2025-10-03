// Utility functions for converting between PostGIS WKT and Location objects
import type { Location } from "./types";

/**
 * Parse PostGIS WKT string to Location object
 * Format: "SRID=4326;POINT(longitude latitude)"
 */
export function parsePostGISPoint(wkt: string | Location): Location {
  // If already an object, return as-is
  if (typeof wkt === "object" && wkt !== null) {
    return wkt;
  }

  // Parse WKT string
  const match = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);

  if (!match) {
    throw new Error(`Invalid PostGIS POINT format: ${wkt}`);
  }

  return {
    longitude: parseFloat(match[1]),
    latitude: parseFloat(match[2]),
  };
}

/**
 * Convert Location object to PostGIS WKT string
 * Output: "SRID=4326;POINT(longitude latitude)"
 */
export function toPostGISPoint(location: Location): string {
  return `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
}

/**
 * Parse location from various formats
 */
export function parseLocation(value: string | Location | any): Location {
  if (typeof value === "string") {
    return parsePostGISPoint(value);
  }

  if (value && typeof value === "object") {
    // Handle Location object
    if ("latitude" in value && "longitude" in value) {
      return {
        latitude: value.latitude,
        longitude: value.longitude,
      };
    }

    // Handle GeoJSON format
    if (value.type === "Point" && Array.isArray(value.coordinates)) {
      return {
        longitude: value.coordinates[0],
        latitude: value.coordinates[1],
      };
    }
  }

  throw new Error(`Unsupported location format: ${JSON.stringify(value)}`);
}

/**
 * Example usage:
 *
 * // In mobile app or dashboard:
 * const location = parsePostGISPoint(order.loading_point_location);
 * console.log(location.latitude, location.longitude);
 *
 * // When creating order:
 * const wkt = toPostGISPoint({ latitude: -26.2041, longitude: 28.0473 });
 * // Result: "SRID=4326;POINT(28.0473 -26.2041)"
 */
