"use client";

import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

// Enhanced Route and Progress components - inline for now
// (These could be moved to separate files later)

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

interface RouteProgress {
  completedPath: google.maps.LatLngLiteral[];
  remainingPath: google.maps.LatLngLiteral[];
  currentPosition: google.maps.LatLngLiteral;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  totalDistance: number;
  completedDistance: number;
  averageSpeed: number;
}

const GoogleMapTyped = GoogleMap as any;
const LoadScriptTyped = LoadScript as any;
const MarkerTyped = Marker as any;
const PolylineTyped = Polyline as any;

// Utility function to parse PostGIS point format
function parsePostGISPoint(pointString: string): { lat: number; lng: number } {
  if (!pointString || typeof pointString !== 'string') {
    return { lat: 0, lng: 0 };
  }
  
  // Handle PostGIS POINT format: "POINT(lng lat)" or direct coordinate string
  if (pointString.includes('POINT')) {
    const match = pointString.match(/POINT\(([^)]+)\)/);
    if (match) {
      const coords = match[1].split(' ');
      return {
        lat: parseFloat(coords[1]) || 0,
        lng: parseFloat(coords[0]) || 0,
      };
    }
  }
  
  // Handle comma-separated coordinates: "lat,lng"
  if (pointString.includes(',')) {
    const coords = pointString.split(',');
    return {
      lat: parseFloat(coords[0]) || 0,
      lng: parseFloat(coords[1]) || 0,
    };
  }
  
  return { lat: 0, lng: 0 };
}

