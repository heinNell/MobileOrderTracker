// Live Tracking Page - Real-time Vehicle Location Visualization
"use client";

import
  {
    GoogleMap,
    LoadScript,
    Marker,
    Polyline
  } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [plannedRoutes, setPlannedRoutes] = useState<Record<string, LatLngLiteral[]>>({});
  const [enhancedRoutes, setEnhancedRoutes] = useState<Record<string, EnhancedRouteData>>({});
  const [etaByOrder, setETAByOrder] = useState<Record<string, ETAData>>({});

  const router = useRouter();

  // Refs for optimized services
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const routeCalculatorRef = useRef(new RouteProgressCalculator());
  const etaCalculatorsRef = useRef<Record<string, ETACalculator>>({});
  const previousLocationsRef = useRef<Record<string, LocationUpdate>>({});
  const isMountedRef = useRef(true);
  const locationChannelRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Map container style
  const mapContainerStyle: React.CSSProperties = {
    width: "100%",
    height: "calc(100vh - 200px)",
  };

  // Default map options
  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    }),
    []
  );

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

  // Initialize Google Maps services when map loads
  useEffect(() => {
    if (mapRef && !directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
      console.log("DirectionsService initialized");
    }
  }, [mapRef]);

  // Fetch planned routes when DirectionsService is ready
  useEffect(() => {
    if (directionsServiceRef.current && orders.length > 0) {
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
      return {
        loadingPoint: {
          lat: Number(order.loading_point_latitude),
          lng: Number(order.loading_point_longitude)
        },
        unloadingPoint: {
          lat: Number(order.unloading_point_latitude),
          lng: Number(order.unloading_point_longitude)
        }
      };
    }
    
    // Fallback to PostGIS location parsing
    try {
      const loadingPoint = parsePostGISPoint(order.loading_point_location);
      const unloadingPoint = parsePostGISPoint(order.unloading_point_location);
      return { loadingPoint, unloadingPoint };
    } catch (error) {
      console.error(`Error parsing coordinates for order ${order.id}:`, error);
      return {
        loadingPoint: { lat: 0, lng: 0 },
        unloadingPoint: { lat: 0, lng: 0 }
      };
    }
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

    locationUpdates.forEach((update) => {
      const existingLocation = orderLocations[update.order_id];
      if (
        !existingLocation ||
        new Date(update.timestamp).getTime() > new Date(existingLocation.timestamp).getTime()
      ) {
        orderLocations[update.order_id] = update;
      }
    });

    return orderLocations;
  }, [locationUpdates]);

  // Get route points for an order
  const getOrderRoute = useCallback(
    (orderId: string): LatLngLiteral[] => {
      return locationUpdates
        .filter((update) => update.order_id === orderId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((update) => ({
          lat: update.latitude || update.location?.latitude || 0,
          lng: update.longitude || update.location?.longitude || 0,
        }))
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
          "loaded",
          "unloading",
          "loading",
          "arrived",
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
              setMapCenter(loadingPoint);
              setMapZoom(10);
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

  // Fetch driver locations
  const fetchDriverLocations = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("driver_locations")
        .select(
          `
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
        `
        )
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMountedRef.current) {
        setLocationUpdates(data || []);
        console.log("Fetched driver locations:", data?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching driver locations:", error);
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
            const newLocation = payload.new as LocationUpdate;

            if (isMountedRef.current) {
              setLocationUpdates((prev) => {
                const updated = [newLocation, ...prev];
                return updated.slice(0, 200);
              });
            }
          }
        )
        .subscribe((status) => {
          console.log("Location subscription status:", status);
        });

      locationChannelRef.current = locationChannel;
    } catch (error) {
      console.error("Error setting up location subscription:", error);
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
          <p className="text-xl text-gray-600">Loading tracking data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching active orders and location updates...</p>
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

                    {/* Route Info */}
                    <div className="mt-3 text-sm mb-3">
                      <p className="font-medium">{order.loading_point_name}</p>
                      <p className="text-gray-600 text-xs">to</p>
                      <p className="font-medium">{order.unloading_point_name}</p>
                    </div>

                    {/* Progress Bar */}
                    {enhanced && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-600">Progress</span>
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
                        <div className="flex justify-between text-gray-600 mt-1">
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
                      <div className="text-xs text-gray-500">
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

          <LoadScriptTyped googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
            {orders.length > 0 && (
              <GoogleMapTyped
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                options={mapOptions}
                onLoad={(map: google.maps.Map) => setMapRef(map)}
              >
              {/* Render routes for selected or all orders */}
              {(selectedOrder ? [selectedOrder] : orders).map((order) => {
                try {
                  const enhanced = enhancedRoutes[order.id];
                  const isHighlighted = selectedOrder?.id === order.id;

                  if (!enhanced) return null;

                  return (
                    <React.Fragment key={order.id}>
                      {/* Planned Route (light gray) */}
                      {enhanced.plannedRoute && enhanced.plannedRoute.length > 1 && (
                        <PolylineTyped
                          path={enhanced.plannedRoute}
                          options={{
                            strokeColor: "#9CA3AF",
                            strokeOpacity: isHighlighted ? 0.7 : 0.3,
                            strokeWeight: isHighlighted ? 4 : 2,
                            strokeLineCap: "round",
                            strokeLineJoin: "round",
                            zIndex: 0,
                          }}
                        />
                      )}

                      {/* Completed Route (green) */}
                      {enhanced.completedPath && enhanced.completedPath.length > 1 && (
                        <PolylineTyped
                          path={enhanced.completedPath}
                          options={{
                            strokeColor: "#10B981",
                            strokeOpacity: 1,
                            strokeWeight: isHighlighted ? 6 : 4,
                            strokeLineCap: "round",
                            strokeLineJoin: "round",
                            zIndex: 2,
                          }}
                        />
                      )}

                      {/* Remaining Route (red) */}
                      {enhanced.remainingPath && enhanced.remainingPath.length > 1 && (
                        <PolylineTyped
                          path={enhanced.remainingPath}
                          options={{
                            strokeColor: "#EF4444",
                            strokeOpacity: 0.8,
                            strokeWeight: isHighlighted ? 5 : 3,
                            strokeLineCap: "round",
                            strokeLineJoin: "round",
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Current position marker */}
                      <MarkerTyped
                        position={enhanced.currentPosition}
                        icon={{
                          path: "M-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0",
                          scale: isHighlighted ? 15 : 10,
                          fillColor: isHighlighted ? "#3B82F6" : "#10B981",
                          fillOpacity: 1,
                          strokeColor: "#FFFFFF",
                          strokeWeight: isHighlighted ? 3 : 2,
                          zIndex: 3,
                        }}
                        title={`Order: ${order.order_number}\nDriver: ${order.assigned_driver?.full_name || "Unknown"}\nProgress: ${enhanced.progressPercentage.toFixed(1)}%`}
                        onClick={() => setSelectedOrder(order)}
                      />
                    </React.Fragment>
                  );
                } catch (error) {
                  console.error(`Error rendering routes for order ${order.id}:`, error);
                  return null;
                }
              })}

              {/* Loading and Unloading Points */}
              {orders.map((order) => {
                try {
                  const { loadingPoint, unloadingPoint } = getOrderCoordinates(order);

                  if (!isValidCoordinate(loadingPoint) || !isValidCoordinate(unloadingPoint)) {
                    return null;
                  }

                  const isHighlighted = selectedOrder?.id === order.id;

                  return (
                    <React.Fragment key={`points-${order.id}`}>
                      {/* Loading Point - Larger, more visible */}
                      <MarkerTyped
                        position={loadingPoint}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                          scaledSize: isHighlighted 
                            ? new google.maps.Size(48, 48) 
                            : new google.maps.Size(32, 32),
                        }}
                        label={{
                          text: "L",
                          color: "white",
                          fontSize: isHighlighted ? "16px" : "12px",
                          fontWeight: "bold",
                        }}
                        title={`Loading Point\n${order.loading_point_name}\nOrder: ${order.order_number}`}
                        zIndex={isHighlighted ? 10 : 5}
                      />

                      {/* Unloading Point - Larger, more visible */}
                      <MarkerTyped
                        position={unloadingPoint}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                          scaledSize: isHighlighted 
                            ? new google.maps.Size(48, 48) 
                            : new google.maps.Size(32, 32),
                        }}
                        label={{
                          text: "U",
                          color: "white",
                          fontSize: isHighlighted ? "16px" : "12px",
                          fontWeight: "bold",
                        }}
                        title={`Unloading Point\n${order.unloading_point_name}\nOrder: ${order.order_number}`}
                        zIndex={isHighlighted ? 10 : 5}
                      />
                    </React.Fragment>
                  );
                } catch (error) {
                  console.error(`Error rendering points for order ${order.id}:`, error);
                  return null;
                }
              })}
            </GoogleMapTyped>
            )}
          </LoadScriptTyped>

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
                      <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold mb-1">Current Location</p>
                      <p className="text-gray-900 font-medium">{currentLocationDisplay}</p>
                      {latestLocation && (
                        <p className="text-gray-500 text-xs mt-1">
                          Last update: {new Date(latestLocation.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold mb-1">Planned Route</p>
                      <p className="text-gray-900 font-medium">
                        {isValidCoordinate(loadingPoint) && isValidCoordinate(unloadingPoint)
                          ? `${selectedOrder.loading_point_name || "Loading"} → ${selectedOrder.unloading_point_name || "Unloading"}`
                          : "Not available"}
                      </p>
                      {isValidCoordinate(loadingPoint) && (
                        <p className="text-gray-500 text-xs mt-1">
                          Loading: {loadingPoint.lat.toFixed(4)}, {loadingPoint.lng.toFixed(4)}
                        </p>
                      )}
                      {isValidCoordinate(unloadingPoint) && (
                        <p className="text-gray-500 text-xs">
                          Unloading: {unloadingPoint.lat.toFixed(4)}, {unloadingPoint.lng.toFixed(4)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold mb-1">Completed Route</p>
                      <p className="text-gray-900 font-medium">
                        {enhanced?.distanceMetrics
                          ? formatDistance(enhanced.distanceMetrics.completedDistance)
                          : "Not available"}
                      </p>
                      {enhanced?.distanceMetrics && (
                        <p className="text-gray-500 text-xs mt-1">
                          Progress: {enhanced.progressPercentage.toFixed(1)}%
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold mb-1">Remaining Route</p>
                      <p className="text-gray-900 font-medium">
                        {enhanced?.distanceMetrics
                          ? formatDistance(enhanced.distanceMetrics.remainingDistance)
                          : "Not available"}
                      </p>
                      {eta && (
                        <p className="text-gray-500 text-xs mt-1">
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