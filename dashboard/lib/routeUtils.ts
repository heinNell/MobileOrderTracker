/**
 * lib/routeUtils.ts
 * 
 * Comprehensive route calculation and ETA system with optimizations:
 * - Distance caching for performance
 * - Real-time speed trending
 * - Confidence-based ETA calculations
 * - Sequential route progress matching
 * - Memory-efficient implementations
 */

/**
 * Type Definitions
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface LocationHistory {
  point: LatLngLiteral;
  timestamp: Date;
  speed: number; // km/h
  distance?: number; // distance traveled since last point
}

export interface RouteMetrics {
  totalDistance: number;
  completedDistance: number;
  remainingDistance: number;
  progressPercentage: number;
  averageSpeed: number;
}

export interface ProgressMatch {
  matchedIndex: number;
  matchedDistance: number;
  confidence: number;
  isOnRoute: boolean;
  distanceFromRoute: number;
}

export interface ETAData {
  estimatedArrivalTime: Date;
  estimatedDurationMinutes: number;
  currentSpeed: number;
  averageSpeed: number;
  speedTrend: "increasing" | "decreasing" | "stable";
  confidence: "high" | "medium" | "low";
  lastUpdated: Date;
  speedHistory: number[];
  onRoute: boolean;
}

export interface EnhancedRouteData {
  completedPath: LatLngLiteral[];
  remainingPath: LatLngLiteral[];
  plannedRoute: LatLngLiteral[];
  currentPosition: LatLngLiteral;
  progressPercentage: number;
  routeAccuracy: "high" | "medium" | "low" | "off_route" | "pending";
  distanceMetrics: RouteMetrics;
  eta: ETAData | null;
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Parse PostGIS point format to LatLngLiteral
 * Handles: "POINT(lng lat)", "SRID=4326;POINT(lng lat)", or location objects
 */