export default function PublicOrderTracking() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [directionsRoute, setDirectionsRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);

  // Initialize Google Maps services when map loads
  useEffect(() => {
    if (mapRef && !directionsService) {
      setDirectionsService(new google.maps.DirectionsService());
    }
  }, [mapRef, directionsService]);

  // Fetch planned route from Google Directions API
  const fetchPlannedRoute = useCallback(async (
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral
  ): Promise<google.maps.LatLngLiteral[]> => {
    if (!directionsService) return [];

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(
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
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const path: google.maps.LatLngLiteral[] = [];
        
        route.legs.forEach(leg => {
          leg.steps.forEach(step => {
            step.path.forEach(point => {
              path.push({
                lat: point.lat(),
                lng: point.lng()
              });
            });
          });
        });
        
        return path;
      }
    } catch (error) {
      console.error("Error fetching planned route:", error);
    }

    return [];
  }, [directionsService]);

  // Update planned route when tracking data changes
  useEffect(() => {
    const updatePlannedRoute = async () => {
      if (!trackingData || !directionsService) return;

      const loadingPoint = trackingData.loading_point_location 
        ? parsePostGISPoint(trackingData.loading_point_location)
        : null;
      
      const unloadingPoint = trackingData.unloading_point_location
        ? parsePostGISPoint(trackingData.unloading_point_location)
        : null;

      if (loadingPoint && unloadingPoint) {
        const plannedRoute = await fetchPlannedRoute(loadingPoint, unloadingPoint);
        setDirectionsRoute(plannedRoute);
      }
    };

    updatePlannedRoute();
  }, [trackingData, directionsService, fetchPlannedRoute]);

  // Standalone public page - no authentication required
  // No navigation menu, no login/logout buttons
  
  // Enhanced route calculation functions
  const calculateDistance = useCallback((
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
  }, []);

  const calculateRouteProgress = useCallback(async (): Promise<RouteProgress | null> => {
    if (!trackingData || route.length === 0) return null;

    try {
      // Parse loading and unloading points
      const loadingPoint = trackingData.loading_point_location 
        ? parsePostGISPoint(trackingData.loading_point_location)
        : { lat: 0, lng: 0 };
      
      const unloadingPoint = trackingData.unloading_point_location
        ? parsePostGISPoint(trackingData.unloading_point_location)
        : { lat: 0, lng: 0 };

      // Use the planned route from Google Directions API for accurate distance calculation
      let totalDistance = 0;
      if (directionsRoute.length > 1) {
        // Calculate total distance using the planned route
        for (let i = 1; i < directionsRoute.length; i++) {
          totalDistance += calculateDistance(directionsRoute[i - 1], directionsRoute[i]);
        }
      } else {
        // Fallback to direct distance if no planned route available
        totalDistance = calculateDistance(loadingPoint, unloadingPoint);
      }

      // Current position
      const currentPosition = {
        lat: route[route.length - 1].latitude,
        lng: route[route.length - 1].longitude,
      };

      // Calculate completed distance along the actual driver route
      let completedDistance = 0;
      for (let i = 1; i < route.length; i++) {
        const prev = { lat: route[i - 1].latitude, lng: route[i - 1].longitude };
        const curr = { lat: route[i].latitude, lng: route[i].longitude };
        completedDistance += calculateDistance(prev, curr);
      }

      // Calculate remaining distance using planned route if available
      let remainingDistance = 0;
      let nearestPointIndex = 0;

      if (directionsRoute.length > 1) {
        // Find the nearest point on the planned route to the current position
        let minDistance = Infinity;
        for (let i = 0; i < directionsRoute.length; i++) {
          const distance = calculateDistance(currentPosition, directionsRoute[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestPointIndex = i;
          }
        }

        // Calculate remaining distance from current position to destination via planned route
        remainingDistance = calculateDistance(currentPosition, directionsRoute[nearestPointIndex]);
        for (let i = nearestPointIndex + 1; i < directionsRoute.length; i++) {
          remainingDistance += calculateDistance(directionsRoute[i - 1], directionsRoute[i]);
        }
      } else {
        // Fallback to direct distance
        remainingDistance = calculateDistance(currentPosition, unloadingPoint);
      }

      // Calculate progress percentage based on total journey distance
      const totalJourneyDistance = completedDistance + remainingDistance;
      const progressPercentage = totalJourneyDistance > 0 
        ? (completedDistance / totalJourneyDistance) * 100
        : 0;

      // Calculate average speed
      let averageSpeed = 0;
      if (route.length >= 2) {
        const firstPoint = route[0];
        const lastPoint = route[route.length - 1];
        const timeElapsed = (new Date(lastPoint.created_at).getTime() - new Date(firstPoint.created_at).getTime()) / (1000 * 60 * 60);
        
        if (timeElapsed > 0 && completedDistance > 0) {
          averageSpeed = completedDistance / timeElapsed;
        }
      }

      // Calculate ETA
      let estimatedTimeRemaining = 0;
      if (averageSpeed > 0 && remainingDistance > 0) {
        estimatedTimeRemaining = (remainingDistance / averageSpeed) * 60;
      } else if (remainingDistance > 0) {
        estimatedTimeRemaining = (remainingDistance / 30) * 60; // Assume 30 km/h
      }

      // Create completed and remaining paths using planned route
      let completedPath: google.maps.LatLngLiteral[] = [];
      let remainingPath: google.maps.LatLngLiteral[] = [];

      if (directionsRoute.length > 1) {
        // Use actual driver path for completed portion
        completedPath = route.map(point => ({ lat: point.latitude, lng: point.longitude }));
        
        // Use planned route from current position to destination for remaining portion
        remainingPath = [currentPosition, ...directionsRoute.slice(nearestPointIndex + 1)];
        if (remainingPath.length === 1) remainingPath.push(unloadingPoint);
      } else {
        // Fallback: use actual driver route for completed, direct line for remaining
        completedPath = route.map(point => ({ lat: point.latitude, lng: point.longitude }));
        remainingPath = [currentPosition, unloadingPoint];
      }

      return {
        completedPath,
        remainingPath,
        currentPosition,
        progressPercentage,
        estimatedTimeRemaining,
        totalDistance: totalJourneyDistance,
        completedDistance,
        averageSpeed,
      };
    } catch (error) {
      console.error("Error calculating route progress:", error);
      return null;
    }
  }, [trackingData, route, directionsRoute, calculateDistance]);

  // Update route progress when data changes
  useEffect(() => {
    const updateProgress = async () => {
      const progress = await calculateRouteProgress();
      setRouteProgress(progress);
    };
    updateProgress();
  }, [calculateRouteProgress]);
  
  const mapContainerStyle = {
    width: "100%",
    height: "500px",
  };

  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  useEffect(() => {
    if (orderId) {
      fetchTrackingData();
      fetchRoute();

      // Set up real-time subscription
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

      // Reduced refresh interval to minimize disruption - 20 minutes instead of 10
      const refreshInterval = setInterval(() => {
        fetchTrackingData();
        fetchRoute();
        setLastRefresh(new Date());
      }, 20 * 60 * 1000); // 20 minutes instead of 10

      return () => {
        supabase.removeChannel(locationChannel);
        clearInterval(refreshInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchTrackingData = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc("get_tracking_data", { p_order_id: orderId })
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Tracking data not available for this order");
        setLoading(false);
        return;
      }

      setTrackingData(data as TrackingData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching tracking data:", err);
      setError(err.message || "Failed to load tracking data");
      setLoading(false);
    }
  };

  const fetchRoute = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("driver_locations")
        .select("latitude, longitude, created_at, order_id")
        .eq("order_id", orderId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // Transform data to include order_id
      const routeData: LocationPoint[] = (data || []).map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        created_at: point.created_at,
        order_id: point.order_id || orderId
      }));

      setRoute(routeData);
    } catch (err: any) {
      console.error("Error fetching route:", err);
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_progress: "bg-indigo-500",
      in_transit: "bg-purple-500",
      loaded: "bg-green-500",
      unloading: "bg-yellow-500",
      completed: "bg-emerald-600",
    };
    return colors[status] || "bg-gray-500";
  };

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

  const routePath = route.map((point) => ({
    lat: point.latitude,
    lng: point.longitude,
  }));

  const currentPosition = trackingData.current_lat && trackingData.current_lng
    ? { lat: trackingData.current_lat, lng: trackingData.current_lng }
    : routePath[routePath.length - 1];

  // Calculate map center considering all available points
  const getMapCenter = () => {
    const points: google.maps.LatLngLiteral[] = [];
    
    // Add current position
    if (currentPosition) points.push(currentPosition);
    
    // Add loading point
    if (trackingData.loading_point_location) {
      points.push(parsePostGISPoint(trackingData.loading_point_location));
    }
    
    // Add unloading point
    if (trackingData.unloading_point_location) {
      points.push(parsePostGISPoint(trackingData.unloading_point_location));
    }
    
    // Add some points from the planned route for better centering
    if (directionsRoute.length > 0) {
      points.push(...directionsRoute.slice(0, Math.min(5, directionsRoute.length)));
    }
    
    if (points.length === 0) return { lat: 0, lng: 0 };
    if (points.length === 1) return points[0];
    
    // Calculate center of all points
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    
    return { lat: avgLat, lng: avgLng };
  };

  const mapCenter = getMapCenter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header - No navigation or menu */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-4xl">🚚</span>
                <div>
                  <h1 className="text-3xl font-bold">
                    Live Tracking
                  </h1>
                  <p className="text-blue-100 mt-1">
                    Order #{trackingData.order_number}
                  </p>
                </div>
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
        {/* Order Details Card */}
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
                    ⏸️ Tracking is not currently active for this order
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Progress Dashboard */}
        {routeProgress && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Route Progress
                </h2>
                <p className="text-gray-600 mt-1">
                  Real-time tracking with ETA calculations
                </p>
              </div>
            </div>

            {/* Main Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Route Progress</span>
                <span className="text-sm font-bold text-gray-900">
                  {routeProgress.progressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all duration-500 bg-green-500"
                  style={{ width: `${Math.min(routeProgress.progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* ETA */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⏱️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Estimated Arrival</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {routeProgress.estimatedTimeRemaining > 0 
                        ? formatDuration(routeProgress.estimatedTimeRemaining)
                        : "Arrived"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Distance Completed */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Distance Traveled</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatDistance(routeProgress.completedDistance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Distance Remaining */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Distance Remaining</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatDistance(routeProgress.totalDistance - routeProgress.completedDistance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Average Speed */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-amber-600">Average Speed</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {routeProgress.averageSpeed > 0 
                        ? `${routeProgress.averageSpeed.toFixed(1)} km/h`
                        : "Calculating..."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Location</h2>
            <div className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>

        {/* Enhanced Map with Progressive Route Visualization */}
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
              {/* Planned Route (light gray) - Shows the intended Google Directions route */}
              {directionsRoute.length > 1 && (
                <PolylineTyped
                  path={directionsRoute}
                  options={{
                    strokeColor: "#9CA3AF", // Light gray
                    strokeOpacity: 0.5,
                    strokeWeight: 3,
                    strokeLineCap: "round",
                    strokeLineJoin: "round",
                    zIndex: 0,
                  }}
                />
              )}

              {/* Enhanced Route Visualization */}
              {routeProgress && (
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
                        strokeLineCap: "round",
                        strokeLineJoin: "round",
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
                    title={`${trackingData.driver_name} - ${routeProgress.progressPercentage.toFixed(1)}% Complete`}
                  />
                </>
              )}

              {/* Fallback: Show planned route if no driver tracking yet */}
              {!routeProgress && !routePath.length && directionsRoute.length > 1 && (
                <PolylineTyped
                  path={directionsRoute}
                  options={{
                    strokeColor: "#6366F1", // Indigo
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    strokeLineCap: "round",
                    strokeLineJoin: "round",
                  }}
                />
              )}

              {/* Fallback: Basic route if no progress calculated but driver tracking exists */}
              {!routeProgress && routePath.length > 1 && (
                <PolylineTyped
                  path={routePath}
                  options={{
                    strokeColor: "#10B981", // Green - actual driver path
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              )}

              {/* Fallback: Current position if no progress calculated */}
              {!routeProgress && currentPosition && (
                <MarkerTyped
                  position={currentPosition}
                  icon={{
                    path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                    scale: 12,
                    fillColor: "#10B981",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 3,
                  }}
                  title={`${trackingData.driver_name} - Last Update: ${formatTime(trackingData.last_update)}`}
                />
              )}

              {/* Loading and Unloading Point Markers */}
              {trackingData.loading_point_location && (
                <MarkerTyped
                  position={parsePostGISPoint(trackingData.loading_point_location)}
                  icon={{
                    path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                    scale: 10,
                    fillColor: "#F59E0B", // Amber for start
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
                    fillColor: "#8B5CF6", // Purple for destination
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

          {/* Enhanced Map Legend */}
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
                📍 Last location update: <span className="font-semibold">{formatTime(trackingData.last_update)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This page automatically refreshes every 10 minutes. Real-time updates are enabled.
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Footer - Simple branding only */}
        <div className="mt-8 text-center pb-8">
          <p className="text-sm text-gray-500">
            🚚 Real-time tracking powered by Mobile Order Tracker
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Auto-refreshing every 10 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
