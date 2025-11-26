/**
 * Distance Matrix Service - Calculate distance and duration between points
 * Supports multiple providers with automatic fallback to Haversine calculation
 */

interface MatrixPoint {
  lat: number;
  lng: number;
}

export interface MatrixResult {
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  trafficDelay?: number; // Additional delay due to traffic (minutes)
}

export type MatrixProvider = 'ors' | 'osrm' | 'mapbox' | 'haversine';

/**
 * Distance Matrix Service for ETA calculations
 */
export class DistanceMatrixService {
  private apiKey: string;
  private provider: MatrixProvider;
  private cache: Map<string, { result: MatrixResult; timestamp: number }>;
  private cacheDuration: number = 300000; // 5 minutes for real-time data

  constructor(apiKey: string = '', provider: MatrixProvider = 'ors') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.cache = new Map();
  }

  /**
   * Calculate distance and duration between origin and destination
   * Automatically falls back to Haversine if API fails
   */
  async getDistance(
    origin: MatrixPoint,
    destination: MatrixPoint,
    options?: {
      useCache?: boolean;
      trafficAware?: boolean;
    }
  ): Promise<MatrixResult> {
    // Validate coordinates
    if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check cache
    const cacheKey = this.getCacheKey(origin, destination);
    if (options?.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.result;
      }
    }

    try {
      let result: MatrixResult;

      switch (this.provider) {
        case 'ors':
          result = await this.getOrsDistance(origin, destination);
          break;
        case 'osrm':
          result = await this.getOsrmDistance(origin, destination);
          break;
        case 'mapbox':
          result = await this.getMapboxDistance(origin, destination, options?.trafficAware);
          break;
        case 'haversine':
          result = this.getHaversineDistance(origin, destination);
          break;
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error(`Error getting distance from ${this.provider}:`, error);

      // Fallback to Haversine calculation
      if (this.provider !== 'haversine') {
        console.log('Falling back to Haversine distance calculation');
        const result = this.getHaversineDistance(origin, destination);
        return result;
      }

      throw error;
    }
  }

  /**
   * OpenRouteService Matrix API implementation
   */
  private async getOrsDistance(origin: MatrixPoint, destination: MatrixPoint): Promise<MatrixResult> {
    const response = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
        sources: [0],
        destinations: [1],
        metrics: ['distance', 'duration'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORS Matrix API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      distance: data.distances[0][0],
      duration: data.durations[0][0],
    };
  }

  /**
   * OSRM Table Service implementation
   */
  private async getOsrmDistance(origin: MatrixPoint, destination: MatrixPoint): Promise<MatrixResult> {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM Table error: ${data.message || data.code}`);
    }

    // OSRM table service doesn't return distance, so estimate it from duration
    const duration = data.durations[0][0];
    const averageSpeedMps = 16.67; // ~60 km/h in meters per second
    const distance = duration * averageSpeedMps;

    return {
      distance,
      duration,
    };
  }

  /**
   * Mapbox Matrix API implementation (with traffic data)
   */
  private async getMapboxDistance(
    origin: MatrixPoint,
    destination: MatrixPoint,
    trafficAware: boolean = true
  ): Promise<MatrixResult> {
    const profile = trafficAware ? 'driving-traffic' : 'driving';
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${coords}?sources=0&destinations=1&access_token=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.code !== 'Ok') {
      throw new Error(`Mapbox Matrix error: ${data.message || data.code}`);
    }

    // Calculate traffic delay if available
    let trafficDelay = 0;
    if (trafficAware && data.durations_traffic) {
      const normalDuration = data.durations[0][0];
      const trafficDuration = data.durations_traffic[0][0];
      trafficDelay = Math.round((trafficDuration - normalDuration) / 60); // Convert to minutes
    }

    return {
      distance: data.distances[0][0],
      duration: data.durations[0][0],
      trafficDelay: trafficDelay > 0 ? trafficDelay : undefined,
    };
  }

  /**
   * Haversine distance calculation (no API required)
   * This is the fallback method that always works
   */
  private getHaversineDistance(origin: MatrixPoint, destination: MatrixPoint): MatrixResult {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (origin.lat * Math.PI) / 180;
    const φ2 = (destination.lat * Math.PI) / 180;
    const Δφ = ((destination.lat - origin.lat) * Math.PI) / 180;
    const Δλ = ((destination.lng - origin.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters

    // Estimate duration based on average speed
    // Use different speeds based on distance (highway vs city)
    const distanceKm = distance / 1000;
    let averageSpeedKmh = 60; // Default city speed

    if (distanceKm > 50) {
      averageSpeedKmh = 100; // Highway speed
    } else if (distanceKm > 20) {
      averageSpeedKmh = 80; // Suburban speed
    }

    const duration = (distanceKm / averageSpeedKmh) * 3600; // Convert to seconds

    return {
      distance,
      duration,
    };
  }

  /**
   * Batch calculate distances for multiple origins/destinations
   * Useful for optimizing multiple ETA calculations
   */
  async getBatchDistances(
    origins: MatrixPoint[],
    destinations: MatrixPoint[]
  ): Promise<MatrixResult[][]> {
    const results: MatrixResult[][] = [];

    for (const origin of origins) {
      const row: MatrixResult[] = [];
      for (const destination of destinations) {
        try {
          const result = await this.getDistance(origin, destination);
          row.push(result);
        } catch (error) {
          console.error('Error calculating batch distance:', error);
          // Use Haversine as fallback
          row.push(this.getHaversineDistance(origin, destination));
        }
      }
      results.push(row);
    }

    return results;
  }

  /**
   * Validate coordinate is within valid ranges
   */
  private isValidCoordinate(point: MatrixPoint): boolean {
    return (
      point &&
      typeof point.lat === 'number' &&
      typeof point.lng === 'number' &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180 &&
      isFinite(point.lat) &&
      isFinite(point.lng) &&
      !(point.lat === 0 && point.lng === 0)
    );
  }

  /**
   * Generate cache key
   */
  private getCacheKey(origin: MatrixPoint, destination: MatrixPoint): string {
    return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set provider dynamically
   */
  setProvider(provider: MatrixProvider): void {
    this.provider = provider;
  }

  /**
   * Set API key dynamically
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
