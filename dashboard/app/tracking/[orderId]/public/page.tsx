"use client";

import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  RouteProgressCalculator,
  ETACalculator,
  createEnhancedRouteData,
  parsePostGISPoint,
  formatDuration,
  formatDistance,
  formatTime,
  getStatusColor,
  type LatLngLiteral,
  type EnhancedRouteData,
  type ETAData,
} from "../../../../lib/routeUtils";

// Type definitions
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
  loading_point_location?: string;
  unloading_point_location?: string;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  created_at: string;
  order_id: string;
}

// Type overrides for Google Maps
const GoogleMapTyped = GoogleMap as any;
const LoadScriptTyped = LoadScript as any;
const MarkerTyped = Marker as any;
const PolylineTyped = Polyline as any;

export default function PublicOrderTracking() {
  const params = useParams();
  const orderId = params.orderId as string;

  // State variables
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [enhancedRoute, setEnhancedRoute] = useState<EnhancedRouteData | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [directionsRoute, setDirectionsRoute] = useState<LatLngLiteral[]>([]);
  const [etaData, setETAData] = useState<ETAData | null>(null);

  // Refs for optimized services
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const routeCalculatorRef = useRef(new RouteProgressCalculator());
  const etaCalculatorRef = useRef(new ETACalculator());
  const previousLocationRef = useRef<LocationPoint | null>(null);
  const isMountedRef = useRef(true);

  // Memoized map configuration
  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: "500px",
    }),
    []
  );

  const mapOptions = useMemo(
    () => ({
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    }),
    []
  );

  // Initialize Directions Service
  useEffect(() => {
    if (mapRef && !directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
      console.log("DirectionsService initialized");
    }
  }, [mapRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      routeCalculatorRef.current.clearCache();
      etaCalculatorRef.current.clearHistory();
    };
  }, []);

  // Fetch planned route from Google Directions API
  const fetchPlannedRoute = useCallback(
    async (origin: LatLngLiteral, destination: LatLngLiteral): Promise<LatLngLiteral[]> => {
      if (!directionsServiceRef.current) {
        console.warn("DirectionsService not available");
        return [];
      }

      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsServiceRef.current!.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.METRIC,
              avoidHighways: false,
              avoidTolls: false,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                reject(new Error(`Directions API failed: ${status}`));
              }
            }
          );
        });

        if (result.routes?.[0]) {
          const path = result.routes[0].overview_path.map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
          }));
          console.log("Planned route fetched:", path.length, "points");
          return path;
        }
      } catch (error) {
        console.error("Error fetching planned route:", error);
      }

      return [];
    },
    []
  );

  // Update planned route when tracking data is available
  useEffect(() => {
    const updatePlannedRoute = async () => {
      if (!trackingData || !directionsServiceRef.current) return;

      try {
        const loadingPoint = parsePostGISPoint(trackingData.loading_point_location);
        const unloadingPoint = parsePostGISPoint(trackingData.unloading_point_location);

        if (loadingPoint.lat !== 0 && unloadingPoint.lat !== 0) {
          const plannedRoute = await fetchPlannedRoute(loadingPoint, unloadingPoint);
          if (isMountedRef.current) {
            setDirectionsRoute(plannedRoute);
          }
        }
      } catch (err) {
        console.error("Failed to update planned route:", err);
      }
    };

    updatePlannedRoute();
  }, [trackingData, fetchPlannedRoute]);

  // Calculate route progress with optimized calculator and real-time ETA
  const calculateRouteProgress = useCallback(async (): Promise<void> => {
    if (!trackingData || route.length === 0) {
      if (isMountedRef.current) {
        setEnhancedRoute(null);
        setETAData(null);
      }
      return;
    }

    try {
      // Convert route to LatLngLiteral
      const actualRoute = route.map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
      }));

      const currentPosition = {
        lat: route[route.length - 1].latitude,
        lng: route[route.length - 1].longitude,
      };

      // Add location to ETA calculator for speed trending
      if (previousLocationRef.current) {
        const prevPoint = {
          lat: previousLocationRef.current.latitude,
          lng: previousLocationRef.current.longitude,
        };
        etaCalculatorRef.current.addLocationUpdate(
          currentPosition,
          prevPoint,
          new Date(route[route.length - 1].created_at)
        );
      }
      previousLocationRef.current = route[route.length - 1];

      // Create enhanced route data with all calculations
      const enhanced = createEnhancedRouteData(
        orderId,
        actualRoute,
        directionsRoute.length > 0 ? directionsRoute : [currentPosition],
        currentPosition,
        routeCalculatorRef.current,
        etaCalculatorRef.current
      );

      if (isMountedRef.current) {
        setEnhancedRoute(enhanced);
        if (enhanced?.eta) {
          setETAData(enhanced.eta);
        }
      }
    } catch (error) {
      console.error("Error calculating route progress:", error);
    }
  }, [trackingData, route, directionsRoute, orderId]);

  // Update route progress when data changes
  useEffect(() => {
    calculateRouteProgress();
  }, [calculateRouteProgress]);

  // Fetch tracking data
  const fetchTrackingData = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc("get_tracking_data", { p_order_id: orderId })
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error("Tracking data not available for this order");
      }

      if (isMountedRef.current) {
        setTrackingData(data as TrackingData);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Error fetching tracking data:", err);
      if (isMountedRef.current) {
        setError(err.message || "Failed to load tracking data");
        setLoading(false);
      }
    }
  }, [orderId]);

  // Fetch route history
  const fetchRoute = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("driver_locations")
        .select("latitude, longitude, created_at, order_id")
        .eq("order_id", orderId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const routeData: LocationPoint[] = (data || []).map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        created_at: point.created_at,
        order_id: point.order_id || orderId,
      }));

      if (isMountedRef.current) {
        setRoute(routeData);
      }
    } catch (err: any) {
      console.error("Error fetching route:", err);
    }
  }, [orderId]);

  // Set up data fetching and subscriptions
  useEffect(() => {
    if (!orderId) return;

    // Initial fetch
    fetchTrackingData();
    fetchRoute();

    // Real-time subscription
    const locationChannel = supabase
      .channel(`public_tracking_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          console.log("New location update received");
          fetchTrackingData();
          fetchRoute();
        }
      )
      .subscribe();

    // Periodic refresh (20 minutes)
    const refreshInterval = setInterval(() => {
      fetchTrackingData();
      fetchRoute();
      if (isMountedRef.current) {
        setLastRefresh(new Date());
      }
    }, 20 * 60 * 1000);

    return () => {
      supabase.removeChannel(locationChannel);
      clearInterval(refreshInterval);
    };
  }, [orderId, fetchTrackingData, fetchRoute]);

  // Calculate map center
  const currentPosition = useMemo(
    () =>
      trackingData?.current_lat && trackingData?.current_lng
        ? { lat: trackingData.current_lat, lng: trackingData.current_lng }
        : route.length > 0
          ? { lat: route[route.length - 1].latitude, lng: route[route.length - 1].longitude }
          : { lat: 0, lng: 0 },
    [trackingData, route]
  );

  const mapCenter = useMemo(() => {
    const points: LatLngLiteral[] = [];
    
    if (currentPosition.lat !== 0) points.push(currentPosition);
    if (trackingData?.loading_point_location) {
      points.push(parsePostGISPoint(trackingData.loading_point_location));
    }
    if (trackingData?.unloading_point_location) {
      points.push(parsePostGISPoint(trackingData.unloading_point_location));
    }
    if (directionsRoute.length > 0) {
      points.push(...directionsRoute.slice(0, Math.min(5, directionsRoute.length)));
    }

    if (points.length === 0) return { lat: 0, lng: 0 };
    if (points.length === 1) return points[0];

    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return { lat: avgLat, lng: avgLng };
  }, [trackingData, directionsRoute, currentPosition]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !trackingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Tracking Not Available
          </h2>
          <p className="text-gray-600 text-center">
            {error || "This order is not currently being tracked or the tracking link is invalid."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">🚚</span>
              <div>
                <h1 className="text-3xl font-bold">Live Tracking</h1>
                <p className="text-blue-100 mt-1">Order #{trackingData.order_number}</p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-white text-sm font-bold shadow-md ${getStatusColor(
                trackingData.status
              )}`}
            >
              {trackingData.status.toUpperCase().replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Driver</label>
                <p className="text-lg font-semibold text-gray-900">
                  {trackingData.driver_name || "Not assigned"}
                </p>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Loading Point</label>
                <p className="text-gray-900">{trackingData.loading_point_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Unloading Point</label>
                <p className="text-gray-900">{trackingData.unloading_point_name}</p>
              </div>
            </div>

            <div>
              {trackingData.tracking_active && (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500">Trip Started</label>
                    <p className="text-gray-900">{formatTime(trackingData.trip_start_time)}</p>
                  </div>
                  {trackingData.total_distance_km > 0 && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500">Distance Traveled</label>
                      <p className="text-2xl font-bold text-blue-600">
                        {trackingData.total_distance_km.toFixed(2)} km
                      </p>
                    </div>
                  )}
                  {trackingData.total_duration_minutes > 0 && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p className="text-2xl font-bold text-green-600">
                        {formatDuration(trackingData.total_duration_minutes)}
                      </p>
                    </div>
                  )}
                  {trackingData.average_speed_kmh > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Average Speed</label>
                      <p className="text-2xl font-bold text-purple-600">
                        {trackingData.average_speed_kmh.toFixed(1)} km/h
                      </p>
                    </div>
                  )}
                </>
              )}
              {!trackingData.tracking_active && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    Tracking is not currently active for this order
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Route Progress Dashboard */}
        {enhancedRoute && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Route Progress</h2>
                <p className="text-gray-600 mt-1">Real-time tracking with ETA calculations</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Route Progress</span>
                <span className="text-sm font-bold text-gray-900">
                  {enhancedRoute.progressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all duration-500 bg-green-500"
                  style={{ width: `${Math.min(enhancedRoute.progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* ETA Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl">⏱️</span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Estimated Arrival</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {etaData?.estimatedDurationMinutes ? formatDuration(etaData.estimatedDurationMinutes) : "Calculating..."}
                    </p>
                    {etaData && (
                      <p className="text-xs text-blue-700 mt-1">
                        {etaData.estimatedArrivalTime.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Distance Traveled */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl">📍</span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Distance Traveled</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatDistance(enhancedRoute.distanceMetrics.completedDistance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Distance Remaining */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl">🎯</span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Distance Remaining</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatDistance(enhancedRoute.distanceMetrics.remainingDistance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Speed with Trend */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl">🚀</span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-amber-600">Current Speed</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {etaData?.currentSpeed.toFixed(1) || "0"} km/h
                    </p>
                    {etaData && (
                      <p className="text-xs text-amber-700 mt-1">
                        {etaData.speedTrend === "increasing" && "📈 Accelerating"}
                        {etaData.speedTrend === "decreasing" && "📉 Slowing"}
                        {etaData.speedTrend === "stable" && "➡️ Steady"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ETA Confidence & Details */}
            {etaData && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-600">ETA Confidence</p>
                    <p className={`text-lg font-semibold mt-1 ${
                      etaData.confidence === "high" ? "text-green-600" :
                      etaData.confidence === "medium" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {etaData.confidence.charAt(0).toUpperCase() + etaData.confidence.slice(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Average Speed (15min)</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {etaData.averageSpeed.toFixed(1)} km/h
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Route Status</p>
                    <p className={`text-lg font-semibold mt-1 ${
                      etaData.onRoute ? "text-green-600" : "text-orange-600"
                    }`}>
                      {etaData.onRoute ? "On Route" : "Off Route"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {etaData.lastUpdated.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Location & Route Progress</h2>
            <div className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>

          <LoadScriptTyped googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
            <GoogleMapTyped
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              options={mapOptions}
              onLoad={(map: google.maps.Map) => setMapRef(map)}
            >
              {/* Planned Route (light gray) */}
              {directionsRoute.length > 1 && (
                <PolylineTyped
                  path={directionsRoute}
                  options={{
                    strokeColor: "#9CA3AF",
                    strokeOpacity: 0.5,
                    strokeWeight: 3,
                    strokeLineCap: "round",
                    strokeLineJoin: "round",
                    zIndex: 0,
                  }}
                />
              )}

              {/* Enhanced Route Visualization */}
              {enhancedRoute && (
                <>
                  {/* Completed route (green) */}
                  {enhancedRoute.completedPath.length > 1 && (
                    <PolylineTyped
                      path={enhancedRoute.completedPath}
                      options={{
                        strokeColor: "#10B981",
                        strokeOpacity: 1,
                        strokeWeight: 6,
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Remaining route (red) */}
                  {enhancedRoute.remainingPath.length > 1 && (
                    <PolylineTyped
                      path={enhancedRoute.remainingPath}
                      options={{
                        strokeColor: "#EF4444",
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        strokeLineCap: "round",
                        strokeLineJoin: "round",
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Current position marker */}
                  <MarkerTyped
                    position={enhancedRoute.currentPosition}
                    icon={{
                      path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                      scale: 15,
                      fillColor: "#3B82F6",
                      fillOpacity: 1,
                      strokeColor: "#FFFFFF",
                      strokeWeight: 3,
                      zIndex: 3,
                    }}
                    title={`${trackingData.driver_name} - ${enhancedRoute.progressPercentage.toFixed(1)}% Complete`}
                  />
                </>
              )}

              {/* Loading and Unloading Points */}
              {trackingData.loading_point_location && (
                <MarkerTyped
                  position={parsePostGISPoint(trackingData.loading_point_location)}
                  icon={{
                    path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                    scale: 10,
                    fillColor: "#F59E0B",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                    zIndex: 2,
                  }}
                  title={`Loading Point: ${trackingData.loading_point_name}`}
                />
              )}

              {trackingData.unloading_point_location && (
                <MarkerTyped
                  position={parsePostGISPoint(trackingData.unloading_point_location)}
                  icon={{
                    path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                    scale: 10,
                    fillColor: "#8B5CF6",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                    zIndex: 2,
                  }}
                  title={`Unloading Point: ${trackingData.unloading_point_name}`}
                />
              )}
            </GoogleMapTyped>
          </LoadScriptTyped>

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
              <span>Current Location</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-green-500 mr-2"></div>
              <span>Completed Route</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-red-500 mr-2"></div>
              <span>Remaining Route</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-gray-400 mr-2"></div>
              <span>Planned Route</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
              <span>Loading Point</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
              <span>Unloading Point</span>
            </div>
          </div>

          {/* Last Update Info */}
          {trackingData.last_update && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Last location update: <span className="font-semibold">{formatTime(trackingData.last_update)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This page automatically refreshes every 20 minutes. Real-time updates are enabled.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center pb-8">
          <p className="text-sm text-gray-500">
            Real-time tracking powered by Mobile Order Tracker
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Auto-refreshing every 20 minutes
          </p>
        </div>
      </div>
    </div>
  );
}