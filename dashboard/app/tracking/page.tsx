// Live Tracking Page - Real-time Vehicle Location Visualization
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { parsePostGISPoint } from "../../shared/locationUtils";
import type { LocationUpdate, Order } from "../../shared/types";
// Import Google Maps components with type overrides
import
  {
    GoogleMap,
    LoadScript,
    Marker,
    Polyline
  } from "@react-google-maps/api";

// Type overrides for Google Maps components
const GoogleMapTyped = GoogleMap as any;
const LoadScriptTyped = LoadScript as any;
const MarkerTyped = Marker as any;
const PolylineTyped = Polyline as any;

export default function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const router = useRouter();

  // Map container style
  const mapContainerStyle: React.CSSProperties = {
    width: "100%",
    height: "calc(100vh - 200px)",
  };

  // Default map options
  const mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  useEffect(() => {
    checkAuth();
    
    // Auto-refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing tracking data...");
      fetchOrders();
      fetchDriverLocations();
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    fetchOrders();
    fetchDriverLocations();
    subscribeToLocationUpdates();
  };

  // Normalize both possible shapes to { lat, lng } safely
  const toLatLngLiteral = (
    loc: { latitude: number; longitude: number } | { lat: number; lng: number }
  ): google.maps.LatLngLiteral => {
    const maybeAny = loc as any;
    if (
      typeof maybeAny.lat === "number" &&
      typeof maybeAny.lng === "number"
    ) {
      return { lat: maybeAny.lat, lng: maybeAny.lng };
    }
    if (
      typeof maybeAny.latitude === "number" &&
      typeof maybeAny.longitude === "number"
    ) {
      return { lat: maybeAny.latitude, lng: maybeAny.longitude };
    }
    throw new Error("Invalid location object: expected {lat,lng} or {latitude,longitude}");
  };

  const fetchOrders = async () => {
    try {
      // Fetch active orders (all trackable statuses)
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `
        )
        .in("status", ["assigned", "activated", "in_progress", "in_transit", "loaded", "unloading", "loading", "arrived"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      // Set initial map center to first order's loading point if available
      if (data && data.length > 0) {
        const firstOrder = data[0];
        const loadingPointRaw = parsePostGISPoint(firstOrder.loading_point_location);
        const loadingPoint = toLatLngLiteral(loadingPointRaw);
        setMapCenter(loadingPoint);
        setMapZoom(10);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverLocations = async () => {
    try {
      // Fetch recent driver locations (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("driver_locations")
        .select(`
          *,
          driver:users!driver_locations_driver_id_fkey(
            id,
            full_name,
            email
          ),
          order:orders!driver_locations_order_id_fkey(
            id,
            order_number,
            status
          )
        `)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLocationUpdates(data || []);
      console.log("Fetched driver locations:", data?.length || 0);
    } catch (error) {
      console.error("Error fetching driver locations:", error);
    }
  };

  const subscribeToLocationUpdates = () => {
    // Subscribe to driver location updates
    const locationChannel = supabase
      .channel("driver_location_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
        },
        (payload) => {
          console.log("New driver location received:", payload.new);
          const newLocation = payload.new as LocationUpdate;
          setLocationUpdates((prev) => {
            // Add new location update to the beginning of the array
            const updated = [newLocation, ...prev];
            // Keep only the latest 200 updates to prevent memory issues
            return updated.slice(0, 200);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getStatusColor = (status: string): string => {
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
    return colors[status] || "bg-gray-500";
  };

  // Get the latest location for each order
  const getOrderLocations = () => {
    const orderLocations: Record<string, LocationUpdate> = {};

    // For each location update, keep only the latest one per order
    locationUpdates.forEach((update) => {
      const existingLocation = orderLocations[update.order_id];
      if (
        !existingLocation ||
        new Date(update.timestamp) > new Date(existingLocation.timestamp)
      ) {
        orderLocations[update.order_id] = update;
      }
    });

    return Object.values(orderLocations);
  };

  // Get route points for an order
  const getOrderRoute = (orderId: string): google.maps.LatLngLiteral[] => {
    return locationUpdates
      .filter((update) => update.order_id === orderId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((update) => ({
        // Handle both old location.latitude format and new direct latitude format
        lat: update.latitude || update.location?.latitude || 0,
        lng: update.longitude || update.location?.longitude || 0,
      }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading tracking data...</div>
      </div>
    );
  }

  const orderLocations = getOrderLocations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Live Tracking</h1>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">Real-time tracking of active deliveries</p>
        </div>

        {/* Active Orders Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">No active deliveries at the moment</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => {
                const latestLocation = orderLocations.find((loc) => loc.order_id === order.id);
                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      selectedOrder?.id === order.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
                        <p className="text-sm text-gray-600">
                          {order.assigned_driver?.full_name || "Unassigned"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-3 text-sm">
                      <p className="font-medium">{order.loading_point_name}</p>
                      <p className="text-gray-600">to</p>
                      <p className="font-medium">{order.unloading_point_name}</p>
                    </div>
                    {latestLocation && (
                      <div className="mt-3 text-xs text-gray-500">
                        Last update: {new Date(latestLocation.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedOrder ? `Tracking: Order ${selectedOrder.order_number}` : "Live Map View"}
            </h2>
            {selectedOrder && (
              <button
                onClick={() => setSelectedOrder(null)}
                className="mt-2 md:mt-0 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
              >
                Clear Selection
              </button>
            )}
          </div>

          <LoadScriptTyped googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
            <GoogleMapTyped mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={mapZoom} options={mapOptions}>
              {/* Render routes for all orders or selected order */}
              {(selectedOrder ? [selectedOrder] : orders).map((order) => {
                const route = getOrderRoute(order.id);
                if (route.length === 0) return null;

                return (
                  <PolylineTyped
                    key={`route-${order.id}`}
                    path={route}
                    options={{
                      strokeColor: "#4F46E5",
                      strokeOpacity: 0.6,
                      strokeWeight: 4,
                    }}
                  />
                );
              })}

              {/* Render markers for latest locations */}
              {orderLocations.map((location) => {
                const order = orders.find((o) => o.id === location.order_id);
                if (!order) return null;

                // Highlight selected order
                const isHighlighted = selectedOrder?.id === order.id;

                const position: google.maps.LatLngLiteral = {
                  lat: location.latitude || location.location?.latitude || 0,
                  lng: location.longitude || location.location?.longitude || 0,
                };

                return (
                  <MarkerTyped
                    key={location.id}
                    position={position}
                    icon={{
                      // Custom SVG path for circle (equivalent to SymbolPath.CIRCLE)
                      path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                      scale: isHighlighted ? 12 : 8,
                      fillColor: isHighlighted ? "#4F46E5" : "#10B981",
                      fillOpacity: 1,
                      strokeColor: "#FFFFFF",
                      strokeWeight: 2,
                    }}
                    title={`Order: ${order.order_number || 'N/A'}\nDriver: ${order.assigned_driver?.full_name || "Unknown"}`}
                    onClick={() => setSelectedOrder(order)}
                  />
                );
              })}

              {/* Render loading and unloading points */}
              {orders.map((order) => {
                const loadingPointRaw = parsePostGISPoint(order.loading_point_location);
                const unloadingPointRaw = parsePostGISPoint(order.unloading_point_location);
                const loadingPoint = toLatLngLiteral(loadingPointRaw);
                const unloadingPoint = toLatLngLiteral(unloadingPointRaw);

                return (
                  <React.Fragment key={order.id}>
                    {/* Loading point */}
                    <MarkerTyped
                      position={loadingPoint}
                      icon={{
                        // Custom SVG path for circle (equivalent to SymbolPath.CIRCLE)
                        path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                        scale: 6,
                        fillColor: "#EF4444",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 1,
                      }}
                      title={`Loading: ${order.loading_point_name || 'Unknown'}`}
                    />

                    {/* Unloading point */}
                    <MarkerTyped
                      position={unloadingPoint}
                      icon={{
                        // Custom SVG path for circle (equivalent to SymbolPath.CIRCLE)
                        path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                        scale: 6,
                        fillColor: "#3B82F6",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 1,
                      }}
                      title={`Unloading: ${order.unloading_point_name || 'Unknown'}`}
                    />
                  </React.Fragment>
                );
              })}
            </GoogleMapTyped>
          </LoadScriptTyped>

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span>Vehicle Location</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span>Loading Point</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
              <span>Unloading Point</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-1 bg-indigo-500 mr-2"></div>
              <span>Vehicle Route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}