import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import
  {
    ActivityIndicator,
    Dimensions,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
  } from "react-native";
import LocationDetailsSection from "../components/LocationDetailsSection";
import OrderInfoSection from "../components/OrderInfoSection";
import QuickStatCard from "../components/QuickStatCard";
import TimelineSection from "../components/TimelineSection";
import { supabase } from "../lib/supabase";
import { startBackgroundLocation, stopBackgroundLocation } from "../services/LocationService";
import { colors } from "../styles";

// Conditionally import react-native-maps only on native platforms
let MapView, Marker, Polyline, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.warn('react-native-maps not available:', error);
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;

// Polyline Decoder (unchanged)
const decodePolyline = (encoded) => {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }

  return coordinates;
};

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [loadingCoord, setLoadingCoord] = useState(null);
  const [unloadingCoord, setUnloadingCoord] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [directions, setDirections] = useState(null);
  const [directionsError, setDirectionsError] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [backgroundLocationStarted, setBackgroundLocationStarted] = useState(false);

  // Get current user from Supabase auth
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        throw new Error(`Invalid order ID format: ${orderId}`);
      }
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(id, full_name, email)
        `)
        .eq("id", orderId)
        .single();
      if (error) throw error;
      setOrder(data);
      setLoadingCoord(null);
      setUnloadingCoord(null);
      setMapError(null);
      setDirections(null);
      setDirectionsError(null);
      setUserLocation(null);
      setBackgroundLocationStarted(false); // Reset background tracking
    } catch (err) {
      console.error("Error loading order details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  // Request foreground location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status !== "granted") {
        setLocationError("Location permission denied. Enable it in settings to see your position on the map.");
      }
    })();
  }, []);

  // Start background location tracking if user is the assigned driver and order is active
  // Background tracking is disabled on web platform
  useEffect(() => {
    if (
      Platform.OS !== 'web' &&
      order &&
      currentUser &&
      order.assigned_driver?.id === currentUser.id &&
      ["activated", "in_progress", "in_transit", "arrived", "loading", "loaded", "unloading"].includes(order.status) &&
      !backgroundLocationStarted
    ) {
      startBackgroundLocation(order.id).then((success) => {
        if (success) {
          setBackgroundLocationStarted(true);
        } else {
          setLocationError("Failed to start background location tracking. Check permissions.");
        }
      });
    }
    return () => {
      if (backgroundLocationStarted) {
        stopBackgroundLocation();
      }
    };
  }, [order, currentUser, backgroundLocationStarted]);

  // Track foreground user location with web compatibility
  useEffect(() => {
    let subscription;
    let watchId;
    
    if (Platform.OS === 'web') {
      // Use browser Geolocation API for web
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationError(null);
          },
          (err) => {
            console.error("Web location tracking error:", err);
            setLocationError("Failed to track location. Check browser settings.");
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
      } else {
        setLocationError("Geolocation is not supported in this browser.");
      }
    } else if (locationPermission === "granted") {
      // Use expo-location for native platforms
      (async () => {
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10,
              timeInterval: 1000,
            },
            (location) => {
              setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
              setLocationError(null);
            }
          );
        } catch (err) {
          console.error("Foreground location tracking error:", err);
          setLocationError("Failed to track location. Check device settings.");
        }
      })();
    }
    
    return () => {
      if (Platform.OS === 'web' && watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      } else if (subscription) {
        subscription.remove();
      }
    };
  }, [locationPermission]);

  // Geocode locations
  useEffect(() => {
    if (order && !loadingCoord && !unloadingCoord) {
      const geocodeLocations = async () => {
        setMapLoading(true);
        setMapError(null);
        try {
          const loadingResults = await Location.geocodeAsync(order.loading_point_name);
          const unloadingResults = await Location.geocodeAsync(order.unloading_point_name);
          if (loadingResults.length > 0) {
            setLoadingCoord({
              latitude: loadingResults[0].latitude,
              longitude: loadingResults[0].longitude,
            });
          }
          if (unloadingResults.length > 0) {
            setUnloadingCoord({
              latitude: unloadingResults[0].latitude,
              longitude: unloadingResults[0].longitude,
            });
          }
          if (!loadingResults.length || !unloadingResults.length) {
            setMapError("Unable to geocode one or more locations.");
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setMapError("Failed to load map locations. Check your connection or address formats.");
        } finally {
          setMapLoading(false);
        }
      };
      geocodeLocations();
    }
  }, [order, loadingCoord, unloadingCoord]); // Added missing dependencies

  // Fetch directions (use userLocation as origin if user is driver)
  useEffect(() => {
    if (loadingCoord && unloadingCoord && !directions) {
      const fetchDirections = async () => {
        setDirectionsLoading(true);
        setDirectionsError(null);
        try {
          const apiKey = Constants.expoConfig.extra.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          const origin =
            currentUser &&
            order.assigned_driver?.id === currentUser.id &&
            userLocation
              ? `${userLocation.latitude},${userLocation.longitude}`
              : `${loadingCoord.latitude},${loadingCoord.longitude}`;
          const destination = `${unloadingCoord.latitude},${unloadingCoord.longitude}`;
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${apiKey}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.status !== "OK") {
            throw new Error(data.error_message || "Failed to fetch directions.");
          }
          setDirections(data.routes[0]);
        } catch (err) {
          console.error("Directions error:", err);
          setDirectionsError("Unable to fetch driving directions. Please check locations or API key.");
        } finally {
          setDirectionsLoading(false);
        }
      };
      fetchDirections();
    }
  }, [loadingCoord, unloadingCoord, userLocation, currentUser, order, directions]); // Added missing dependency

  // Memoized data
  const timelineData = useMemo(() => {
    if (!order) return [];
    return [
      {
        key: "created",
        icon: "event",
        color: colors.indigo500,
        label: "Order Created",
        value: new Date(order.created_at).toLocaleString(),
        isCompleted: true,
      },
      {
        key: "activated",
        icon: "check-circle",
        color: colors.success,
        label: "Load Activated",
        value: order.load_activated_at
          ? new Date(order.load_activated_at).toLocaleString()
          : "Pending activation",
        isCompleted: !!order.load_activated_at,
      },
      {
        key: "delivered",
        icon: "done-all",
        color: colors.successDark,
        label: "Delivered",
        value: order.delivered_at
          ? new Date(order.delivered_at).toLocaleString()
          : "In progress",
        isCompleted: !!order.delivered_at,
      },
    ];
  }, [order]);

  const actionButtons = useMemo(() => {
    if (!order) return { showActivate: false, showManage: false, showInfo: false };
    return {
      showActivate: order.status === "assigned" && !order.load_activated_at,
      showManage: order.load_activated_at && [
        "activated",
        "in_progress",
        "in_transit",
        "arrived",
        "loading",
        "loaded",
        "unloading",
      ].includes(order.status),
      showInfo: order.status === "assigned" && order.load_activated_at,
    };
  }, [order]);

  const mapRegion = useMemo(() => {
    const coords = [];
    if (loadingCoord) coords.push(loadingCoord);
    if (unloadingCoord) coords.push(unloadingCoord);
    if (userLocation) coords.push(userLocation);

    if (directions) {
      const bounds = directions.bounds;
      return {
        latitude: (bounds.northeast.lat + bounds.southwest.lat) / 2,
        longitude: (bounds.northeast.lng + bounds.southwest.lng) / 2,
        latitudeDelta: (bounds.northeast.lat - bounds.southwest.lat) * 1.2,
        longitudeDelta: (bounds.northeast.lng - bounds.southwest.lng) * 1.2,
      };
    } else if (coords.length > 0) {
      const latitudes = coords.map(c => c.latitude);
      const longitudes = coords.map(c => c.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.1),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.1),
      };
    }
    return null;
  }, [loadingCoord, unloadingCoord, userLocation, directions]);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId, loadOrderDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrderDetails();
  }, [loadOrderDetails]);

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconWrapper}>
          <MaterialIcons name="error-outline" size={56} color={colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
            loading && styles.retryButtonDisabled,
          ]}
          onPress={loadOrderDetails}
          disabled={loading}
        >
          <MaterialIcons name="refresh" size={20} color={colors.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrapper}>
          <MaterialIcons name="inbox" size={56} color={colors.gray400} />
        </View>
        <Text style={styles.emptyTitle}>Order Not Found</Text>
        <Text style={styles.emptyText}>We couldn&apos;t find the order you&apos;re looking for</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroKicker}>ORDER DETAILS</Text>
          <Text style={styles.heroTitle}>#{order.order_number}</Text>
          <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
            <MaterialIcons name={getStatusIcon(order.status)} size={14} color={colors.white} />
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.quickStatsContainer}>
        <QuickStatCard
          icon="person"
          label="Driver"
          value={order.assigned_driver?.full_name || "Unassigned"}
          color={colors.indigo500}
        />
        <QuickStatCard
          icon="straighten"
          label="Distance"
          value={directions ? directions.legs[0].distance.text : order.estimated_distance_km ? `${order.estimated_distance_km} km` : "TBD"}
          color={colors.purple500}
        />
        <QuickStatCard
          icon="schedule"
          label="Created"
          value={new Date(order.created_at).toLocaleDateString()}
          color={colors.warning}
        />
      </View>

      {/* Order Information Section */}
      <OrderInfoSection order={order} />

      {/* Location Details Section */}
      <LocationDetailsSection order={order} />

      {/* Route Map Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Map</Text>
        <View style={styles.card}>
          {Platform.OS === 'web' ? (
            // Web platform - show placeholder
            <View style={styles.centeredDisabled}>
              <MaterialIcons name="map" size={48} color={colors.primary} />
              <Text style={styles.infoText}>📍 Map view is available on mobile app</Text>
              <Text style={styles.loadingText}>Install the mobile app to see interactive maps with directions</Text>
            </View>
          ) : (
            // Native platform - show map
            <>
              {mapLoading && (
                <View style={styles.centeredDisabled}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading map...</Text>
                </View>
              )}
              {mapError && (
                <View style={styles.centeredDisabled}>
                  <MaterialIcons name="error-outline" size={48} color={colors.danger} />
                  <Text style={styles.errorText}>{mapError}</Text>
                </View>
              )}
              {!mapLoading && !mapError && mapRegion && MapView && (
                <MapView style={styles.map} initialRegion={mapRegion} provider={PROVIDER_GOOGLE}>
                  {loadingCoord && (
                    <Marker
                      coordinate={loadingCoord}
                      title="Loading Point"
                      description={order.loading_point_name}
                      pinColor={colors.success}
                    />
                  )}
                  {unloadingCoord && (
                    <Marker
                      coordinate={unloadingCoord}
                      title="Delivery Point"
                      description={order.unloading_point_name}
                      pinColor={colors.danger}
                    />
                  )}
                  {userLocation && (
                    <Marker
                      coordinate={userLocation}
                      title="Your Location"
                      description="Current position"
                      pinColor={colors.info}
                    />
                  )}
                  {directions ? (
                    <Polyline
                      coordinates={decodePolyline(directions.overview_polyline.points)}
                      strokeColor={colors.primary}
                      strokeWidth={3}
                    />
                  ) : (
                    loadingCoord &&
                    unloadingCoord && (
                      <Polyline
                        coordinates={[loadingCoord, unloadingCoord]}
                        strokeColor={colors.primary}
                        strokeWidth={3}
                      />
                    )
                  )}
                </MapView>
              )}
              {!mapRegion && !mapLoading && !mapError && (
                <Text style={styles.infoText}>Map data not available.</Text>
              )}
              {locationError && (
                <View style={styles.infoAlert}>
                  <MaterialIcons name="location-off" size={22} color={colors.danger} />
                  <Text style={styles.infoAlertText}>{locationError}</Text>
                </View>
              )}
              {directionsLoading && (
                <View style={styles.centeredDisabled}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading directions...</Text>
                </View>
              )}
              {directionsError && <Text style={styles.errorText}>{directionsError}</Text>}
              {directions && !directionsLoading && (
                <>
                  <View style={styles.directionsSummary}>
                    <MaterialIcons name="directions-car" size={20} color={colors.primary} />
                    <Text style={styles.summaryText}>
                      {directions.legs[0].distance.text} • {directions.legs[0].duration.text}
                    </Text>
                  </View>
                  <ScrollView style={styles.stepsContainer} nestedScrollEnabled={true}>
                    {directions.legs[0].steps.map((step, index) => (
                      <View key={index} style={styles.stepRow}>
                        <MaterialIcons name="directions" size={18} color={colors.gray600} />
                        <Text style={styles.stepInstruction}>{step.html_instructions.replace(/<[^>]*>/g, '')}</Text>
                        <Text style={styles.stepDetails}>
                          {step.distance.text} • {step.duration.text}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {/* Timeline Section */}
      <TimelineSection timelineData={timelineData} />

      {/* Action Buttons Section */}
      <View style={styles.section}>
        {actionButtons.showActivate && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/LoadActivationScreen",
                params: { orderId: order.id, orderNumber: order.order_number },
              })
            }
            disabled={loading}
          >
            <MaterialIcons name="play-circle-filled" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>Activate Load</Text>
          </Pressable>
        )}
        {actionButtons.showManage && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.successButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={() =>
              router.push(`/(tabs)/scanner?orderId=${order.id}&orderNumber=${order.order_number}`)
            }
            disabled={loading}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>
              {order.status === "activated" ? "Start Order" : "Manage Order"}
            </Text>
          </Pressable>
        )}
        {actionButtons.showInfo && (
          <View style={styles.infoAlert}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
            <Text style={styles.infoAlertText}>
              Load is activated! You can now scan QR codes to start the order.
            </Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
            loading && styles.secondaryButtonDisabled,
          ]}
          onPress={() => router.push("/(tabs)/orders")}
          disabled={loading}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.gray700} />
          <Text style={styles.secondaryButtonText}>Back to Orders</Text>
        </Pressable>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// Helper Functions (unchanged)
const getStatusStyle = (status) => {
  const statusStyles = {
    pending: { backgroundColor: colors.gray500 },
    assigned: { backgroundColor: colors.info },
    activated: { backgroundColor: colors.success },
    in_progress: { backgroundColor: colors.indigo500 },
    in_transit: { backgroundColor: colors.primary },
    delivered: { backgroundColor: colors.successDark },
    completed: { backgroundColor: colors.success },
    arrived: { backgroundColor: colors.warning },
    loading: { backgroundColor: colors.warning },
    loaded: { backgroundColor: colors.success },
    unloading: { backgroundColor: colors.warningDark },
  };
  return statusStyles[status] || { backgroundColor: colors.gray500 };
};

const getStatusIcon = (status) => {
  const iconMap = {
    pending: "schedule",
    assigned: "assignment",
    activated: "check-circle",
    in_progress: "local-shipping",
    in_transit: "directions",
    delivered: "done-all",
    completed: "task-alt",
    arrived: "location-on",
    loading: "upload",
    loaded: "inventory",
    unloading: "download",
  };
  return iconMap[status] || "info";
};

// Styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background },
  centeredDisabled: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background, pointerEvents: 'none' },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.gray600, fontWeight: "600" },
  errorIconWrapper: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.red50, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: "700", color: colors.gray900, marginBottom: 8, textAlign: "center" },
  errorText: { fontSize: 15, color: colors.gray600, textAlign: "center", marginBottom: 24, paddingHorizontal: 32, lineHeight: 22 },
  emptyIconWrapper: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.gray100, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.gray900, marginBottom: 8 },
  emptyText: { fontSize: 15, color: colors.gray600, textAlign: "center", marginBottom: 24, paddingHorizontal: 32 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minHeight: 52,
    minWidth: 180,
    ...Platform.select({
      ios: { shadowColor: colors.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  retryButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  retryButtonDisabled: { opacity: 0.6, pointerEvents: 'none' },
  retryButtonText: { color: colors.white, fontSize: 16, fontWeight: "700", marginLeft: 8 },
  hero: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: colors.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  heroContent: { alignItems: "flex-start" },
  heroKicker: { fontSize: 12, fontWeight: "700", color: colors.primaryLight, letterSpacing: 1.5, marginBottom: 4 },
  heroTitle: { fontSize: IS_SMALL_DEVICE ? 26 : 32, fontWeight: "800", color: colors.white, letterSpacing: -0.5, marginBottom: 16 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginLeft: 6 },
  quickStatsContainer: { flexDirection: "row", marginHorizontal: 16, marginTop: -24, marginBottom: 20, gap: 12 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 52,
    ...Platform.select({
      ios: { shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  successButton: { backgroundColor: colors.success },
  primaryButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  primaryButtonDisabled: { opacity: 0.6, pointerEvents: 'none' },
  secondaryButtonDisabled: { opacity: 0.6, pointerEvents: 'none' },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "700", marginLeft: 10 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray200,
    minHeight: 52,
    ...Platform.select({
      ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  secondaryButtonPressed: { backgroundColor: colors.gray50, borderColor: colors.gray300 },
  secondaryButtonText: { color: colors.gray700, fontSize: 16, fontWeight: "700", marginLeft: 8 },
  infoAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green50,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successLight,
    marginBottom: 12,
  },
  infoAlertText: { flex: 1, marginLeft: 12, fontSize: 14, color: colors.successDark, fontWeight: "600", lineHeight: 20 },
  bottomSpacer: { height: Platform.OS === 'ios' ? 20 : 12 },
  map: { width: "100%", height: 300, borderRadius: 12 },
  directionsSummary: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: colors.gray50, borderRadius: 8, marginTop: 12, marginBottom: 8 },
  summaryText: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: colors.gray900 },
  stepsContainer: { maxHeight: 200 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  stepInstruction: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.gray800 },
  stepDetails: { fontSize: 12, color: colors.gray600, marginLeft: 8 },
  infoText: { fontSize: 14, color: colors.gray600, textAlign: "center", padding: 16 },
});