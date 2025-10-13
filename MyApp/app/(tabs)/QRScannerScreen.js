import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";
import { parsePostGISPoint } from "../shared/locationUtils";

const STATUS_ACTIONS = [
  { status: "activated", label: "Start Order", color: "#10b981" },
  { status: "in_progress", label: "Mark In Transit", color: "#8B5CF6" },
  { status: "in_transit", label: "Mark Arrived", color: "#10B981" },
  { status: "arrived", label: "Start Loading", color: "#F59E0B" },
  { status: "loading", label: "Loading Complete", color: "#10B981" },
  { status: "loaded", label: "Start Unloading", color: "#F59E0B" },
  { status: "unloading", label: "Complete Delivery", color: "#059669" },
];

const locationService = new LocationService();

const OrderDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { order: initialOrder, orderId } = params;

  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(!!orderId && !initialOrder);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Fetch the order if only orderId was provided (e.g., from QR scan or internal navigation)
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      if (orderId && !order) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

          if (!isMounted) return;

          if (error || !data) {
            Alert.alert("Error", "Order not found or access denied", [
              { text: "OK", onPress: () => router.back() },
            ]);
            return;
          }
          setOrder(data);
          
          // Auto-start tracking if order is assigned to current user and in trackable status
          if (data && user && data.assigned_driver_id === user.id) {
            const trackableStatuses = ["assigned", "activated", "in_progress", "in_transit", "loading", "loaded"];
            if (trackableStatuses.includes(data.status) && !isTracking) {
              console.log("Auto-starting tracking for assigned order with status:", data.status);
              try {
                const ok = await locationService.startTracking(data.id);
                if (ok) {
                  setIsTracking(true);
                  console.log("✅ Auto-started tracking for order:", data.id);
                }
              } catch (autoTrackError) {
                console.warn("Auto-tracking failed:", autoTrackError);
                // Don't show alert for auto-tracking failure, just log it
              }
            }
          }
        } catch (e) {
          console.error("Fetch order error:", e);
          Alert.alert("Error", "Failed to load order", [
            { text: "Retry", onPress: fetchOrder },
            { text: "Go Back", onPress: () => router.back() },
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

  // Subscribe to live order updates - Supabase realtime for mobile
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
          setOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  // Track whether location tracking is enabled for this order - Mobile location service (async)
  useEffect(() => {
    const checkTracking = async () => {
      if (!order?.id) return;
      const currentTracked = await locationService.getCurrentOrderId();
      setIsTracking(currentTracked === order.id);
    };
    checkTracking();
  }, [order?.id]);

  const getNextActions = useCallback(() => {
    if (!order) return [];
    const currentIndex = STATUS_ACTIONS.findIndex(
      (a) => a.status === order.status
    );
    return STATUS_ACTIONS.slice(currentIndex + 1);
  }, [order]);

  const startTracking = useCallback(async () => {
    if (!order?.id) return;
    try {
      const ok = await locationService.startTracking(order.id);
      if (ok) {
        setIsTracking(true);
        Alert.alert("Success", "Location tracking started");
      } else {
        Alert.alert("Error", "Failed to start location tracking");
      }
    } catch (e) {
      console.error("Start tracking error:", e);
      Alert.alert("Error", "Failed to start location tracking");
    }
  }, [order?.id]);

  const stopTracking = useCallback(async () => {
    try {
      await locationService.stopTracking();
      setIsTracking(false);
      Alert.alert("Success", "Location tracking stopped");
    } catch (e) {
      console.error("Stop tracking error:", e);
      Alert.alert("Error", "Failed to stop tracking");
    }
  }, []);

  const openMaps = useCallback((destination, label) => {
    try {
      if (!destination) {
        Alert.alert("Error", "Missing coordinates for this location");
        return;
      }
      const scheme = Platform.select({ ios: "maps:", android: "geo:" });
      const url = Platform.select({
        ios: `${scheme}?daddr=${destination.latitude},${destination.longitude}`,
        android: `${scheme}${destination.latitude},${destination.longitude}?q=${
          destination.latitude
        },${destination.longitude}(${encodeURIComponent(label)})`,
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
  }, []);

  const updateStatus = useCallback(
    async (newStatus, notes) => {
      if (!order?.id) return;
      try {
        setStatusUpdating(true);

        // Check auth - Mobile auth check
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          Alert.alert(
            "Authentication Required",
            "You need to be logged in to update status.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Login", onPress: () => router.push("/login") },
            ]
          );
          return;
        }

        // Current location (optional) - Mobile location fetch
        const location = await locationService.getCurrentLocation().catch(
          () => null
        );

        // Insert status update
        const { error: statusError } = await supabase
          .from("status_updates")
          .insert({
            order_id: order.id,
            driver_id: user.id,
            status: newStatus,
            location:
              location && location.coords
                ? `SRID=4326;POINT(${location.coords.longitude} ${location.coords.latitude})`
                : null,
            notes: notes || null,
            created_at: new Date().toISOString(),
          });

        if (statusError) throw statusError;

        // Update order record
        const updateData = { status: newStatus };
        if ((newStatus === "in_progress" || newStatus === "in_transit") && !order.actual_start_time) {
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

        // Auto-start tracking when order begins or is assigned
        const trackableStatuses = ["assigned", "activated", "in_progress", "in_transit"];
        if (trackableStatuses.includes(newStatus) && !isTracking) {
          await startTracking();
        }
      } catch (e) {
        console.error("Update status error:", e);
        Alert.alert("Error", e?.message || "Failed to update status");
      } finally {
        setStatusUpdating(false);
      }
    },
    [
      order?.id,
      order?.actual_start_time,
      isTracking,
      startTracking,
      stopTracking,
      navigation,
    ]
  );

  const reportIncident = () => {
    if (!order) return;
    router.push(`/ReportIncident?orderId=${order.id}`);
  };

  const sendMessage = () => {
    if (!order) return;
    router.push(`/Messages?orderId=${order.id}`);
  };

  const makePhoneCall = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error("Error making phone call:", err);
      Alert.alert("Error", "Unable to make phone call.");
    });
  };

  // Render loading state - Mobile loading UI
  if (loading || !order) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {order.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Loading Point */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Point</Text>
        <Text style={styles.locationName}>{order.loading_point_name}</Text>
        <Text style={styles.locationAddress}>
          {order.loading_point_address}
        </Text>

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMaps(loadingPoint, order.loading_point_name)}
        >
          <Text style={styles.navigateButtonText}>
            Navigate to Loading Point
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unloading Point */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unloading Point</Text>
        <Text style={styles.locationName}>{order.unloading_point_name}</Text>
        <Text style={styles.locationAddress}>
          {order.unloading_point_address}
        </Text>

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => openMaps(unloadingPoint, order.unloading_point_name)}
        >
          <Text style={styles.navigateButtonText}>
            Navigate to Unloading Point
          </Text>
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
          <Text style={styles.instructions}>
            {order.special_handling_instructions}
          </Text>
        </View>
      )}

      {/* Contact Info */}
      {!!order.contact_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactName}>{order.contact_name}</Text>
          {!!order.contact_phone && (
            <TouchableOpacity
              onPress={() => makePhoneCall(order.contact_phone)}
            >
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
          <TouchableOpacity
            style={styles.stopTrackingButton}
            onPress={stopTracking}
          >
            <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startTrackingButton}
            onPress={startTracking}
          >
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
            <Text style={styles.noActionsText}>
              No further actions available.
            </Text>
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
            This order has been{" "}
            {order.status === "completed" ? "completed" : "cancelled"}.
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={reportIncident}
        >
          <Text style={styles.quickActionText}>Report Incident</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={sendMessage}
        >
          <Text style={styles.quickActionText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  const colors = {
    pending: "#6B7280",
    assigned: "#3B82F6",
    activated: "#10b981",
    in_progress: "#6366f1",
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
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  locationName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  navigateButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  navigateButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  instructions: { fontSize: 14, color: "#374151", lineHeight: 20 },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
  trackingDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  startTrackingButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startTrackingButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  stopTrackingButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  stopTrackingButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  noActionsText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  completedText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 40,
  },
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
});

