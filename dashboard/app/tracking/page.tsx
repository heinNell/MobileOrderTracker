// Live Tracking Page - Real-time Vehicle Location Visualization
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Order, LocationUpdate } from "../../../shared/types";
import { useRouter } from "next/navigation";
import { parsePostGISPoint } from "../../../shared/locationUtils";
// @ts-ignore
import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";

export default function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const router = useRouter();

  // Map container style
  const mapContainerStyle = {
    width: "100%",
    height: "calc(100vh - 200px)",
  };

  // Default map options
  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  useEffect(() => {
    checkAuth();
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
    subscribeToLocationUpdates();
  };

  const fetchOrders = async () => {
    try {
      // Fetch active orders (in_transit or loaded status)
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
        .in("status", ["in_transit", "loaded", "unloading"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      
      // Set initial map center to first order's loading point if available
      if (data && data.length > 0) {
        const firstOrder = data[0];
        const loadingPoint = parsePostGISPoint(firstOrder.loading_point_location);
        setMapCenter({
          lat: loadingPoint.latitude,
          lng: loadingPoint.longitude,
        });
        setMapZoom(10);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLocationUpdates = () => {
    // Subscribe to location updates
    const locationChannel = supabase
      .channel("location_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_updates",
        },
        (payload) => {
          const newLocation = payload.new as LocationUpdate;
          setLocationUpdates((prev) => {
            // Add new location update to the beginning of the array
            const updated = [newLocation, ...prev];
            // Keep only the latest 100 updates to prevent memory issues
            return updated.slice(0, 100);
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
      if (!orderLocations[update.order_id] || 
          new Date(update.timestamp) > new Date(orderLocations[update.order_id].timestamp)) {
        orderLocations[update.order_id] = update;
      }
    });
    
    return Object.values(orderLocations);
  };

  // Get route points for an order
  const getOrderRoute = (orderId: string) => {
    return locationUpdates
      .filter(update => update.order_id === orderId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(update => ({
        lat: update.location.latitude,
        lng: update.location.longitude,
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
          <p className="text-gray-600 mt-2">
            Real-time tracking of active deliveries
          </p>
        </div>

        {/* Active Orders Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">No active deliveries at the moment</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => {
                const latestLocation = orderLocations.find(loc => loc.order_id === order.id);
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
              {selectedOrder 
                ? `Tracking: Order ${selectedOrder.order_number}` 
                : "Live Map View"}
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

          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={mapOptions}
            >
              {/* Render routes for all orders or selected order */}
              {(selectedOrder ? [selectedOrder] : orders).map((order) => {
                const route = getOrderRoute(order.id);
                if (route.length === 0) return null;
                
                return (
                  <Polyline
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
                const order = orders.find(o => o.id === location.order_id);
                if (!order) return null;
                
                // Highlight selected order
                const isHighlighted = selectedOrder?.id === order.id;
                
                return (
                  <Marker
                    key={location.id}
                    position={{
                      lat: location.location.latitude,
                      lng: location.location.longitude,
                    }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: isHighlighted ? 12 : 8,
                      fillColor: isHighlighted ? "#4F46E5" : "#10B981",
                      fillOpacity: 1,
                      strokeColor: "#FFFFFF",
                      strokeWeight: 2,
                    }}
                    title={`Order: ${order.order_number}\nDriver: ${order.assigned_driver?.full_name || "Unknown"}`}
                    onClick={() => setSelectedOrder(order)}
                  />
                );
              })}

              {/* Render loading and unloading points */}
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  {/* Loading point */}
                  <Marker
                    position={parsePostGISPoint(order.loading_point_location)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: "#EF4444",
                      fillOpacity: 1,
                      strokeColor: "#FFFFFF",
                      strokeWeight: 1,
                    }}
                    title={`Loading: ${order.loading_point_name}`}
                  />
                  
                  {/* Unloading point */}
                  <Marker
                    position={parsePostGISPoint(order.unloading_point_location)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: "#3B82F6",
                      fillOpacity: 1,
                      strokeColor: "#FFFFFF",
                      strokeWeight: 1,
                    }}
                    title={`Unloading: ${order.unloading_point_name}`}
                  />
                </React.Fragment>
              ))}
            </GoogleMap>
          </LoadScript>

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