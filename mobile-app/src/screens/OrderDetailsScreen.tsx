import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from "uuid";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { LocationService } from "../services/locationService";
import { Order, OrderStatus, Location as AppLocation, LocationUpdate } from "../shared/types";
import { parsePostGISPoint, toPostGISPoint } from "../shared/locationUtils";

// Define navigation prop
type RootStackParamList = {
  OrderDetails: { order?: Order; orderId?: string };
  ReportIncident: { orderId: string };
  Messages: { orderId: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "OrderDetails">;

// Define route params
type RouteParams = {
  order?: Order;
  orderId?: string;
};

const STATUS_ACTIONS: { status: OrderStatus; label: string; color: string }[] = [
  { status: "in_transit", label: "Start Transit", color: "#8B5CF6" },
  { status: "arrived", label: "Arrived", color: "#10B981" },
  { status: "loading", label: "Start Loading", color: "#F59E0B" },
  { status: "loaded", label: "Loading Complete", color: "#10B981" },
  { status: "unloading", label: "Start Unloading", color: "#F59E0B" },
  { status: "completed", label: "Complete Delivery", color: "#059669" },
];

export const OrderDetailsScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { order: initialOrder, orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(initialOrder || null);
  const [loading, setLoading] = useState<boolean>(!!orderId && !initialOrder);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<AppLocation | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<AppLocation[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [lastSignificantLocation, setLastSignificantLocation] = useState<AppLocation | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<"off" | "loading" | "unloading" | "both">("off");
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Request notification permissions
  useEffect(() => {
    let isMounted = true;

    const requestNotificationPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (isMounted && status !== "granted") {
          Alert.alert("Notifications Required", "Geofence alerts require notification permissions.");
        }
      } catch (error) {
        console.error("Error requesting notification permissions:", error);
        if (isMounted) {
          Alert.alert("Error", "Failed to request notification permissions");
        }
      }
    };

    requestNotificationPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch order if only orderId provided
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      if (orderId && !order) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("orders")
            .select("*, assigned_driver:assigned_driver_id(id, full_name)")
            .eq("id", orderId)
            .single();

          if (!isMounted) return;

          if (error || !data) {
            Alert.alert("Error", "Order not found or access denied", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
            return;
          }
          setOrder(data as Order);
        } catch (e) {
          console.error("Fetch order error:", e);
          Alert.alert("Error", "Failed to load order", [
            { text: "Retry", onPress: fetchOrder },
            { text: "Go Back", onPress: () => navigation.goBack() },
          ]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, order, navigation]);

  // Subscribe to live order updates
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order:${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
          // Update geofence status based on order status
          if (payload.new.status === "arrived" || payload.new.status === "loading") {
            setGeofenceStatus((prev) => (prev === "both" ? "unloading" : prev));
          } else if (payload.new.status === "completed" || payload.new.status === "cancelled") {
            setGeofenceStatus("off");
            setIsTracking(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  // Check if location tracking and geofences are enabled
  useEffect(() => {
    let isMounted = true;

    const checkTracking = async () => {
      if (!order?.id) return;
      const currentTracked = await LocationService.getCurrentOrderId();
      const isTrackingActive = currentTracked === order.id;
      setIsTracking(isTrackingActive);

      // Check geofence status
      const raw = await AsyncStorage.getItem("active_geofences");
      if (raw && isTrackingActive) {
        const geofences = JSON.parse(raw);
        if (geofences[order.id]) {
          const { loading, unloading } = geofences[order.id];
          if (loading && unloading) {
            setGeofenceStatus("both");
          } else if (loading) {
            setGeofenceStatus("loading");
          } else if (unloading) {
            setGeofenceStatus("unloading");
          } else {
            setGeofenceStatus("off");
          }
        } else {
          setGeofenceStatus("off");
        }
      } else {
        setGeofenceStatus("off");
      }
    };

    checkTracking();

    return () => {
      isMounted = false;
    };
  }, [order?.id]);

  // Start real-time location watching (foreground)
  useEffect(() => {
    let isMounted = true;

    const startLocationWatch = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location access is needed for real-time routing.");
        setIsTracking(false);
        setGeofenceStatus("off");
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Or on 50m movement
        },
        async (newLocation) => {
          if (!isMounted) return;

          const newLoc: AppLocation = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newLoc);

          // Log location update to Supabase (foreground)
          if (order?.id && isTracking) {
            const locationUpdate: LocationUpdate = {
              id: uuidv4(),
              order_id: order.id,
              driver_id: order.assigned_driver_id || "",
              location: toPostGISPoint(newLoc),
              accuracy_meters: newLocation.coords.accuracy ?? undefined,
              speed_kmh: newLocation.coords.speed ? newLocation.coords.speed * 3.6 : undefined,
              heading: newLocation.coords.heading ?? undefined,
              battery_level: undefined,
              timestamp: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };

            const { error } = await supabase.from("location_updates").insert([locationUpdate]);
            if (error) {
              console.error("Error saving location update:", error);
            }
          }
        }
      );
    };

    startLocationWatch();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [order?.id, order?.assigned_driver_id, isTracking]);

  // Fetch and update route
  useEffect(() => {
    if (!order || !currentLocation || !GOOGLE_MAPS_APIKEY || !isTracking) return;

    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        // Parse locations
        const loadingPoint = parsePostGISPoint(order.loading_point_location);
        const unloadingPoint = parsePostGISPoint(order.unloading_point_location);
        const waypoints = order.waypoints ? order.waypoints.map(wp => wp.location) : [];

        // Check if location changed significantly (simple distance check)
        if (lastSignificantLocation) {
          const dx = currentLocation.latitude - lastSignificantLocation.latitude;
          const dy = currentLocation.longitude - lastSignificantLocation.longitude;
          const distanceMoved = Math.sqrt(dx * dx + dy * dy) * 111000; // Approx meters
          if (distanceMoved < 50) {
            setRouteLoading(false);
            return; // Skip if moved less than 50m
          }
        }

        setLastSignificantLocation(currentLocation);

        // MapViewDirections handles the API call
      } catch (error) {
        console.error("Error fetching route:", error);
        Alert.alert("Error", "Failed to load route.");
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [order, currentLocation, GOOGLE_MAPS_APIKEY, lastSignificantLocation, isTracking]);

  // Deviation detection
  useEffect(() => {
    if (!currentLocation || routeCoordinates.length === 0 || !isTracking) return;

    // Simple deviation check: find closest point on route
    const distances = routeCoordinates.map(coord => {
      const dx = currentLocation.latitude - coord.latitude;
      const dy = currentLocation.longitude - coord.longitude;
      return Math.sqrt(dx * dx + dy * dy) * 111000; // Approx meters
    });
    const minDistance = Math.min(...distances);

    if (minDistance > 100) { // 100m deviation threshold
      Alert.alert("Deviation Detected", "You are off route. Recalculating...");
      // Trigger route re-fetch by resetting lastSignificantLocation
      setLastSignificantLocation(null);
    }
  }, [currentLocation, routeCoordinates, isTracking]);

  const getNextActions = useCallback(() => {
    if (!order) return [];
    const currentIndex = STATUS_ACTIONS.findIndex((a) => a.status === order.status);
    return STATUS_ACTIONS.slice(currentIndex + 1);
  }, [order]);

  const startTracking = useCallback(async () => {
    if (!order?.id) return;
    try {
      const ok = await LocationService.startTracking(order.id, order);
      if (ok) {
        setIsTracking(true);
        setGeofenceStatus("both");
        Alert.alert("Success", "Location tracking and geofence alerts started");
      } else {
        Alert.alert("Error", "Failed to start location tracking and geofences");
      }
    } catch (e) {
      console.error("Start tracking error:", e);
      Alert.alert("Error", "Failed to start location tracking and geofences");
    }
  }, [order?.id, order]);

  const stopTracking = useCallback(async () => {
    try {
      await LocationService.stopTracking();
      setIsTracking(false);
      setGeofenceStatus("off");
      Alert.alert("Success", "Location tracking and geofence alerts stopped");
    } catch (e) {
      console.error("Stop tracking error:", e);
      Alert.alert("Error", "Failed to stop tracking and geofences");
    }
  }, []);

  const openMaps = useCallback(
    (destination: AppLocation | null, label: string) => {
      try {
        if (!destination) {
          Alert.alert("Error", "Missing coordinates for this location");
          return;
        }
        const scheme = Platform.select({ ios: "maps:", android: "geo:" });
        const url = Platform.select({
          ios: `${scheme}?daddr=${destination.latitude},${destination.longitude}`,
          android: `${scheme}${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}(${encodeURIComponent(label)})`,
        });
        if (url) {
          Linking.openURL(url).catch((err) => {
            console.error("Error opening maps:", err);
            Alert.alert("Error", "Unable to open maps application.");
          });
        } else {
          Alert.alert("Error", "Navigation not supported on this platform.");
        }
      } catch (error) {
        console.error("Error in openMaps:", error);
        Alert.alert("Error", "Failed to open navigation.");
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (newStatus: OrderStatus, notes?: string) => {
      if (!order?.id) return;
      try {
        setStatusUpdating(true);

        // Check auth
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          Alert.alert(
            "Authentication Required",
            "You need to be logged in to update status.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Login", onPress: () => navigation.navigate("Login") },
            ]
          );
          return;
        }

        // Current location (optional)
        const location = await LocationService.getCurrentLocation().catch(() => null);

        // Insert status update
        const { error: statusError } = await supabase.from("status_updates").insert({
          order_id: order.id,
          driver_id: user.id,
          status: newStatus,
          location:
            location && location.coords
              ? toPostGISPoint(location.coords as AppLocation)
              : null,
          notes: notes || null,
          created_at: new Date().toISOString(),
        });

        if (statusError) throw statusError;

        // Update order record
        const updateData: Partial<Order> = { status: newStatus };
        if (newStatus === "in_transit" && !order.actual_start_time) {
          updateData.actual_start_time = new Date().toISOString();
        }
        if (newStatus === "completed") {
          updateData.actual_end_time = new Date().toISOString();
          await stopTracking();
        }

        const { error: orderError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id);

        if (orderError) throw orderError;

        Alert.alert("Success", "Status updated successfully");

        // Ensure tracking and geofences when transit starts
        if (newStatus === "in_transit" && !isTracking) {
          await startTracking();
        }
      } catch (e: any) {
        console.error("Update status error:", e);
        Alert.alert("Error", e?.message || "Failed to update status");
      } finally {
        setStatusUpdating(false);
      }
    },
    [order?.id, order?.actual_start_time, isTracking, startTracking, stopTracking, navigation]
  );

  const reportIncident = useCallback(() => {
    if (!order) return;
    navigation.navigate("ReportIncident", { orderId: order.id });
  }, [order, navigation]);

  const sendMessage = useCallback(() => {
    if (!order) return;
    navigation.navigate("Messages", { orderId: order.id });
  }, [order, navigation]);

  const makePhoneCall = useCallback((phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error("Error making phone call:", err);
      Alert.alert("Error", "Unable to make phone call.");
    });
  }, []);

  // Render loading state
  if (loading || !order) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  const loadingPoint = useMemo(
    () => parsePostGISPoint(order.loading_point_location),
    [order.loading_point_location]
  );
  const unloadingPoint = useMemo(
    () => parsePostGISPoint(order.unloading_point_location),
    [order.unloading_point_location]
  );
  const waypoints = useMemo(
    () => (order.waypoints ? order.waypoints.map((wp) => wp.location) : []),
    [order.waypoints]
  );

  const initialRegion = useMemo(
    () => ({
      latitude: currentLocation ? currentLocation.latitude : loadingPoint.latitude,
      longitude: currentLocation ? currentLocation.longitude : loadingPoint.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [currentLocation, loadingPoint]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status.replace("_", " ").toUpperCase()}</Text>
        </View>
      </View>

      {/* Route Map and Optimization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route to Destination</Text>
        {routeLoading || !GOOGLE_MAPS_APIKEY ? (
          <ActivityIndicator size="large" color="#EF4444" style={styles.routeLoading} />
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={true}
              followsUserLocation={true}
            >
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Your Location"
                  pinColor="blue"
                />
              )}
              <Marker
                coordinate={loadingPoint}
                title="Loading Point"
                description={order.loading_point_name}
                pinColor="green"
              />
              {waypoints.map((wp, index) => (
                <Marker
                  key={index}
                  coordinate={wp}
                  title={`Waypoint ${index + 1}`}
                  pinColor="orange"
                />
              ))}
              <Marker
                coordinate={unloadingPoint}
                title="Unloading Point"
                description={order.unloading_point_name}
                pinColor="red"
              />
              <MapViewDirections
                origin={currentLocation || loadingPoint}
                destination={unloadingPoint}
                waypoints={waypoints}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor="#EF4444"
                optimizeWaypoints={true}
                mode="DRIVING"
                onReady={(result) => {
                  setRouteCoordinates(result.coordinates.map((c: any) => ({
                    latitude: c.latitude,
                    longitude: c.longitude,
                  })));
                  setEta(result.duration);
                  setDistance(result.distance);
                  mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                  });
                }}
                onError={(errorMessage) => {
                  console.error("Directions error:", errorMessage);
                  Alert.alert("Error", "Failed to load route. Check API key.");
                }}
              />
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#EF4444"
                  strokeWidth={4}
                />
              )}
            </MapView>
          </View>
        )}
        {eta !== null && distance !== null && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeText}>ETA: {Math.round(eta)} min</Text>
            <Text style={styles.routeText}>Distance: {distance.toFixed(1)} km</Text>
          </View>
        )}
      </View>

      {/* Geofence Status */}
      {geofenceStatus !== "off" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geofence Alerts</Text>
          <View style={styles.geofenceBadge}>
            <Text style={styles.geofenceBadgeText}>
              Geofence Active: {geofenceStatus === "both" ? "Loading & Unloading" : geofenceStatus.charAt(0).toUpperCase() + geofenceStatus.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Loading Point */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Point</Text>
        <Text style={styles.locationName}>{order.loading_point_name}</Text>
        <Text style={styles.locationAddress}>{order.loading_point_address}</Text>
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMaps(loadingPoint, order.loading_point_name)}
        >
          <Text style={styles.navigateButtonText}>Navigate to Loading Point</Text>
        </TouchableOpacity>
      </View>

      {/* Unloading Point */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unloading Point</Text>
        <Text style={styles.locationName}>{order.unloading_point_name}</Text>
        <Text style={styles.locationAddress}>{order.unloading_point_address}</Text>
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMaps(unloadingPoint, order.unloading_point_name)}
        >
          <Text style={styles.navigateButtonText}>Navigate to Unloading Point</Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Instructions */}
      {!!order.delivery_instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions</Text>
          <Text style={styles.instructions}>{order.delivery_instructions}</Text>
        </View>
      )}

      {/* Special Handling */}
      {!!order.special_handling_instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Handling</Text>
          <Text style={styles.instructions}>{order.special_handling_instructions}</Text>
        </View>
      )}

      {/* Contact Info */}
      {!!order.contact_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactName}>{order.contact_name}</Text>
          {!!order.contact_phone && (
            <TouchableOpacity onPress={() => makePhoneCall(order.contact_phone!)}>
              <Text style={styles.contactPhone}>{order.contact_phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tracking Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>
        <Text style={styles.trackingDescription}>
          {isTracking
            ? "Your location is being tracked for this order"
            : "Location tracking is currently disabled"}
        </Text>
        {isTracking ? (
          <TouchableOpacity style={styles.stopTrackingButton} onPress={stopTracking}>
            <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startTrackingButton} onPress={startTracking}>
            <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Actions */}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          {getNextActions().length > 0 ? (
            getNextActions().map((action) => (
              <TouchableOpacity
                key={action.status}
                style={[
                  styles.actionButton,
                  { backgroundColor: action.color },
                  statusUpdating && styles.actionButtonDisabled,
                ]}
                onPress={() => updateStatus(action.status)}
                disabled={statusUpdating}
              >
                <Text style={styles.actionButtonText}>
                  {statusUpdating ? "Updating..." : action.label}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noActionsText}>No further actions available.</Text>
          )}
        </View>
      )}

      {/* Completed/Cancelled Message */}
      {(order.status === "completed" || order.status === "cancelled") && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <Text
            style={[
              styles.completedText,
              { color: order.status === "completed" ? "#059669" : "#EF4444" },
            ]}
          >
            This order has been {order.status === "completed" ? "completed" : "cancelled"}.
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={reportIncident}>
          <Text style={styles.quickActionText}>Report Incident</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton} onPress={sendMessage}>
          <Text style={styles.quickActionText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: "#6B7280",
    assigned: "#3B82F6",
    in_transit: "#8B5CF6",
    arrived: "#10B981",
    loading: "#F59E0B",
    loaded: "#10B981",
    unloading: "#F59E0B",
    completed: "#059669",
    cancelled: "#EF4444",
  };
  return colors[status] ?? "#6B7280";
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#2563eb" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderNumber: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  locationName: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 4 },
  locationAddress: { fontSize: 14, color: "#6B7280", marginBottom: 12, lineHeight: 20 },
  navigateButton: { backgroundColor: "#3B82F6", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  navigateButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  instructions: { fontSize: 14, color: "#374151", lineHeight: 20 },
  contactName: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 },
  contactPhone: { fontSize: 16, color: "#3B82F6", textDecorationLine: "underline" },
  trackingDescription: { fontSize: 14, color: "#6B7280", marginBottom: 12, lineHeight: 20 },
  startTrackingButton: { backgroundColor: "#10B981", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  startTrackingButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  stopTrackingButton: { backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  stopTrackingButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionButton: { paddingVertical: 12, borderRadius: 8, alignItems: "center", marginBottom: 8 },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  noActionsText: { fontSize: 14, color: "#6B7280", textAlign: "center", fontStyle: "italic" },
  completedText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  quickActions: { flexDirection: "row", justifyContent: "space-between", padding: 20, paddingBottom: 40 },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  quickActionText: { color: "#3B82F6", fontSize: 14, fontWeight: "600" },
  mapContainer: { height: 300, borderRadius: 8, overflow: "hidden", marginBottom: 12 },
  map: { flex: 1 },
  routeInfo: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  routeText: { fontSize: 14, color: "#6B7280" },
  routeLoading: { marginVertical: 20 },
  geofenceBadge: {
    backgroundColor: "#10B981",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  geofenceBadgeText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});