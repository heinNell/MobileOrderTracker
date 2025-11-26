// lib/leaflet/eta-integration.ts

import { AdvancedETACalculator } from './advanced-eta';
import { DistanceMatrixService } from './distance-matrix'; // Fixed: added missing parentheses

export interface SimpleETAResult {
  arrivalTime: Date;
  minutesRemaining: number;
  distanceKm: number;
  currentSpeedKmh: number;
  averageSpeedKmh: number;
  progressPercent: number;
  confidence: 'high' | 'medium' | 'low';
  speedTrend: 'increasing' | 'decreasing' | 'stable';
  onRoute: boolean;
  deviationMeters?: number;
  trafficDelayMinutes?: number;
}

export class SimpleETATracker {
  private calculator: AdvancedETACalculator;
  private distanceMatrix: DistanceMatrixService; // Fixed: was 'distance' → now correct name
  private route: Array<{ lat: number; lng: number }> = [];
  private destination?: { lat: number; lng: number };

  constructor(apiKey?: string) {
    this.calculator = new AdvancedETACalculator();
    this.distanceMatrix = new DistanceMatrixService( // Fixed: now using correct property name
      apiKey || process.env.NEXT_PUBLIC_ORS_API_KEY || '',
      'ors'
    );
  }

  addLocation(lat: number, lng: number, timestamp: string | Date | number = Date.now()): void {
    this.calculator.addLocationUpdate({
      lat,
      lng,
      timestamp,
    });
  }

  setRoute(
    route: Array<{ lat: number; lng: number }>,
    destination: { lat: number; lng: number }
  ): void {
    this.route = route;
    this.destination = destination;

    if (route.length > 0) {
      const totalDistance = this.calculator.calculateRouteDistance(route);
      const avgSpeed = 65;
      const durationSec = (totalDistance / 1000 / avgSpeed) * 3600;

      this.calculator.setOriginalETA(
        new Date(Date.now() + durationSec * 1000),
        durationSec
      );
    }
  }

  getETA(): SimpleETAResult | null {
    if (!this.destination) return null;

    const history = (this.calculator as any).locationHistory as any[] | undefined;
    if (!history?.length) return null;

    const current = history[history.length - 1];
    const eta = this.calculator.calculateETA(current, this.destination);

    const progress = this.route.length > 0
      ? (this.calculator as any).calculateRouteProgress?.(current, this.route)
      : null;

    return {
      arrivalTime: eta.estimatedArrival,
      minutesRemaining: Math.max(1, Math.round(eta.remainingDuration / 60)),
      distanceKm: Number((eta.remainingDistance / 1000).toFixed(1)),
      currentSpeedKmh: Math.round(eta.currentSpeed),
      averageSpeedKmh: Math.round(eta.averageSpeed),
      progressPercent: Math.round(eta.progress),
      confidence: eta.confidence,
      speedTrend: this.calculator.getSpeedTrend(),
      onRoute: progress?.isOnRoute ?? true,
      deviationMeters: progress?.deviationFromRoute
        ? Math.round(progress.deviationFromRoute)
        : undefined,
    };
  }

  async getETAWithTraffic(current: { lat: number; lng: number }): Promise<SimpleETAResult | null> {
    if (!this.destination) return null;

    try {
      const result = await this.distanceMatrix.getDistance(current, this.destination, {
        trafficAware: true,
        useCache: true,
      });

      const eta = this.calculator.calculateETA(
        { ...current, timestamp: new Date() },
        this.destination
      );

      // Use actual distance from traffic service
      const actualDistance = result.distance;

      const progress = this.route.length > 0
        ? this.calculator.calculateRouteProgress({ ...current, timestamp: new Date() }, this.route)
        : null;

      return {
        arrivalTime: eta.estimatedArrival,
        minutesRemaining: Math.max(1, Math.round(eta.remainingDuration / 60)),
        distanceKm: Number((actualDistance / 1000).toFixed(1)),
        currentSpeedKmh: Math.round(eta.currentSpeed),
        averageSpeedKmh: Math.round(eta.averageSpeed),
        progressPercent: Math.round(eta.progress),
        confidence: result.trafficDelay ? 'medium' : eta.confidence,
        speedTrend: this.calculator.getSpeedTrend(),
        onRoute: progress?.isOnRoute ?? true,
        deviationMeters: progress?.deviationFromRoute
          ? Math.round(progress.deviationFromRoute)
          : undefined,
        trafficDelayMinutes: result.trafficDelay ? Math.round(result.trafficDelay / 60) : undefined,
      };
    } catch (error) {
      console.warn('Traffic ETA failed → using standard', error);
      return this.getETA();
    }
  }

  clear(): void {
    this.calculator.clearHistory();
    this.route = [];
    this.destination = undefined;
  }
}

export const createETATracker = (apiKey?: string): SimpleETATracker => {
  return new SimpleETATracker(apiKey);
};

export const formatETATime = (date: Date): string => {
  const diff = Math.round((date.getTime() - Date.now()) / 60000);
  if (diff < 1) return 'Arriving now';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const getETAConfidenceColor = (c: 'high' | 'medium' | 'low'): string => ({
  high: 'text-green-600 bg-green-100',
  medium: 'text-amber-600 bg-amber-100',
  low: 'text-red-600 bg-red-100',
}[c]);

export const getSpeedTrendIcon = (t: 'increasing' | 'decreasing' | 'stable'): string => ({
  increasing: 'Up arrow',
  decreasing: 'Down arrow',
  stable: 'Right arrow',
}[t]);