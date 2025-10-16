// Enhanced Route Progress Visualization Component
// This component shows route progress with red-to-green color transition and ETA calculations

import { Marker, Polyline } from "@react-google-maps/api";
import React, { useEffect, useState } from "react";

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  order_id: string;
}

interface RouteProgress {
  completedPath: google.maps.LatLngLiteral[];
  remainingPath: google.maps.LatLngLiteral[];
  currentPosition: google.maps.LatLngLiteral;
  progressPercentage: number;
  estimatedTimeRemaining: number; // in minutes
  totalDistance: number; // in kilometers
  completedDistance: number; // in kilometers
  averageSpeed: number; // in km/h
}

interface EnhancedRouteVisualizationProps {
  orderRoute: RoutePoint[];
  loadingPoint: google.maps.LatLngLiteral;
  unloadingPoint: google.maps.LatLngLiteral;
  onProgressUpdate?: (progress: RouteProgress) => void;
  mapRef?: google.maps.Map;
}

// Google Maps component typed versions
const PolylineTyped = Polyline as any;
const MarkerTyped = Marker as any;

export const EnhancedRouteVisualization: React.FC<EnhancedRouteVisualizationProps> = ({
  orderRoute,
  loadingPoint,
  unloadingPoint,
  onProgressUpdate,
  mapRef
}) => {
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (
    point1: google.maps.LatLngLiteral,
    point2: google.maps.LatLngLiteral
  ): number => {
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
  };

  // Calculate total route distance
  const calculateTotalRouteDistance = (points: google.maps.LatLngLiteral[]): number => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(points[i - 1], points[i]);
    }
    return totalDistance;
  };

  // Get the planned route using Google Directions API
  const getPlannedRoute = async (): Promise<google.maps.LatLngLiteral[]> => {
    return new Promise((resolve) => {
      if (!window.google || !mapRef) {
        // Fallback to direct line
        resolve([loadingPoint, unloadingPoint]);
        return;
      }

      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: loadingPoint,
          destination: unloadingPoint,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          avoidHighways: false,
          avoidTolls: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const path: google.maps.LatLngLiteral[] = [];
            
            route.legs.forEach((leg) => {
              leg.steps.forEach((step) => {
                const stepPath = step.path;
                stepPath.forEach((point) => {
                  path.push({ lat: point.lat(), lng: point.lng() });
                });
              });
            });
            
            resolve(path);
          } else {
            // Fallback to direct line
            console.warn("Could not get directions, using direct route");
            resolve([loadingPoint, unloadingPoint]);
          }
        }
      );
    });
  };

  // Find the closest point on the planned route to the current position
  const findClosestPointOnRoute = (
    currentPos: google.maps.LatLngLiteral,
    plannedRoute: google.maps.LatLngLiteral[]
  ): { index: number; distance: number } => {
    let closestIndex = 0;
    let minDistance = Number.MAX_VALUE;

    plannedRoute.forEach((point, index) => {
      const distance = calculateDistance(currentPos, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return { index: closestIndex, distance: minDistance };
  };

  // Calculate route progress
  const calculateRouteProgress = async (): Promise<RouteProgress | null> => {
    if (orderRoute.length === 0) return null;

    // Get the planned route
    const plannedRoute = await getPlannedRoute();
    const totalPlannedDistance = calculateTotalRouteDistance(plannedRoute);

    // Current position is the latest point in the route
    const currentPosition = {
      lat: orderRoute[orderRoute.length - 1].lat,
      lng: orderRoute[orderRoute.length - 1].lng,
    };

    // Find where we are on the planned route
    const { index: currentRouteIndex } = findClosestPointOnRoute(currentPosition, plannedRoute);

    // Calculate completed and remaining paths
    const completedPath = plannedRoute.slice(0, currentRouteIndex + 1);
    const remainingPath = plannedRoute.slice(currentRouteIndex);

    // Add current position to completed path if it's not already there
    if (completedPath.length === 0 || 
        calculateDistance(completedPath[completedPath.length - 1], currentPosition) > 0.01) {
      completedPath.push(currentPosition);
    }

    // Calculate distances
    const completedDistance = calculateTotalRouteDistance(completedPath);
    const remainingDistance = calculateTotalRouteDistance(remainingPath);

    // Calculate progress percentage
    const progressPercentage = totalPlannedDistance > 0 
      ? Math.min((completedDistance / totalPlannedDistance) * 100, 100)
      : 0;

    // Calculate average speed from actual route data
    let averageSpeed = 0;
    if (orderRoute.length >= 2) {
      const firstPoint = orderRoute[0];
      const lastPoint = orderRoute[orderRoute.length - 1];
      const timeElapsed = (new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / (1000 * 60 * 60); // hours
      const actualDistance = calculateTotalRouteDistance(orderRoute.map(p => ({ lat: p.lat, lng: p.lng })));
      
      if (timeElapsed > 0 && actualDistance > 0) {
        averageSpeed = actualDistance / timeElapsed;
      }
    }

    // Calculate ETA (estimated time remaining)
    let estimatedTimeRemaining = 0;
    if (averageSpeed > 0 && remainingDistance > 0) {
      estimatedTimeRemaining = (remainingDistance / averageSpeed) * 60; // convert to minutes
    } else if (remainingDistance > 0) {
      // Fallback: assume average city driving speed of 30 km/h
      estimatedTimeRemaining = (remainingDistance / 30) * 60;
    }

    return {
      completedPath,
      remainingPath,
      currentPosition,
      progressPercentage,
      estimatedTimeRemaining,
      totalDistance: totalPlannedDistance,
      completedDistance,
      averageSpeed,
    };
  };

  // Update route progress when route data changes
  useEffect(() => {
    const updateProgress = async () => {
      const progress = await calculateRouteProgress();
      if (progress) {
        setRouteProgress(progress);
        onProgressUpdate?.(progress);
      }
    };

    updateProgress();
  }, [orderRoute, loadingPoint, unloadingPoint]);

  if (!routeProgress) {
    return null;
  }

  return (
    <>
      {/* Completed route (green) */}
      {routeProgress.completedPath.length > 1 && (
        <PolylineTyped
          path={routeProgress.completedPath}
          options={{
            strokeColor: "#10B981", // Green
            strokeOpacity: 1,
            strokeWeight: 6,
            zIndex: 2,
          }}
        />
      )}

      {/* Remaining route (red) */}
      {routeProgress.remainingPath.length > 1 && (
        <PolylineTyped
          path={routeProgress.remainingPath}
          options={{
            strokeColor: "#EF4444", // Red
            strokeOpacity: 0.8,
            strokeWeight: 4,
            zIndex: 1,
          }}
        />
      )}

      {/* Current position marker with enhanced styling */}
      <MarkerTyped
        position={routeProgress.currentPosition}
        icon={{
          path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
          scale: 15,
          fillColor: "#3B82F6", // Blue
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
          zIndex: 3,
        }}
        title={`Current Position - ${routeProgress.progressPercentage.toFixed(1)}% Complete`}
      />

      {/* Loading point marker */}
      <MarkerTyped
        position={loadingPoint}
        icon={{
          path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
          scale: 10,
          fillColor: "#F59E0B", // Amber for start
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          zIndex: 2,
        }}
        title="Loading Point (Start)"
      />

      {/* Unloading point marker */}
      <MarkerTyped
        position={unloadingPoint}
        icon={{
          path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
          scale: 10,
          fillColor: "#8B5CF6", // Purple for destination
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          zIndex: 2,
        }}
        title="Unloading Point (Destination)"
      />
    </>
  );
};

export default EnhancedRouteVisualization;