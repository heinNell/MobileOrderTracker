/**
 * Directions Service - Routing API abstraction layer
 * Supports multiple providers: OpenRouteService, OSRM, Mapbox
 * Provides consistent interface regardless of backend provider
 */

interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  path: [number, number][]; // Array of [lat, lng] tuples for Leaflet
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  instructions?: RouteInstruction[];
  bbox?: [number, number, number, number]; // Bounding box [minLat, minLng, maxLat, maxLng]
}

export interface RouteInstruction {
  distance: number;
  duration: number;
  text: string;
  type: string;
}

export type RouteProvider = 'ors' | 'osrm' | 'mapbox';

/**
 * Main Directions Service class
 * Handles route calculation from multiple providers with automatic fallback
 */
export class DirectionsService {
  private apiKey: string;
  private provider: RouteProvider;
  private cache: Map<string, { result: RouteResult; timestamp: number }>;
  private cacheDuration: number = 1800000; // 30 minutes in milliseconds

  constructor(apiKey: string = '', provider: RouteProvider = 'ors') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.cache = new Map();
  }

  /**
   * Get route between origin and destination
   * Automatically uses cache when available
   */
  async getRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    options?: {
      alternatives?: boolean;
      avoidTolls?: boolean;
      useCache?: boolean;
    }
  ): Promise<RouteResult> {
    // Validate coordinates
    if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check cache
    const cacheKey = this.getCacheKey(origin, destination);
    if (options?.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log('Using cached route');
        return cached.result;
      }
    }

    try {
      let result: RouteResult;

      switch (this.provider) {
        case 'ors':
          result = await this.getOrsRoute(origin, destination, options);
          break;
        case 'osrm':
          result = await this.getOsrmRoute(origin, destination);
          break;
        case 'mapbox':
          result = await this.getMapboxRoute(origin, destination, options);
          break;
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error(`Error getting route from ${this.provider}:`, error);

      // Try fallback to OSRM if primary provider fails
      if (this.provider !== 'osrm') {
        console.log('Falling back to OSRM');
        try {
          const result = await this.getOsrmRoute(origin, destination);
          this.cache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        } catch (fallbackError) {
          console.error('Fallback to OSRM also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * OpenRouteService implementation
   */
  private async getOrsRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    options?: { alternatives?: boolean; avoidTolls?: boolean }
  ): Promise<RouteResult> {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
        format: 'geojson',
        instructions: true,
        preference: options?.avoidTolls ? 'recommended' : 'fastest',
        alternative_routes: options?.alternatives
          ? { target_count: 2, weight_factor: 1.4 }
          : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORS API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const route = data.features[0];
    const coords = route.geometry.coordinates;
    const summary = route.properties.summary;

    // Convert instructions if available
    const instructions: RouteInstruction[] = route.properties.segments?.[0]?.steps?.map(
      (step: any) => ({
        distance: step.distance,
        duration: step.duration,
        text: step.instruction,
        type: step.type,
      })
    ) || [];

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distance: summary.distance,
      duration: summary.duration,
      instructions,
      bbox: data.bbox
        ? [data.bbox[1], data.bbox[0], data.bbox[3], data.bbox[2]]
        : undefined,
    };
  }

  /**
   * OSRM implementation (free, no API key required)
   */
  private async getOsrmRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM error: ${data.message || data.code}`);
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates;

    // Convert OSRM steps to instructions
    const instructions: RouteInstruction[] = route.legs[0].steps.map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      text: step.maneuver?.instruction || '',
      type: step.maneuver?.type || 'unknown',
    }));

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distance: route.distance,
      duration: route.duration,
      instructions,
    };
  }

  /**
   * Mapbox implementation (requires API token)
   */
  private async getMapboxRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    options?: { alternatives?: boolean; avoidTolls?: boolean }
  ): Promise<RouteResult> {
    const params = new URLSearchParams({
      geometries: 'geojson',
      steps: 'true',
      access_token: this.apiKey,
    });

    if (options?.alternatives) {
      params.append('alternatives', 'true');
    }

    if (options?.avoidTolls) {
      params.append('exclude', 'toll');
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?${params}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.code !== 'Ok') {
      throw new Error(`Mapbox error: ${data.message || data.code}`);
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates;

    // Convert Mapbox steps to instructions
    const instructions: RouteInstruction[] = route.legs[0].steps.map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      text: step.maneuver?.instruction || '',
      type: step.maneuver?.type || 'unknown',
    }));

    return {
      path: coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distance: route.distance,
      duration: route.duration,
      instructions,
    };
  }

  /**
   * Validate coordinate is within valid ranges
   */
  private isValidCoordinate(point: RoutePoint): boolean {
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
   * Generate cache key for route
   */
  private getCacheKey(origin: RoutePoint, destination: RoutePoint): string {
    return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  }

  /**
   * Clear the route cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set provider dynamically
   */
  setProvider(provider: RouteProvider): void {
    this.provider = provider;
  }

  /**
   * Set API key dynamically
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}
