"use client";

import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

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
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  created_at: string;
}

const GoogleMapTyped = GoogleMap as any;
const LoadScriptTyped = LoadScript as any;
const MarkerTyped = Marker as any;
const PolylineTyped = Polyline as any;

export default function PublicTrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Standalone public page - no authentication required
  // No navigation menu, no login/logout buttons
  
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

      // Refresh every 10 minutes
      const refreshInterval = setInterval(() => {
        fetchTrackingData();
        fetchRoute();
        setLastRefresh(new Date());
      }, 10 * 60 * 1000); // 10 minutes

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
        .select("latitude, longitude, created_at")
        .eq("order_id", orderId)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      setRoute(data || []);
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

  const mapCenter = currentPosition || { lat: 0, lng: 0 };

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

        {/* Map Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Location</h2>
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
            >
              {/* Route polyline */}
              {routePath.length > 1 && (
                <PolylineTyped
                  path={routePath}
                  options={{
                    strokeColor: "#4F46E5",
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              )}

              {/* Current position marker */}
              {currentPosition && (
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
            </GoogleMapTyped>
          </LoadScriptTyped>

          {/* Map Legend */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span>Current Location</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-indigo-500 mr-2"></div>
              <span>Route</span>
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
