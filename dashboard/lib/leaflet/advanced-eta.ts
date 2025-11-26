// lib/AdvancedETACalculator.ts

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: Date | string | number;
}

interface SpeedSample {
  speed: number; // km/h
  timestamp: number;
  distance: number; // meters
}

export interface ETAResult {
  estimatedArrival: Date;
  remainingDistance: number; // meters
  remainingDuration: number; // seconds
  averageSpeed: number; // km/h
  currentSpeed: number; // km/h
  progress: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  delayMinutes?: number;
  speedTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface RouteProgress {
  totalDistance: number; // meters
  completedDistance: number; // meters
  remainingDistance: number; // meters
  progressPercentage: number; // 0-100
  deviationFromRoute: number; // meters
  isOnRoute: boolean;
}

export class AdvancedETACalculator {
  private speedHistory: SpeedSample[] = [];
  private locationHistory: LocationPoint[] = [];
  private readonly MAX_SPEED_HISTORY = 30;
  private readonly MAX_LOCATION_HISTORY = 100;

  private originalETA: Date | null = null;
  private originalDurationSeconds: number = 0;

  constructor() {}

  addLocationUpdate(current: LocationPoint, previous?: LocationPoint): void {
    const now = Date.now();

    // Normalize timestamp
    const timestamp = typeof current.timestamp === 'string' || typeof current.timestamp === 'number'
      ? new Date(current.timestamp).getTime()
      : current.timestamp.getTime();

    if (isNaN(timestamp)) return;

    this.locationHistory.push({ ...current, timestamp: new Date(timestamp) });
    if (this.locationHistory.length > this.MAX_LOCATION_HISTORY) {
      this.locationHistory.shift();
    }

    // Calculate speed if we have previous point
    if (previous || this.locationHistory.length >= 2) {
      const prev = previous || this.locationHistory[this.locationHistory.length - 2];
      const prevTime = typeof prev.timestamp === 'string' || typeof prev.timestamp === 'number'
        ? new Date(prev.timestamp).getTime()
        : prev.timestamp.getTime();

      const distance = this.haversineDistance(
        { lat: prev.lat, lng: prev.lng },
        { lat: current.lat, lng: current.lng }
      );

      const timeDiffSeconds = (timestamp - prevTime) / 1000;
      if (timeDiffSeconds > 0 && distance > 1) {
        const speedKmh = (distance / timeDiffSeconds) * 3.6;

        if (speedKmh >= 0 && speedKmh <= 220) {
          this.speedHistory.push({
            speed: Math.round(speedKmh * 10) / 10,
            timestamp,
            distance,
          });

          if (this.speedHistory.length > this.MAX_SPEED_HISTORY) {
            this.speedHistory.shift();
          }
        }
      }
    }
  }

  calculateETA(
    currentLocation: LocationPoint,
    destination: { lat: number; lng: number },
    plannedRouteDistanceMeters?: number
  ): ETAResult {
    const now = new Date();
    const remainingDistance = plannedRouteDistanceMeters ||
      this.haversineDistance(currentLocation, destination);

    const currentSpeed = this.getCurrentSpeed();
    const averageSpeed = this.getAverageSpeed();
    const effectiveSpeed = this.getEffectiveSpeed(currentSpeed, averageSpeed);

    const remainingDuration = effectiveSpeed > 2
      ? (remainingDistance / 1000 / effectiveSpeed) * 3600
      : (remainingDistance / 1000 / 50) * 3600; // fallback 50 km/h

    const estimatedArrival = new Date(now.getTime() + remainingDuration * 1000);

    const totalDistance = this.originalDurationSeconds > 0
      ? (this.originalDurationSeconds / 3600) * averageSpeed * 1000
      : remainingDistance + 5000; // rough estimate

    const completedDistance = Math.max(0, totalDistance - remainingDistance);
    const progress = totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0;

    const delayMinutes = this.originalETA
      ? Math.round((estimatedArrival.getTime() - this.originalETA.getTime()) / 60000)
      : undefined;

    return {
      estimatedArrival,
      remainingDistance: Math.round(remainingDistance),
      remainingDuration: Math.round(remainingDuration),
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      currentSpeed: Math.round(currentSpeed * 10) / 10,
      progress: Math.max(0, Math.min(100, progress)),
      delayMinutes,
      confidence: this.getConfidence(),
      speedTrend: this.getSpeedTrend(),
    };
  }

