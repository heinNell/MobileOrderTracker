// app/tracking/[orderId]/page.tsx
"use client";

import { lineString } from "@turf/helpers";
import length from "@turf/length";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { AdvancedETACalculator } from "../../../../lib/leaflet/advanced-eta";
import { DistanceMatrixService } from "../../../../lib/leaflet/distance-matrix";
import { formatDistance, formatDuration, getStatusColor } from "../../../../lib/routeUtils";
import { supabase } from "../../../../lib/supabase";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

interface TrackingData {
  order_id: string;
  order_number: string;
  status: string;
  loading_point_name: string;
  unloading_point_name: string;
  driver_name: string;
  current_lat: number;
  current_lng: number;
  tracking_active: boolean;
  trip_start_time: string;
  total_distance_km: number;
  total_duration_minutes: number;
  average_speed_kmh: number;
  last_update: string;
  loading_point_latitude?: number;
  loading_point_longitude?: number;
  unloading_point_latitude?: number;
  unloading_point_longitude?: number;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  created_at: string;
}

interface RouteProgress {
  progressPercentage: number;
  completedDistance: number;
  remainingDistance: number;
  completedPath: LatLngTuple[];
  remainingPath: LatLngTuple[];
}

interface ETAData {
  estimatedDurationMinutes: number;
  estimatedArrivalTime: Date;
  currentSpeed: number;
  averageSpeed: number;
  speedTrend: "increasing" | "decreasing" | "stable";
  confidence: "high" | "medium" | "low";
  onRoute: boolean;
  lastUpdated: Date;
}

