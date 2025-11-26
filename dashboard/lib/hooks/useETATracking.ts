// lib/hooks/useETATracking.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdvancedETACalculator, ETAResult, RouteProgress } from '../leaflet/advanced-eta';
import { DistanceMatrixService } from '../leaflet/distance-matrix';

interface LocationUpdate {
  lat: number;
  lng: number;
  timestamp: Date | string | number;
}

interface UseETATrackingOptions {
  destination: { lat: number; lng: number };
  plannedRoute?: Array<{ lat: number; lng: number }>;
  updateInterval?: number;
  distanceMatrixService?: DistanceMatrixService;
}

interface ETATrackingState {
  eta: ETAResult | null;
  routeProgress: RouteProgress | null;
  isTracking: boolean;
  error: string | null;
}

export function useETATracking(options: UseETATrackingOptions) {
  const { destination, plannedRoute, updateInterval = 30000, distanceMatrixService } = options;

  const [state, setState] = useState<ETATrackingState>({
    eta: null,
    routeProgress: null,
    isTracking: false,
    error: null,
  });

  const calculatorRef = useRef<AdvancedETACalculator>(new AdvancedETACalculator());
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const addLocationUpdate = useCallback(
    (location: LocationUpdate) => {
      try {
        const calculator = calculatorRef.current;

        // Add to history
        calculator.addLocationUpdate(
          { lat: location.lat, lng: location.lng, timestamp: location.timestamp },
          undefined // previous point not needed here
        );

        // Calculate ETA
        const eta = calculator.calculateETA(
          { lat: location.lat, lng: location.lng, timestamp: location.timestamp },
          destination
        );

        let routeProgress: RouteProgress | null = null;
        if (plannedRoute && plannedRoute.length > 0) {
          routeProgress = calculator.calculateRouteProgress(
            { lat: location.lat, lng: location.lng, timestamp: location.timestamp },
            plannedRoute
          );
        }

        setState(prev => ({
          ...prev,
          eta,
          routeProgress,
          isTracking: true,
          error: null,
        }));

        lastUpdateRef.current = Date.now();
      } catch (error: any) {
        console.error('ETA calculation error:', error);
        setState(prev => ({ ...prev, error: error.message || 'ETA failed' }));
      }
    },
    [destination, plannedRoute]
  );

  const updateETAWithDistanceMatrix = useCallback(
    async (currentLocation: { lat: number; lng: number }) => {
      if (!distanceMatrixService) return;

      try {
        const result = await distanceMatrixService.getDistance(currentLocation, destination, {
          trafficAware: true,
          useCache: true,
        });

        const eta = calculatorRef.current.calculateETA(
          { ...currentLocation, timestamp: new Date() },
          destination
        );

        // Adjust remaining duration based on actual traffic distance
        if (result.distance) {
          const speedKmh = eta.averageSpeed || 50;
          eta.remainingDuration = (result.distance / 1000 / speedKmh) * 3600;
          eta.estimatedArrival = new Date(Date.now() + eta.remainingDuration * 1000);
        }

        if (result.trafficDelay) {
          eta.delayMinutes = (eta.delayMinutes || 0) + result.trafficDelay;
        }

        setState(prev => ({ ...prev, eta, error: null }));
      } catch (error: any) {
        console.warn('Traffic ETA failed:', error);
      }
    },
    [destination, distanceMatrixService]
  );

  // Set original ETA for delay tracking
  const setOriginalETA = useCallback((eta: Date, durationSeconds: number) => {
    calculatorRef.current.setOriginalETA(eta, durationSeconds);
  }, []);

  const getSpeedTrend = useCallback(() => {
    // Fixed: Access via public method or expose it
    return (calculatorRef.current as any).getSpeedTrend?.() || 'stable';
  }, []);

  const startTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: true }));
  }, []);

  const stopTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: false }));
    if (updateTimerRef.current) clearInterval(updateTimerRef.current);
  }, []);

  const clearTracking = useCallback(() => {
    calculatorRef.current.clearHistory();
    setState({ eta: null, routeProgress: null, isTracking: false, error: null });
  }, []);

  // Auto-refresh ETA with traffic data
  useEffect(() => {
    if (!distanceMatrixService || updateInterval <= 0) return;

    const tick = () => {
      const locations = (calculatorRef.current as any).locationHistory;
      if (locations?.length > 0) {
        const last = locations[locations.length - 1];
        updateETAWithDistanceMatrix({ lat: last.lat, lng: last.lng });
      }
    };

    updateTimerRef.current = setInterval(tick, updateInterval);
    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
    };
  }, [distanceMatrixService, updateInterval, updateETAWithDistanceMatrix]);

  useEffect(() => () => {
    if (updateTimerRef.current) clearInterval(updateTimerRef.current);
  }, []);

  return {
    ...state,
    addLocationUpdate,
    updateETAWithDistanceMatrix,
    setOriginalETA,
    getSpeedTrend,
    startTracking,
    stopTracking,
    clearTracking,
  };
}