  calculateRouteProgress(
    currentLocation: LocationPoint,
    plannedRoute: Array<{ lat: number; lng: number }>
  ): RouteProgress {
    if (!plannedRoute || plannedRoute.length < 2) {
      const dist = this.haversineDistance(currentLocation, plannedRoute[0] || currentLocation);
      return {
        totalDistance: dist,
        completedDistance: 0,
        remainingDistance: dist,
        progressPercentage: 0,
        deviationFromRoute: 0,
        isOnRoute: false,
      };
    }

    const totalDistance = this.calculateRouteDistance(plannedRoute);
    const { distanceToRoute, index } = this.findClosestPointOnRoute(currentLocation, plannedRoute);

    const completedDistance = index > 0
      ? this.calculateRouteDistance(plannedRoute.slice(0, index + 1))
      : 0;

    return {
      totalDistance,
      completedDistance,
      remainingDistance: totalDistance - completedDistance,
      progressPercentage: totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0,
      deviationFromRoute: distanceToRoute,
      isOnRoute: distanceToRoute < 150, // 150m tolerance
    };
  }

  setOriginalETA(eta: Date, durationSeconds: number): void {
    this.originalETA = eta;
    this.originalDurationSeconds = durationSeconds;
  }

  // Private helpers
  private getCurrentSpeed(): number {
    return this.speedHistory.length > 0
      ? this.speedHistory[this.speedHistory.length - 1].speed
      : 0;
  }

  private getAverageSpeed(): number {
    if (this.speedHistory.length === 0) return 0;
    const recent = this.speedHistory.slice(-15);
    return recent.reduce((sum, s) => sum + s.speed, 0) / recent.length;
  }

  private getEffectiveSpeed(current: number, average: number): number {
    const samples = this.speedHistory.length;
    if (samples < 5) return 60;
    if (samples < 10) return average * 0.8 + current * 0.2;
    return average * 0.7 + current * 0.3;
  }

  private getConfidence(): 'high' | 'medium' | 'low' {
    const samples = this.speedHistory.length;
    if (samples >= 20) return 'high';
    if (samples >= 8) return 'medium';
    return 'low';
  }

  public getSpeedTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.speedHistory.length < 6) return 'stable';
    const recent = this.speedHistory.slice(-3).reduce((s, v) => s + v.speed, 0) / 3;
    const older = this.speedHistory.slice(-6, -3).reduce((s, v) => s + v.speed, 0) / 3;
    const diff = recent - older;
    if (diff > 8) return 'increasing';
    if (diff < -8) return 'decreasing';
    return 'stable';
  }

  private haversineDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  public calculateRouteDistance(route: Array<{ lat: number; lng: number }>): number {
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += this.haversineDistance(route[i - 1], route[i]);
    }
    return total;
  }

  private findClosestPointOnRoute(
    location: LocationPoint,
    route: Array<{ lat: number; lng: number }>
  ): { distanceToRoute: number; index: number } {
    let minDist = Infinity;
    let bestIndex = 0;

    route.forEach((point, i) => {
      const dist = this.haversineDistance(location, point);
      if (dist < minDist) {
        minDist = dist;
        bestIndex = i;
      }
    });

    return { distanceToRoute: minDist, index: bestIndex };
  }

  clearHistory(): void {
    this.speedHistory = [];
    this.locationHistory = [];
    this.originalETA = null;
    this.originalDurationSeconds = 0;
  }
}