export function parsePostGISPoint(
  input: string | { latitude: number; longitude: number } | { lat: number; lng: number }
): LatLngLiteral {
  if (typeof input === "object" && input !== null) {
    const maybeAny = input as any;
    if (typeof maybeAny.lat === "number" && typeof maybeAny.lng === "number") {
      return { lat: maybeAny.lat, lng: maybeAny.lng };
    }
    if (typeof maybeAny.latitude === "number" && typeof maybeAny.longitude === "number") {
      return { lat: maybeAny.latitude, lng: maybeAny.longitude };
    }
  }

  if (typeof input === "string") {
    // Remove SRID prefix if present
    let normalized = input.trim();
    const semicolonIdx = normalized.indexOf(";");
    if (semicolonIdx !== -1) {
      normalized = normalized.slice(semicolonIdx + 1);
    }

    // Parse POINT format
    const match = normalized.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { lat, lng };
      }
    }

    // Try comma-separated format
    if (input.includes(",")) {
      const parts = input.split(",");
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  console.warn("Failed to parse location:", input);
  return { lat: 0, lng: 0 };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistanceBetweenPoints(
  point1: LatLngLiteral,
  point2: LatLngLiteral
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lng - point1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate cache key for distance calculations
 */
function getCacheKey(p1: LatLngLiteral, p2: LatLngLiteral): string {
  return `${p1.lat.toFixed(5)},${p1.lng.toFixed(5)}-${p2.lat.toFixed(5)},${p2.lng.toFixed(5)}`;
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(point: LatLngLiteral): boolean {
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    !isNaN(point.lat) &&
    !isNaN(point.lng) &&
    point.lat !== 0 &&
    point.lng !== 0 &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

/**
 * CLASS: RouteProgressCalculator
 * Optimized calculations with caching for performance
 */
export class RouteProgressCalculator {
  private distanceCache = new Map<string, number>();
  private readonly CACHE_SIZE_LIMIT = 1000;
  private readonly DISTANCE_THRESHOLD_KM = 0.5; // 500 meters

  /**
   * Clear all cached distances (call on component unmount)
   */
  clearCache(): void {
    this.distanceCache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.distanceCache.size;
  }

  /**
   * Internal: Get cached or calculate distance
   */
  private getCachedDistance(point1: LatLngLiteral, point2: LatLngLiteral): number {
    const key = getCacheKey(point1, point2);

    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }

    const distance = calculateDistanceBetweenPoints(point1, point2);

    // Prevent unbounded memory growth
    if (this.distanceCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.distanceCache.keys().next().value;
      this.distanceCache.delete(firstKey);
    }

    this.distanceCache.set(key, distance);
    return distance;
  }

  /**
   * Calculate cumulative distance along a path
   */
  calculatePathDistance(path: LatLngLiteral[]): number {
    if (path.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      totalDistance += this.getCachedDistance(path[i - 1], path[i]);
    }
    return totalDistance;
  }

  /**
   * Find driver progress on planned route using sequential matching
   * Returns position index on planned route, matched distance, and confidence
   */
  findProgressOnRoute(
    currentPosition: LatLngLiteral,
    actualRoute: LatLngLiteral[],
    plannedRoute: LatLngLiteral[]
  ): ProgressMatch {
    let bestMatchedIndex = 0;
    let bestConfidence = 0;
    let bestDistance = 0;
    let bestDistanceFromRoute = Infinity;

    // Empty routes
    if (actualRoute.length === 0 || plannedRoute.length === 0) {
      return {
        matchedIndex: 0,
        matchedDistance: 0,
        confidence: 0,
        isOnRoute: false,
        distanceFromRoute: Infinity,
      };
    }

    // Search actual route from end to beginning (most recent first)
    for (let i = actualRoute.length - 1; i >= 0; i--) {
      const actualPoint = actualRoute[i];
      let closestPlannedIndex = 0;
      let closestDistance = Infinity;

      // Find closest point on planned route
      for (let j = 0; j < plannedRoute.length; j++) {
        const distance = this.getCachedDistance(actualPoint, plannedRoute[j]);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlannedIndex = j;
        }

        // Early exit for exact match
        if (closestDistance < 0.05) break;
      }

      // Check if within route threshold
      if (closestDistance <= this.DISTANCE_THRESHOLD_KM) {
        const confidence = Math.max(0, 1 - closestDistance / this.DISTANCE_THRESHOLD_KM);

        // Prefer further progress along planned route
        if (closestPlannedIndex > bestMatchedIndex || confidence > bestConfidence) {
          bestMatchedIndex = closestPlannedIndex;
          bestConfidence = confidence;
          bestDistanceFromRoute = closestDistance;
          bestDistance = this.calculatePathDistance(plannedRoute.slice(0, closestPlannedIndex + 1));
        }
      }

      // Exit early if we found high confidence match
      if (bestConfidence > 0.9) break;
    }

    const isOnRoute = bestConfidence > 0.3;

    return {
      matchedIndex: bestMatchedIndex,
      matchedDistance: bestDistance,
      confidence: bestConfidence,
      isOnRoute,
      distanceFromRoute: bestDistanceFromRoute,
    };
  }

  /**
   * Calculate complete route metrics
   */
  calculateRouteMetrics(
    actualRoute: LatLngLiteral[],
    plannedRoute: LatLngLiteral[],
    currentPosition: LatLngLiteral
  ): RouteMetrics {
    const totalDistance = this.calculatePathDistance(plannedRoute);
    const { matchedDistance } = this.findProgressOnRoute(currentPosition, actualRoute, plannedRoute);
    const completedDistance = matchedDistance;
    const remainingDistance = Math.max(0, totalDistance - completedDistance);

    // Calculate average speed from actual route
    let averageSpeed = 0;
    if (actualRoute.length >= 2) {
      const firstPoint = actualRoute[0];
      const lastPoint = actualRoute[actualRoute.length - 1];
      const pathDistance = this.calculatePathDistance(actualRoute);
      averageSpeed = pathDistance > 0 ? pathDistance : 0;
    }

    return {
      totalDistance,
      completedDistance,
      remainingDistance,
      progressPercentage: totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0,
      averageSpeed,
    };
  }
}

/**
 * CLASS: ETACalculator
 * Real-time ETA with speed trending and confidence scoring
 */
export class ETACalculator {
  private locationHistory: LocationHistory[] = [];
  private readonly MAX_HISTORY_SIZE = 50;
  private readonly MIN_SPEED_SAMPLES = 5;
  private readonly STOPPED_THRESHOLD_KMH = 1; // Speed below this = stopped

  /**
   * Add location update and calculate current speed
   */
  addLocationUpdate(
    point: LatLngLiteral,
    previousPoint: LatLngLiteral | null,
    timestamp: Date
  ): void {
    let speed = 0;
    let distance = 0;

    if (previousPoint && this.locationHistory.length > 0) {
      const lastUpdate = this.locationHistory[this.locationHistory.length - 1];
      distance = calculateDistanceBetweenPoints(previousPoint, point);
      const timeElapsedHours = (timestamp.getTime() - lastUpdate.timestamp.getTime()) / (1000 * 60 * 60);

      if (timeElapsedHours > 0) {
        speed = distance / timeElapsedHours;
      }
    }

    // Ignore unrealistic speeds (likely GPS errors)
    if (speed > 300) {
      console.warn("Ignoring unrealistic speed:", speed, "km/h");
      speed = 0;
    }

    this.locationHistory.push({
      point,
      timestamp,
      speed: Math.max(0, speed),
      distance: distance || undefined,
    });

    // Trim history to prevent memory issues
    if (this.locationHistory.length > this.MAX_HISTORY_SIZE) {
      this.locationHistory.shift();
    }
  }

  /**
   * Get current speed from most recent valid reading
   */
  getCurrentSpeed(): number {
    if (this.locationHistory.length === 0) return 0;

    for (let i = this.locationHistory.length - 1; i >= 0; i--) {
      if (this.locationHistory[i].speed > 0) {
        return this.locationHistory[i].speed;
      }
    }

    return 0;
  }

  /**
   * Get average speed over specified time window
   */
  getAverageSpeed(timeWindowMinutes: number = 15): number {
    if (this.locationHistory.length < 2) return 0;

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const relevantUpdates = this.locationHistory.filter((h) => h.timestamp > cutoffTime);

    if (relevantUpdates.length === 0) return 0;

    const totalSpeed = relevantUpdates.reduce((sum, h) => sum + h.speed, 0);
    return totalSpeed / relevantUpdates.length;
  }

  /**
   * Detect speed trend (accelerating, decelerating, or stable)
   */
  getSpeedTrend(): "increasing" | "decreasing" | "stable" {
    if (this.locationHistory.length < this.MIN_SPEED_SAMPLES) {
      return "stable";
    }

    const recentSpeeds = this.locationHistory
      .slice(-this.MIN_SPEED_SAMPLES)
      .map((h) => h.speed);
    
    const midPoint = Math.floor(recentSpeeds.length / 2);
    const firstHalf = recentSpeeds.slice(0, midPoint);
    const secondHalf = recentSpeeds.slice(midPoint);

    if (firstHalf.length === 0 || secondHalf.length === 0) {
      return "stable";
    }

    const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = avgSecondHalf - avgFirstHalf;
    const threshold = 2; // km/h change threshold

    if (change > threshold) return "increasing";
    if (change < -threshold) return "decreasing";
    return "stable";
  }

  /**
   * Get recent speed history (last N values)
   */
  getSpeedHistory(count: number = 10): number[] {
    return this.locationHistory
      .slice(-count)
      .map((h) => Math.round(h.speed * 10) / 10);
  }

  /**
   * Calculate confidence score for ETA
   */
  calculateConfidence(
    isOnRoute: boolean,
    currentSpeed: number,
    remainingDistance: number,
    totalDistance: number
  ): "high" | "medium" | "low" {
    // Off-route = low confidence
    if (!isOnRoute) return "low";

    // Stopped/very slow = low confidence
    if (currentSpeed < this.STOPPED_THRESHOLD_KMH) return "low";

    // Sufficient data and moderate speed = medium
    if (this.locationHistory.length < this.MIN_SPEED_SAMPLES * 2) return "medium";

    // Good data, good speed, reasonable distance = high
    if (currentSpeed > 20 && remainingDistance > 10) return "high";

    // Edge cases = medium
    return "medium";
  }

  /**
   * Calculate real-time ETA with confidence scoring
   */
  calculateETA(
    remainingDistance: number,
    totalDistance: number,
    isOnRoute: boolean
  ): ETAData {
    const currentSpeed = this.getCurrentSpeed();
    const averageSpeed = this.getAverageSpeed(15);
    const speedTrend = this.getSpeedTrend();
    const speedHistory = this.getSpeedHistory();

    // Determine effective speed for calculation
    let effectiveSpeed = currentSpeed > 0 ? currentSpeed : averageSpeed;

    // If still no speed data, use conservative default
    if (effectiveSpeed < 1) {
      effectiveSpeed = 30; // 30 km/h default
    }

    // Calculate base ETA
    let estimatedDurationMinutes = (remainingDistance / effectiveSpeed) * 60;

    // Adjust ETA based on speed trend
    if (speedTrend === "decreasing" && isOnRoute) {
      estimatedDurationMinutes *= 1.1; // 10% buffer for slowing
    } else if (speedTrend === "increasing" && isOnRoute) {
      estimatedDurationMinutes *= 0.95; // 5% reduction for accelerating
    }

    // Cap ETA at reasonable maximum
    const MAX_ETA_MINUTES = 480; // 8 hours
    estimatedDurationMinutes = Math.min(estimatedDurationMinutes, MAX_ETA_MINUTES);

    // Ensure minimum ETA
    const MIN_ETA_MINUTES = 1;
    estimatedDurationMinutes = Math.max(estimatedDurationMinutes, MIN_ETA_MINUTES);

    const estimatedArrivalTime = new Date(Date.now() + estimatedDurationMinutes * 60 * 1000);
    const confidence = this.calculateConfidence(isOnRoute, currentSpeed, remainingDistance, totalDistance);

    return {
      estimatedArrivalTime,
      estimatedDurationMinutes: Math.round(estimatedDurationMinutes),
      currentSpeed: Math.round(currentSpeed * 10) / 10,
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      speedTrend,
      confidence,
      lastUpdated: new Date(),
      speedHistory,
      onRoute: isOnRoute,
    };
  }

  /**
   * Clear all history (call on component unmount)
   */
  clearHistory(): void {
    this.locationHistory = [];
  }

  /**
   * Get history size for debugging
   */
  getHistorySize(): number {
    return this.locationHistory.length;
  }
}

/**
 * CONVENIENCE FUNCTION: Create enhanced route data with all calculations
 * Use this as the single entry point for route visualization
 */
export function createEnhancedRouteData(
  orderId: string,
  actualRoute: LatLngLiteral[],
  plannedRoute: LatLngLiteral[],
  currentPosition: LatLngLiteral,
  routeCalculator: RouteProgressCalculator,
  etaCalculator: ETACalculator
): EnhancedRouteData | null {
  try {
    // Validate input
    if (!isValidCoordinate(currentPosition)) {
      console.warn(`Invalid current position for order ${orderId}:`, currentPosition);
      return null;
    }

    // Handle case with no actual route yet
    if (actualRoute.length === 0) {
      if (plannedRoute.length > 1) {
        return {
          completedPath: [],
          remainingPath: plannedRoute,
          plannedRoute,
          currentPosition: plannedRoute[0],
          progressPercentage: 0,
          routeAccuracy: "pending",
          distanceMetrics: {
            totalDistance: routeCalculator.calculatePathDistance(plannedRoute),
            completedDistance: 0,
            remainingDistance: routeCalculator.calculatePathDistance(plannedRoute),
            progressPercentage: 0,
            averageSpeed: 0,
          },
          eta: null,
        };
      }
      return null;
    }

    // Calculate progress
    const progress = routeCalculator.findProgressOnRoute(currentPosition, actualRoute, plannedRoute);
    const metrics = routeCalculator.calculateRouteMetrics(actualRoute, plannedRoute, currentPosition);

    // Calculate ETA
    const eta = etaCalculator.calculateETA(metrics.remainingDistance, metrics.totalDistance, progress.isOnRoute);

    // Build completed path
    const completedPath = actualRoute;

    // Build remaining path
    let remainingPath: LatLngLiteral[] = [];
    if (plannedRoute.length > 1 && progress.isOnRoute) {
      remainingPath = [currentPosition, ...plannedRoute.slice(progress.matchedIndex + 1)];
      if (remainingPath.length === 1 && plannedRoute.length > 0) {
        remainingPath.push(plannedRoute[plannedRoute.length - 1]);
      }
    } else if (plannedRoute.length > 0) {
      // Fallback: direct line to destination
      remainingPath = [currentPosition, plannedRoute[plannedRoute.length - 1]];
    } else {
      remainingPath = [currentPosition];
    }

    // Determine route accuracy
    let routeAccuracy: "high" | "medium" | "low" | "off_route" | "pending" = "pending";
    if (progress.isOnRoute) {
      if (progress.confidence > 0.8) routeAccuracy = "high";
      else if (progress.confidence > 0.5) routeAccuracy = "medium";
      else routeAccuracy = "low";
    } else {
      routeAccuracy = "off_route";
    }

    return {
      completedPath,
      remainingPath,
      plannedRoute,
      currentPosition,
      progressPercentage: metrics.progressPercentage,
      routeAccuracy,
      distanceMetrics: metrics,
      eta,
    };
  } catch (error) {
    console.error(`Error creating enhanced route data for order ${orderId}:`, error);
    return null;
  }
}

/**
 * FORMATTING UTILITIES
 */

export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} min`;
}

export function formatDistance(km: number): string {
  if (!km || km < 0) return "0 m";

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatTime(timestamp: string | Date): string {
  if (!timestamp) return "N/A";

  try {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting time:", error);
    return "N/A";
  }
}

export function formatSpeed(kmh: number): string {
  if (!kmh || kmh < 0) return "0 km/h";
  return `${Math.round(kmh * 10) / 10} km/h`;
}

/**
 * STATUS HELPER
 */

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-gray-500",
    assigned: "bg-blue-500",
    activated: "bg-green-500",
    in_progress: "bg-indigo-500",
    in_transit: "bg-purple-500",
    arrived: "bg-green-500",
    loading: "bg-yellow-500",
    loaded: "bg-green-500",
    unloading: "bg-yellow-500",
    completed: "bg-emerald-600",
    cancelled: "bg-red-500",
  };
  return colors[status.toLowerCase()] || "bg-gray-500";
}