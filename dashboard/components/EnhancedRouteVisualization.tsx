// components/EnhancedRouteVisualization.tsx
"use client";

import L from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { Marker, Polyline, Popup } from "react-leaflet";

// Custom icons
const truckIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/3075/3075975.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const loadingIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/854/854877.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const unloadingIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/3062/3062619.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type LatLngTuple = [number, number];

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  order_id: string;
}

interface RouteProgress {
  completedPath: LatLngTuple[];
  remainingPath: LatLngTuple[];
  currentPosition: LatLngTuple;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  totalDistance: number;
  completedDistance: number;
  averageSpeed: number;
}

interface EnhancedRouteVisualizationProps {
  orderRoute: RoutePoint[];
  loadingPoint: LatLngTuple;
  unloadingPoint: LatLngTuple;
  onProgressUpdate?: (progress: RouteProgress) => void;
}

export const EnhancedRouteVisualization: React.FC<EnhancedRouteVisualizationProps> = ({
  orderRoute,
  loadingPoint,
  unloadingPoint,
  onProgressUpdate,
}) => {
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);

  const haversineDistance = (p1: LatLngTuple, p2: LatLngTuple): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(p2[0] - p1[0]);
    const dLon = toRad(p2[1] - p1[1]);
    const lat1 = toRad(p1[0]);
    const lat2 = toRad(p2[0]);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const totalDistance = (points: LatLngTuple[]): number => {
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      dist += haversineDistance(points[i - 1], points[i]);
    }
    return dist;
  };

  const fetchPlannedRoute = useCallback(async (): Promise<LatLngTuple[]> => {
    if (!process.env.NEXT_PUBLIC_ORS_API_KEY) {
      return [loadingPoint, unloadingPoint];
    }

    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_API_KEY}&start=${loadingPoint[1]},${loadingPoint[0]}&end=${unloadingPoint[1]},${unloadingPoint[0]}`
      );
      const data = await res.json();
      if (data.features?.[0]?.geometry?.coordinates) {
        return data.features[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as LatLngTuple);
      }
    } catch (err) {
      console.warn("Using straight line route");
    }
    return [loadingPoint, unloadingPoint];
  }, [loadingPoint, unloadingPoint]);

  const findClosestPoint = (current: LatLngTuple, route: LatLngTuple[]): number => {
    let minDist = Infinity;
    let index = 0;
    route.forEach((p, i) => {
      const d = haversineDistance(current, p);
      if (d < minDist) {
        minDist = d;
        index = i;
      }
    });
    return index;
  };

  const calculateProgress = useCallback(async () => {
    if (orderRoute.length === 0) return;

    const plannedRoute = await fetchPlannedRoute();
    const totalPlannedDistance = totalDistance(plannedRoute);

    const currentPos: LatLngTuple = [orderRoute[orderRoute.length - 1].lat, orderRoute[orderRoute.length - 1].lng];
    const closestIdx = findClosestPoint(currentPos, plannedRoute);

    const completedPath = plannedRoute.slice(0, closestIdx + 1);
    const remainingPath = plannedRoute.slice(closestIdx);

    if (haversineDistance(completedPath[completedPath.length - 1], currentPos) > 0.01) {
      completedPath.push(currentPos);
    }

    const completedDistance = totalDistance(completedPath);
    const progressPercentage = totalPlannedDistance > 0
      ? Math.min((completedDistance / totalPlannedDistance) * 100, 100)
      : 0;

    let averageSpeed = 0;
    if (orderRoute.length >= 2) {
      const first = orderRoute[0];
      const last = orderRoute[orderRoute.length - 1];
      const timeHours = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3600000;
      const actualDist = totalDistance(orderRoute.map(p => [p.lat, p.lng] as LatLngTuple));
      if (timeHours > 0) averageSpeed = actualDist / timeHours;
    }

    const remainingDistance = totalPlannedDistance - completedDistance;
    const estimatedTimeRemaining = averageSpeed > 5
      ? (remainingDistance / averageSpeed) * 60
      : (remainingDistance / 30) * 60;

    const progress: RouteProgress = {
      completedPath,
      remainingPath,
      currentPosition: currentPos,
      progressPercentage,
      estimatedTimeRemaining,
      totalDistance: totalPlannedDistance,
      completedDistance,
      averageSpeed,
    };

    setRouteProgress(progress);
    onProgressUpdate?.(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRoute, fetchPlannedRoute, onProgressUpdate]);

  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  if (!routeProgress) return null;

  return (
    <>
      <Polyline positions={routeProgress.completedPath} color="#10b981" weight={6} />
      <Polyline positions={routeProgress.remainingPath} color="#ef4444" weight={5} opacity={0.8} />

      <Marker position={routeProgress.currentPosition} icon={truckIcon}>
        <Popup>
          <strong>Current Location</strong><br />
          Progress: {routeProgress.progressPercentage.toFixed(1)}%
        </Popup>
      </Marker>

      <Marker position={loadingPoint} icon={loadingIcon}>
        <Popup>Loading Point</Popup>
      </Marker>

      <Marker position={unloadingPoint} icon={unloadingIcon}>
        <Popup>Unloading Point</Popup>
      </Marker>
    </>
  );
};

export default EnhancedRouteVisualization;
