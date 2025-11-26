// Live Tracking Page - Real-time Vehicle Location Visualization
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import
  {
    createEnhancedRouteData,
    ETACalculator,
    formatDistance,
    formatDuration,
    getStatusColor,
    isValidCoordinate,
    parsePostGISPoint,
    RouteProgressCalculator,
    type EnhancedRouteData,
    type ETAData,
    type LatLngLiteral,
  } from "../../lib/routeUtils";
import { supabase } from "../../lib/supabase";
import type { LocationUpdate, Order } from "../../shared/types";

// Dynamic import for Leaflet map (client-side only)
const TrackingMap = dynamic(
  () => import("../../components/TrackingMap").then((mod) => ({ default: mod.TrackingMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium">Loading map...</p>
        </div>
      </div>
    )
  }
);

type LatLngTuple = [number, number];

export default function TrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  // Default center: Pretoria, South Africa (valid coordinates)
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([-25.7479, 28.2293]);
  const [mapZoom, setMapZoom] = useState(6);
  const [plannedRoutes, setPlannedRoutes] = useState<Record<string, LatLngLiteral[]>>({});
  const [enhancedRoutes, setEnhancedRoutes] = useState<Record<string, EnhancedRouteData>>({});
  const [etaByOrder, setETAByOrder] = useState<Record<string, ETAData>>({});

  const router = useRouter();

  // Refs for optimized services
  const routeCalculatorRef = useRef(new RouteProgressCalculator());
  const etaCalculatorsRef = useRef<Record<string, ETACalculator>>({});
  const previousLocationsRef = useRef<Record<string, LocationUpdate>>({});
  const isMountedRef = useRef(true);
  const locationChannelRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    // Capture ref values at effect time for cleanup
    const routeCalculator = routeCalculatorRef.current;
    const etaCalculators = etaCalculatorsRef.current;
    const refreshInterval = refreshIntervalRef.current;
    const locationChannel = locationChannelRef.current;

    return () => {
      isMountedRef.current = false;
      routeCalculator.clearCache();
      Object.values(etaCalculators).forEach((calc) => calc.clearHistory());
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (locationChannel) {
        supabase.removeChannel(locationChannel);
      }
    };
  }, []);

  // Initialize and check auth
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch planned routes when orders are loaded
  useEffect(() => {
    if (orders.length > 0) {
      fetchPlannedRoutesForOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Calculate enhanced routes whenever orders, locations, or planned routes change
  useEffect(() => {
    calculateEnhancedRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, locationUpdates, plannedRoutes]);

  // Check authentication
  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      if (isMountedRef.current) {
        setUser(session.user);
      }

      fetchOrders();
      fetchDriverLocations();
      subscribeToLocationUpdates();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/login");
    }
  };

  // Set up auto-refresh interval
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing tracking data (15min interval)...");
      fetchOrders();
      fetchDriverLocations();
    }, 15 * 60 * 1000);

    refreshIntervalRef.current = refreshInterval;

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Parse coordinates from either lat/lng columns or PostGIS location
  const getOrderCoordinates = useCallback((order: Order) => {
    // First try to use the new latitude/longitude columns
    if (order.loading_point_latitude && order.loading_point_longitude && 
        order.unloading_point_latitude && order.unloading_point_longitude) {
      const loadingLat = Number(order.loading_point_latitude);
      const loadingLng = Number(order.loading_point_longitude);
      const unloadingLat = Number(order.unloading_point_latitude);
      const unloadingLng = Number(order.unloading_point_longitude);
      
      // Validate coordinates are not zero and are valid numbers
      if (loadingLat !== 0 && loadingLng !== 0 && 
          unloadingLat !== 0 && unloadingLng !== 0 &&
          isFinite(loadingLat) && isFinite(loadingLng) &&
          isFinite(unloadingLat) && isFinite(unloadingLng)) {
        return {
          loadingPoint: { lat: loadingLat, lng: loadingLng },
          unloadingPoint: { lat: unloadingLat, lng: unloadingLng }
        };
      }
    }
    
    // Fallback to PostGIS location parsing (only if not WKB format)
    try {
      // Check if the location is in WKB format (hexadecimal starting with 0101000...)
      const isWKB = typeof order.loading_point_location === 'string' && 
                    (order.loading_point_location.startsWith('0101000020') || 
                     order.loading_point_location.startsWith('0101000000'));
      
      if (!isWKB) {
        const loadingPoint = parsePostGISPoint(order.loading_point_location);
        const unloadingPoint = parsePostGISPoint(order.unloading_point_location);
        
        // Only return if we got valid coordinates (not 0,0)
        if ((loadingPoint.lat !== 0 || loadingPoint.lng !== 0) &&
            (unloadingPoint.lat !== 0 || unloadingPoint.lng !== 0)) {
          return { loadingPoint, unloadingPoint };
        }
      }
    } catch (error) {
      console.error(`Error parsing coordinates for order ${order.id}:`, error);
    }
    
    // Return zeros as fallback - calling code should check with isValidCoordinate()
    return {
      loadingPoint: { lat: 0, lng: 0 },
      unloadingPoint: { lat: 0, lng: 0 }
    };
  }, []);

  // Fetch planned route using OpenRouteService or fallback to direct line
  const fetchPlannedRoute = useCallback(
    async (origin: LatLngLiteral, destination: LatLngLiteral): Promise<LatLngLiteral[]> => {
      // Validate coordinates before making API call
      if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
        console.warn("Invalid origin or destination coordinates:", { origin, destination });
        return [];
      }

      // Try OpenRouteService if API key is available
      if (process.env.NEXT_PUBLIC_ORS_API_KEY) {
        try {
          const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_API_KEY}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features?.[0]?.geometry?.coordinates) {
              const path = data.features[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => ({ lat, lng })
              );
              console.log("Planned route fetched from ORS:", path.length, "points");
              return path;
            }
          }
        } catch (error) {
          console.warn("ORS API temporarily unavailable, using direct line");
        }
      }

      // Fallback: Return direct line between points
      console.log("Using direct line between points (no API key)");
      return [origin, destination];
    },
    []
  );

  // Fetch planned routes for all orders
  const fetchPlannedRoutesForOrders = useCallback(async () => {
    if (orders.length === 0) return;

    const newPlannedRoutes: Record<string, LatLngLiteral[]> = {};

    for (const order of orders) {
      try {
        const { loadingPoint, unloadingPoint } = getOrderCoordinates(order);

        if (isValidCoordinate(loadingPoint) && isValidCoordinate(unloadingPoint)) {
          const plannedRoute = await fetchPlannedRoute(loadingPoint, unloadingPoint);
          if (plannedRoute.length > 0) {
            newPlannedRoutes[order.id] = plannedRoute;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch route for order ${order.id}:`, error);
      }
    }

    if (isMountedRef.current) {
      setPlannedRoutes(newPlannedRoutes);
    }
  }, [orders, fetchPlannedRoute, getOrderCoordinates]);

  // Get latest location for each order
  const getOrderLocations = useCallback(() => {
    const orderLocations: Record<string, LocationUpdate> = {};

    console.log("Processing location updates:", locationUpdates.length);
    
    locationUpdates.forEach((update) => {
      const existingLocation = orderLocations[update.order_id];
      if (
        !existingLocation ||
        new Date(update.timestamp).getTime() > new Date(existingLocation.timestamp).getTime()
      ) {
        orderLocations[update.order_id] = update;
      }
    });

    console.log("Order locations mapped:", Object.keys(orderLocations).length, "orders with locations");
    console.log("Order IDs with locations:", Object.keys(orderLocations));
    
    return orderLocations;
  }, [locationUpdates]);

  // Get route points for an order
  const getOrderRoute = useCallback(
    (orderId: string): LatLngLiteral[] => {
      return locationUpdates
        .filter((update) => update.order_id === orderId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((update) => {
          // Parse latitude/longitude - they come as strings from DB
          const lat = typeof update.latitude === 'string' ? parseFloat(update.latitude) : update.latitude;
          const lng = typeof update.longitude === 'string' ? parseFloat(update.longitude) : update.longitude;
          
          return {
            lat: lat || update.location?.latitude || 0,
            lng: lng || update.location?.longitude || 0,
          };
        })
        .filter((point) => point.lat !== 0 && point.lng !== 0);
    },
    [locationUpdates]
  );

  const getFallbackRoute = useCallback(
    (order: Order): LatLngLiteral[] => {
      try {
        const { loadingPoint, unloadingPoint } = getOrderCoordinates(order);

        if (isValidCoordinate(loadingPoint) && isValidCoordinate(unloadingPoint)) {
          return [loadingPoint, unloadingPoint];
        }
      } catch (error) {
        console.error(`Error building fallback route for order ${order.id}:`, error);
      }

      return [];
    },
    [getOrderCoordinates]
  );

  // Calculate enhanced routes for all orders
  const calculateEnhancedRoutes = useCallback(() => {
    const newEnhancedRoutes: Record<string, EnhancedRouteData> = {};
    const newETAByOrder: Record<string, ETAData> = {};
    const orderLocations = getOrderLocations();

    orders.forEach((order) => {
      try {
        const actualRoute = getOrderRoute(order.id);
        const fallbackRoute = getFallbackRoute(order);
        const plannedRouteCandidate = plannedRoutes[order.id] || [];
        const plannedRoute =
          plannedRouteCandidate.length > 1
            ? plannedRouteCandidate
            : fallbackRoute.length > 1
              ? fallbackRoute
              : plannedRouteCandidate;
        const latestLocation = orderLocations[order.id];

        // Ensure ETA calculator exists for this order
        if (!etaCalculatorsRef.current[order.id]) {
          etaCalculatorsRef.current[order.id] = new ETACalculator();
        }

        // Add location to ETA calculator for speed trending
        if (latestLocation && previousLocationsRef.current[order.id]) {
          const prevLocation = previousLocationsRef.current[order.id];
          const prevPoint = {
            lat: prevLocation.latitude || prevLocation.location?.latitude || 0,
            lng: prevLocation.longitude || prevLocation.location?.longitude || 0,
          };
          const currPoint = {
            lat: latestLocation.latitude || latestLocation.location?.latitude || 0,
            lng: latestLocation.longitude || latestLocation.location?.longitude || 0,
          };
          
          if (prevPoint.lat !== 0 && currPoint.lat !== 0) {
            etaCalculatorsRef.current[order.id].addLocationUpdate(
              currPoint,
              prevPoint,
              new Date(latestLocation.timestamp)
            );
          }
        }

        if (latestLocation) {
          previousLocationsRef.current[order.id] = latestLocation;
        }

        // Get current position
        let currentPosition: LatLngLiteral = { lat: 0, lng: 0 };
        if (latestLocation) {
          currentPosition = {
            lat: latestLocation.latitude || latestLocation.location?.latitude || 0,
            lng: latestLocation.longitude || latestLocation.location?.longitude || 0,
          };
        } else if (actualRoute.length > 0) {
          currentPosition = actualRoute[actualRoute.length - 1];
        } else if (plannedRoute.length > 0) {
          currentPosition = plannedRoute[0];
        } else if (fallbackRoute.length > 0) {
          currentPosition = fallbackRoute[0];
        }

        // Create enhanced route data
        if (currentPosition.lat !== 0 && currentPosition.lng !== 0) {
          const enhanced = createEnhancedRouteData(
            order.id,
            actualRoute,
            plannedRoute.length > 0
              ? plannedRoute
              : fallbackRoute.length > 0
                ? fallbackRoute
                : [currentPosition],
            currentPosition,
            routeCalculatorRef.current,
            etaCalculatorsRef.current[order.id]
          );

          if (enhanced) {
            newEnhancedRoutes[order.id] = enhanced;
            if (enhanced.eta) {
              newETAByOrder[order.id] = enhanced.eta;
            }
          }
        }
      } catch (error) {
        console.error(`Error calculating enhanced route for order ${order.id}:`, error);
      }
    });

    if (isMountedRef.current) {
      setEnhancedRoutes(newEnhancedRoutes);
      setETAByOrder(newETAByOrder);
    }
  }, [orders, plannedRoutes, getOrderLocations, getOrderRoute, getFallbackRoute]);

  // Fetch active orders
  const fetchOrders = useCallback(async () => {
    try {
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
        .in("status", [
          "assigned",
          "activated",
          "in_progress",
          "in_transit",
          "arrived",
          "arrived_at_loading_point",
          "loading",
          "loaded",
          "arrived_at_unloading_point",
          "unloading",
          "delivered",
        ])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMountedRef.current) {
        setOrders(data || []);

        // Set initial map center using new coordinate fields or fallback to PostGIS
        if (data && data.length > 0) {
          try {
            const firstOrder = data[0];
            const { loadingPoint } = getOrderCoordinates(firstOrder);
            if (isValidCoordinate(loadingPoint)) {
              // Ensure coordinates are valid finite numbers
              const lat = typeof loadingPoint.lat === 'number' ? loadingPoint.lat : parseFloat(String(loadingPoint.lat));
              const lng = typeof loadingPoint.lng === 'number' ? loadingPoint.lng : parseFloat(String(loadingPoint.lng));
              
              if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
                setMapCenter([lat, lng]);
                setMapZoom(10);
                console.log("Map centered at:", { lat, lng });
              } else {
                console.warn("Invalid coordinates parsed:", { lat, lng });
              }
            }
          } catch (err) {
            console.error("Failed to set map center:", err);
          }
        }

        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [getOrderCoordinates]);

  // Fetch driver locations using optimized function
  const fetchDriverLocations = useCallback(async () => {
    try {
      console.log("🔍 Fetching driver locations...");

      // First, try using the optimized function
      let { data, error } = await supabase.rpc('get_latest_driver_locations');

      if (error) {
        console.warn("Function call failed, falling back to direct query:", error);
        
        // Fallback to direct query with updated schema
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const fallbackResult = await supabase
          .from("driver_locations")
          .select(`
            id,
            driver_id,
            order_id,
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
            timestamp,
            created_at,
            location_source
          `)
          .gte("created_at", twentyFourHoursAgo)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("created_at", { ascending: false });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      if (isMountedRef.current) {
        // Parse and validate location data
        const parsedData = (data || []).map(location => {
          // Handle both numeric and string coordinates
          const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
          const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
          
          return {
            ...location,
            latitude: lat,
            longitude: lng,
            // Use timestamp if available, fallback to created_at
            timestamp: location.timestamp || location.created_at
          };
        }).filter(location => {
          // Filter out invalid coordinates
          return location.latitude && location.longitude && 
                 !isNaN(location.latitude) && !isNaN(location.longitude) &&
                 location.latitude !== 0 && location.longitude !== 0;
        });
        
        setLocationUpdates(parsedData);
        console.log("✅ Fetched driver locations:", parsedData?.length || 0);
        
        // Debug: Show the location data
        if (parsedData && parsedData.length > 0) {
          console.log("📍 Sample location:", parsedData[0]);
          console.log("🎯 Sample coordinates:", { lat: parsedData[0].latitude, lng: parsedData[0].longitude });
          console.log("📋 Order IDs with locations:", [...new Set(parsedData.map(d => d.order_id))]);
          console.log("👥 Driver IDs with locations:", [...new Set(parsedData.map(d => d.driver_id))]);
        } else {
          console.warn("⚠️ No valid driver locations found in last 24 hours");
          
          // Additional debugging - check if table has any data at all
          const { data: totalCheck } = await supabase
            .from("driver_locations")
            .select("count", { count: 'exact' });
          console.log("📊 Total driver_locations records:", totalCheck);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching driver locations:", error);
    }
  }, []);

  // Subscribe to location updates
  const subscribeToLocationUpdates = useCallback(() => {
    try {
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
            const rawLocation = payload.new as LocationUpdate;
            
            // Parse latitude/longitude strings to numbers
            const newLocation = {
              ...rawLocation,
              latitude: typeof rawLocation.latitude === 'string' ? parseFloat(rawLocation.latitude) : rawLocation.latitude,
              longitude: typeof rawLocation.longitude === 'string' ? parseFloat(rawLocation.longitude) : rawLocation.longitude,
            };

            if (isMountedRef.current) {
              setLocationUpdates((prev) => {
                const updated = [newLocation, ...prev];
                return updated.slice(0, 200);
              });
            }
          }
        )
        .subscribe((status, err) => {
          console.log("📡 Location subscription status:", status);
          if (status === 'SUBSCRIBED') {
            console.log("✅ Successfully subscribed to driver location updates");
          } else if (status === 'CHANNEL_ERROR') {
            console.error("❌ Location subscription error:", err);
            console.error("💡 Possible fixes:");
            console.error("  1. Run ENABLE_REALTIME_SUBSCRIPTIONS.sql in Supabase SQL editor");
            console.error("  2. Check RLS policies allow SELECT on driver_locations");
            console.error("  3. Verify realtime is enabled: ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;");
          } else if (status === 'CLOSED') {
            console.warn("⚠️ Location subscription closed");
          }
        });

      locationChannelRef.current = locationChannel;

      // Also subscribe to order status changes to keep tracking page updated
      const ordersChannel = supabase
        .channel("tracking_orders_changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            console.log("Order status updated:", payload.new);
            if (isMountedRef.current) {
              setOrders((prev) =>
                prev.map((order) =>
                  order.id === payload.new.id
                    ? { ...order, ...payload.new }
                    : order
                )
              );
            }
          }
        )
        .subscribe((status, err) => {
          console.log("📡 Orders subscription status:", status);
          if (status === 'SUBSCRIBED') {
            console.log("✅ Successfully subscribed to order updates");
          } else if (status === 'CHANNEL_ERROR') {
            console.error("❌ Orders subscription error:", err);
            console.error("💡 Possible fixes:");
            console.error("  1. Run ENABLE_REALTIME_SUBSCRIPTIONS.sql in Supabase SQL editor");
            console.error("  2. Check RLS policies allow SELECT on orders");
            console.error("  3. Verify realtime is enabled: ALTER PUBLICATION supabase_realtime ADD TABLE orders;");
          } else if (status === 'CLOSED') {
            console.warn("⚠️ Orders subscription closed");
          }
        });

      return () => {
        if (locationChannelRef.current) {
          supabase.removeChannel(locationChannelRef.current);
        }
        supabase.removeChannel(ordersChannel);
      };
    } catch (error) {
      console.error("Error setting up subscriptions:", error);
    }
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading tracking data...</p>
          <p className="text-sm text-gray-700 mt-2">Fetching active orders and location updates...</p>
        </div>
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
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Live Tracking</h1>
            <button
              onClick={handleLogout}
              className="mt-4 md:mt-0 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
            >
              Logout
            </button>
          </div>
          <p className="text-gray-700 mt-2">Real-time tracking of active deliveries</p>
        </div>

        {/* Active Orders Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
          {orders.length === 0 ? (
            <p className="text-gray-700">No active deliveries at the moment</p>
          ) : (
            <>
              {locationUpdates.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>No GPS location data available.</strong> Orders are displayed but live tracking requires drivers to share their location from the mobile app.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => {
                const latestLocation = orderLocations[order.id];
                const eta = etaByOrder[order.id];
                const enhanced = enhancedRoutes[order.id];

                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      selectedOrder?.id === order.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
                        <p className="text-sm text-gray-700">
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

                    {/* Route Info */}
                    <div className="mt-3 text-sm mb-3">
                      <p className="font-medium">{order.loading_point_name}</p>
                      <p className="text-gray-700 text-xs">to</p>
                      <p className="font-medium">{order.unloading_point_name}</p>
                    </div>

                    {/* Progress Bar */}
                    {enhanced && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Progress</span>
                          <span className="text-xs font-bold text-gray-900">
                            {enhanced.progressPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(enhanced.progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* ETA Info */}
                    {eta && (
                      <div className="bg-blue-50 rounded p-2 text-xs mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">
                            ETA: {eta.estimatedArrivalTime.toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              eta.confidence === "high"
                                ? "bg-green-200 text-green-800"
                                : eta.confidence === "medium"
                                  ? "bg-yellow-200 text-yellow-800"
                                  : "bg-red-200 text-red-800"
                            }`}
                          >
                            {eta.confidence}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-700 mt-1">
                          <span>Speed: {eta.currentSpeed.toFixed(1)} km/h</span>
                          <span>
                            {eta.speedTrend === "increasing"
                              ? "📈"
                              : eta.speedTrend === "decreasing"
                                ? "📉"
                                : "➡️"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Last Update */}
                    {latestLocation && (
                      <div className="text-xs text-gray-700">
                        Last update: {new Date(latestLocation.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>

        {/* Map Container */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedOrder ? `Tracking: Order ${selectedOrder.order_number}` : "Live Map View"}
            </h2>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              {selectedOrder && (
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  Clear Selection
                </button>
              )}
              <button
                onClick={() => {
                  fetchOrders();
                  fetchDriverLocations();
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <span className="text-xs">🔄</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Leaflet Map */}
          <div style={{ width: "100%", height: "calc(100vh - 200px)", position: "relative" }}>
            {orders.length > 0 && isFinite(mapCenter[0]) && isFinite(mapCenter[1]) ? (
              <TrackingMap
                center={mapCenter}
                zoom={mapZoom}
                orders={orders}
                selectedOrder={selectedOrder}
                enhancedRoutes={enhancedRoutes}
                getOrderCoordinates={getOrderCoordinates}
                isValidCoordinate={isValidCoordinate}
                onSelectOrder={(order) => setSelectedOrder(order)}
              />
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center p-6">
                  <p className="text-gray-700 text-lg mb-2">No active orders to display</p>
                  <p className="text-gray-600 text-sm">Active orders will appear on the map once created</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center p-6">
                  <p className="text-gray-700 text-lg mb-2">Loading map...</p>
                  <p className="text-gray-600 text-sm">Initializing map coordinates</p>
                </div>
              </div>
            )}
          </div>

          {selectedOrder && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {(() => {
                const enhanced = enhancedRoutes[selectedOrder.id];
                const latestLocation = orderLocations[selectedOrder.id];
                const eta = etaByOrder[selectedOrder.id];
                const { loadingPoint, unloadingPoint } = getOrderCoordinates(selectedOrder);

                const currentLocationDisplay = enhanced?.currentPosition && isValidCoordinate(enhanced.currentPosition)
                  ? `${enhanced.currentPosition.lat.toFixed(4)}, ${enhanced.currentPosition.lng.toFixed(4)}`
                  : isValidCoordinate(loadingPoint)
                    ? `${loadingPoint.lat.toFixed(4)}, ${loadingPoint.lng.toFixed(4)}`
                    : "Not available";

                return (
                  <>
                    <div>
                      <p className="text-gray-700 uppercase tracking-wide text-xs font-semibold mb-1">Current Location</p>
                      <p className="text-gray-900 font-medium">{currentLocationDisplay}</p>
                      {latestLocation && (
                        <p className="text-gray-700 text-xs mt-1">
                          Last update: {new Date(latestLocation.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-700 uppercase tracking-wide text-xs font-semibold mb-1">Planned Route</p>
                      <p className="text-gray-900 font-medium">
                        {isValidCoordinate(loadingPoint) && isValidCoordinate(unloadingPoint)
                          ? `${selectedOrder.loading_point_name || "Loading"} → ${selectedOrder.unloading_point_name || "Unloading"}`
                          : "Not available"}
                      </p>
                      {isValidCoordinate(loadingPoint) && (
                        <p className="text-gray-700 text-xs mt-1">
                          Loading: {loadingPoint.lat.toFixed(4)}, {loadingPoint.lng.toFixed(4)}
                        </p>
                      )}
                      {isValidCoordinate(unloadingPoint) && (
                        <p className="text-gray-700 text-xs">
                          Unloading: {unloadingPoint.lat.toFixed(4)}, {unloadingPoint.lng.toFixed(4)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-700 uppercase tracking-wide text-xs font-semibold mb-1">Completed Route</p>
                      <p className="text-gray-900 font-medium">
                        {enhanced?.distanceMetrics
                          ? formatDistance(enhanced.distanceMetrics.completedDistance)
                          : "Not available"}
                      </p>
                      {enhanced?.distanceMetrics && (
                        <p className="text-gray-700 text-xs mt-1">
                          Progress: {enhanced.progressPercentage.toFixed(1)}%
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-700 uppercase tracking-wide text-xs font-semibold mb-1">Remaining Route</p>
                      <p className="text-gray-900 font-medium">
                        {enhanced?.distanceMetrics
                          ? formatDistance(enhanced.distanceMetrics.remainingDistance)
                          : "Not available"}
                      </p>
                      {eta && (
                        <p className="text-gray-700 text-xs mt-1">
                          ETA in {formatDuration(eta.estimatedDurationMinutes)} ({eta.confidence} confidence)
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
              <span>Current Vehicle Location</span>
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
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span className="font-semibold">L</span>
              <span className="ml-1">- Loading Point</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-600 mr-2"></div>
              <span className="font-semibold">U</span>
              <span className="ml-1">- Unloading Point</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