export default function PublicOrderTracking() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [routeHistory, setRouteHistory] = useState<LocationPoint[]>([]);
  const [plannedRoute, setPlannedRoute] = useState<LatLngTuple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [etaData, setEtaData] = useState<ETAData | null>(null);
  const [liveRemaining, setLiveRemaining] = useState<{ distance: number; duration: number } | null>(null);

  const speedHistoryRef = useRef<{ time: Date; speed: number }[]>([]);
  const isMounted = useRef(true);
  
  // Advanced ETA Calculator
  const etaCalculatorRef = useRef<AdvancedETACalculator>(new AdvancedETACalculator());
  const distanceMatrixServiceRef = useRef<DistanceMatrixService>(
    new DistanceMatrixService(process.env.NEXT_PUBLIC_ORS_API_KEY || '', 'ors')
  );

  // OpenRouteService API calls
  const fetchPlannedRoute = async (start: LatLngTuple, end: LatLngTuple) => {
    if (!process.env.NEXT_PUBLIC_ORS_API_KEY) return;
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_API_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`
      );
      const data = await res.json();
      if (data.features?.[0]?.geometry?.coordinates) {
        const path = data.features[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as LatLngTuple);
        if (isMounted.current) setPlannedRoute(path);
      }
    } catch (err) {
      console.error("Route fetch failed:", err);
    }
  };

  const updateLiveDistance = async (current: LatLngTuple, destination: LatLngTuple) => {
    if (!process.env.NEXT_PUBLIC_ORS_API_KEY) return;
    try {
      const distanceMatrixService = distanceMatrixServiceRef.current;
      const result = await distanceMatrixService.getDistance(
        { lat: current[0], lng: current[1] },
        { lat: destination[0], lng: destination[1] },
        { trafficAware: false, useCache: true }
      );
      
      if (result) {
        setLiveRemaining({
          distance: result.distance / 1000,
          duration: result.duration / 60,
        });
      }
    } catch (err) {
      console.error("Matrix failed:", err);
    }
  };

  // Get coordinates
  const coords = useMemo(() => {
    if (!trackingData) return { current: [0, 0] as LatLngTuple, loading: null, unloading: null };

    const current: LatLngTuple = [trackingData.current_lat, trackingData.current_lng];
    const loading = trackingData.loading_point_latitude
      ? [trackingData.loading_point_latitude, trackingData.loading_point_longitude] as LatLngTuple
      : null;
    const unloading = trackingData.unloading_point_latitude
      ? [trackingData.unloading_point_latitude, trackingData.unloading_point_longitude] as LatLngTuple
      : null;

    return { current, loading, unloading };
  }, [trackingData]);

  // Advanced route progress + ETA using AdvancedETACalculator
  const calculateProgressAndETA = useCallback(() => {
    if (!plannedRoute.length || routeHistory.length < 2 || !coords.unloading) return;

    const calculator = etaCalculatorRef.current;
    const actualPath = routeHistory.map(p => [p.latitude, p.longitude] as LatLngTuple);
    const currentPos = actualPath[actualPath.length - 1];
    const currentLocation = {
      lat: currentPos[0],
      lng: currentPos[1],
      timestamp: routeHistory[routeHistory.length - 1].created_at,
    };

    // Add location to advanced calculator
    calculator.addLocationUpdate(currentLocation);

    // Convert planned route to required format
    const plannedRouteForCalc = plannedRoute.map(([lat, lng]) => ({ lat, lng }));
    const destination = { lat: coords.unloading[0], lng: coords.unloading[1] };

    // Calculate route progress
    const progress = calculator.calculateRouteProgress(
      currentLocation,
      plannedRouteForCalc
    );

    // Calculate ETA
    const eta = calculator.calculateETA(
      currentLocation,
      destination
    );

    // Calculate visual path progress for map
    const plannedLine = lineString(plannedRoute);
    const totalDistance = length(plannedLine, { units: "kilometers" });
    
    // Snap current position to planned route for visualization
    let snappedIndex = 0;
    let minDist = Infinity;
    plannedRoute.forEach((point, i) => {
      const d = Math.hypot(point[0] - currentPos[0], point[1] - currentPos[1]);
      if (d < minDist) {
        minDist = d;
        snappedIndex = i;
      }
    });

    const completedDistance = progress.completedDistance / 1000; // Convert to km
    const remainingDistance = progress.remainingDistance / 1000; // Convert to km

    setRouteProgress({
      progressPercentage: progress.progressPercentage,
      completedDistance,
      remainingDistance,
      completedPath: actualPath,
      remainingPath: plannedRoute.slice(snappedIndex),
    });

    // Map to legacy ETAData format for existing UI
    setEtaData({
      estimatedDurationMinutes: eta.remainingDuration / 60,
      estimatedArrivalTime: eta.estimatedArrival,
      currentSpeed: eta.currentSpeed,
      averageSpeed: eta.averageSpeed,
      speedTrend: eta.speedTrend,
      confidence: eta.confidence,
      onRoute: progress.isOnRoute,
      lastUpdated: new Date(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedRoute, routeHistory, liveRemaining, coords.unloading]);

  useEffect(() => {
    if (plannedRoute.length && routeHistory.length && coords.unloading) {
      calculateProgressAndETA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedRoute, routeHistory, liveRemaining, calculateProgressAndETA, coords.unloading]);

  // Fetch data
  const fetchTrackingData = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_tracking_data", { p_order_id: orderId }).single();
      if (data && isMounted.current) {
        setTrackingData(data as TrackingData);
        setLoading(false);
      }
    } catch (err: any) {
      if (isMounted.current) setError(err.message);
    }
  }, [orderId]);

  const fetchRouteHistory = useCallback(async () => {
    const { data } = await supabase
      .from("driver_locations")
      .select("latitude, longitude, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (data) setRouteHistory(data);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    fetchTrackingData();
    fetchRouteHistory();

    if (coords.loading && coords.unloading) {
      fetchPlannedRoute(coords.loading, coords.unloading);
      updateLiveDistance(coords.current, coords.unloading);
      const interval = setInterval(() => updateLiveDistance(coords.current, coords.unloading), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, orderId]);

  useEffect(() => {
    const channel = supabase.channel(`tracking_${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_locations", filter: `order_id=eq.${orderId}` }, () => {
        fetchRouteHistory();
        fetchTrackingData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const center: LatLngExpression = coords.current[0] !== 0 ? coords.current : [0, 0];

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error || !trackingData) return <div className="text-center p-10 text-red-600">Tracking not available</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Live Tracking</h1>
            <p className="text-xl">Order #{trackingData.order_number}</p>
          </div>
          <span className={`px-6 py-3 rounded-full text-lg font-bold ${getStatusColor(trackingData.status)}`}>
            {trackingData.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Dashboard */}
        {routeProgress && etaData && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Route Progress & ETA</h2>
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span className="font-bold">{routeProgress.progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all" style={{ width: `${routeProgress.progressPercentage}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl">Estimated Arrival</div>
                <div className="text-4xl font-bold text-blue-600">{formatDuration(etaData.estimatedDurationMinutes)}</div>
                <div className="text-sm">{etaData.estimatedArrivalTime.toLocaleTimeString()}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600">Remaining</div>
                <div className="text-2xl font-bold text-green-700">
                  {liveRemaining ? formatDistance(liveRemaining.distance) : formatDistance(routeProgress.remainingDistance)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600">Speed</div>
                <div className="text-2xl font-bold text-purple-700">{etaData.currentSpeed.toFixed(1)} km/h</div>
                <div className="text-xs">{etaData.speedTrend === "increasing" ? "Accelerating" : etaData.speedTrend === "decreasing" ? "Slowing" : "Steady"}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-amber-600">Confidence</div>
                <div className={`text-2xl font-bold ${etaData.confidence === "high" ? "text-green-600" : etaData.confidence === "medium" ? "text-yellow-600" : "text-red-600"}`}>
                  {etaData.confidence.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <MapContainer center={center} zoom={13} style={{ height: "600px" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

            {plannedRoute.length > 0 && <Polyline positions={plannedRoute} color="#94a3b8" weight={5} opacity={0.6} />}

            {routeProgress && (
              <>
                <Polyline positions={routeProgress.completedPath} color="#10b981" weight={7} />
                <Polyline positions={routeProgress.remainingPath} color="#ef4444" weight={6} opacity={0.9} />
              </>
            )}

            {coords.current[0] !== 0 && (
              <Marker position={coords.current} icon={truckIcon}>
                <Popup>{trackingData.driver_name} • {routeProgress?.progressPercentage.toFixed(1)}% complete</Popup>
              </Marker>
            )}

            {coords.loading && <Marker position={coords.loading} icon={loadingIcon} />}
            {coords.unloading && <Marker position={coords.unloading} icon={unloadingIcon} />}
          </MapContainer>

          <div className="p-4 bg-gray-50 border-t flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2"><div className="w-6 h-1 bg-green-500"></div> Completed</div>
            <div className="flex items-center gap-2"><div className="w-6 h-1 bg-red-500"></div> Remaining</div>
            <div className="flex items-center gap-2"><div className="w-6 h-1 bg-gray-400"></div> Planned</div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()} • Powered by OpenStreetMap & OpenRouteService
        </div>
      </div>
    </div>
  );
}