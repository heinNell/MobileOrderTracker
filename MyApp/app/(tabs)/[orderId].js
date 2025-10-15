import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";
import { parsePostGISPoint } from "../shared/locationUtils";

const STATUS_FLOW = {
  pending: ["assigned", "activated"],
  assigned: ["activated", "in_progress"], // Allow direct transition to in_progress
  activated: ["in_progress"],
  in_progress: ["in_transit", "arrived", "loading", "loaded", "unloading"], // Allow skipping to any loading/delivery stage
  in_transit: ["arrived", "loading", "loaded", "unloading"], // Allow skipping ahead
  arrived: ["loading", "loaded", "unloading"], // Allow skipping loading step
  loading: ["loaded", "unloading"], // Allow skipping directly to unloading
  loaded: ["in_transit", "unloading"], // Allow going back to transit if needed
  unloading: ["completed"]
};

const STATUS_ACTIONS = [
  { status: "pending", label: "Assign Driver", color: "#6b7280" },
  { status: "assigned", label: "Activate Order", color: "#2563eb" },
  { status: "activated", label: "Start Order", color: "#10b981" },
  { status: "in_progress", label: "Mark In Transit", color: "#8B5CF6" },
  { status: "in_transit", label: "Mark Arrived", color: "#10B981" },
  { status: "arrived", label: "Start Loading", color: "#F59E0B" },
  { status: "loading", label: "Loading Complete", color: "#10B981" },
  { status: "loaded", label: "Start Unloading", color: "#F59E0B" },
  { status: "unloading", label: "Complete Delivery", color: "#059669" },
];

// Helper function to validate status transitions
// eslint-disable-next-line no-unused-vars
const isValidStatusTransition = (currentStatus, newStatus) => {
  if (!currentStatus || !newStatus) return false;
  const allowedTransitions = STATUS_FLOW[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Helper function to get next available actions for current status
// eslint-disable-next-line no-unused-vars
const getNextActions = (currentStatus) => {
  if (!currentStatus) return [];
  const nextStatuses = STATUS_FLOW[currentStatus] || [];
  return STATUS_ACTIONS.filter(action => nextStatuses.includes(action.status));
};

const locationService = new LocationService();

// Color palette
const colors = {
  white: "#fff",
  primary: "#2563eb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#374151",
  gray700: "#111827",
  red500: "#ef4444",
  green500: "#10b981",
  green600: "#059669",
  blue500: "#3b82f6",
  blue600: "#2563eb",
  purple500: "#8b5cf6",
  indigo500: "#6366f1",
  amber500: "#f59e0b",
  blue50: "#eff6ff",
  blue800: "#1e40af",
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  // Memoized location parsing - must be before any early returns
  const loadingPoint = useMemo(
    () => order?.loading_point_location ? parsePostGISPoint(order.loading_point_location) : null,
    [order?.loading_point_location]
  );
  const unloadingPoint = useMemo(
    () => order?.unloading_point_location ? parsePostGISPoint(order.unloading_point_location) : null,
    [order?.unloading_point_location]
  );

  // Fetch order details
  const loadOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    console.log('🔍 Loading order details for orderId:', orderId);
    
    // Validate orderId format to prevent UUID errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(orderId)) {
      console.error('❌ Invalid order ID format:', orderId);
      console.error('❌ This might be a navigation error. Expected UUID, got:', typeof orderId, orderId);
      
      // Check if this is a navigation to scanner
      if (orderId === 'scanner' || orderId === 'qr-scanner') {
        console.log('🔄 Detected scanner route, redirecting...');
        router.replace('/(tabs)/scanner');
        return;
      }
      
      setError(`Invalid order ID format: ${orderId}`);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);

      // Auto-start tracking for assigned orders
      if (data && user && data.assigned_driver_id === user.id) {
        const trackableStatuses = ["assigned", "activated", "in_progress", "in_transit", "loading", "loaded"];
        if (trackableStatuses.includes(data.status) && !isTracking) {
          try {
            const ok = await locationService.startTracking(data.id);
            if (ok) {
              setIsTracking(true);
              console.log("✅ Auto-started tracking for order:", data.id);
            }
          } catch (autoTrackError) {
            console.warn("Auto-tracking failed:", autoTrackError);
          }
        }
      }
    } catch (err) {
      console.error("Error loading order details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, user, isTracking, router]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Subscribe to real-time updates
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

  // Check tracking status
  useEffect(() => {
    const checkTracking = async () => {
      if (!order?.id) return;
      const currentTracked = await locationService.getCurrentOrderId();
      setIsTracking(currentTracked === order.id);
    };
    checkTracking();
  }, [order?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrderDetails();
  }, [loadOrderDetails]);

  const isValidStatusTransition = (currentStatus, newStatus) => {
    return STATUS_FLOW[currentStatus]?.includes(newStatus);
  };

  const getNextActions = useCallback(() => {
    if (!order) {
      console.log('🔍 getNextActions: No order available');
      return [];
    }
    
    console.log('🔍 getNextActions:', {
      currentStatus: order.status,
      orderId: order.id
    });
    
    const currentIndex = STATUS_ACTIONS.findIndex(
      (a) => a.status === order.status
    );
    
    console.log('🔍 Current status index:', currentIndex);
    
    const nextActions = STATUS_ACTIONS.slice(currentIndex + 1);
    console.log('🔍 Next actions available:', nextActions.map(a => ({ status: a.status, label: a.label })));
    
    return nextActions;
  }, [order]);

  const updateStatus = useCallback(
    async (newStatus) => {
      console.log('🔄 Status update requested:', {
        currentStatus: order?.status,
        newStatus,
        orderId: order?.id,
        userId: user?.id,
        assignedDriverId: order?.assigned_driver_id
      });

      if (!order?.id || !user) {
        console.error('❌ Missing order or user:', { orderId: order?.id, userId: user?.id });
        Alert.alert('Error', 'Order or user information is missing');
        return;
      }

      // Check if order is assigned to current driver
      if (!order.assigned_driver_id || order.assigned_driver_id !== user.id) {
        console.warn('⚠️ Order not assigned to current driver, attempting to assign...');
        
        // Try to assign the driver to this order first
        try {
          const { error: assignError } = await supabase
            .from("orders")
            .update({
              assigned_driver_id: user.id,
              driver_id: user.id,
              status: order.status === 'pending' ? 'assigned' : order.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          if (assignError) {
            console.error('❌ Failed to assign driver:', assignError);
            Alert.alert(
              'Assignment Required',
              'This order needs to be assigned to you by a dispatcher before you can update it.',
              [{ text: 'OK' }]
            );
            return;
          }

          console.log('✅ Driver assigned successfully, reloading order...');
          // Reload the order to get updated data
          await loadOrderDetails();
          
          Alert.alert(
            'Order Assigned',
            'This order has been assigned to you. Please try the status update again.',
            [{ text: 'OK' }]
          );
          return;
        } catch (assignmentError) {
          console.error('❌ Assignment error:', assignmentError);
          Alert.alert(
            'Error',
            'Failed to assign order. Please contact dispatch.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Validate transition
      if (!isValidStatusTransition(order.status, newStatus)) {
        console.error('❌ Invalid status transition:', { from: order.status, to: newStatus });
        Alert.alert('Invalid Status', `Cannot change status from ${order.status} to ${newStatus}`);
        return;
      }

      console.log('✅ Status transition is valid, showing confirmation');

      // Note: Alert.prompt is iOS-only, using Alert.alert for cross-platform compatibility
      Alert.alert(
        'Status Update',
        `Change status from "${order.status}" to "${newStatus}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: async () => {
              try {
                console.log('📝 Starting status update process...');
                setStatusUpdating(true);

                console.log('💾 Inserting status update record...');
                // Insert status update (notes removed for cross-platform compatibility)
                const { error: statusError } = await supabase
                  .from("status_updates")
                  .insert({
                    order_id: order.id,
                    driver_id: user.id, // Fixed: Use driver_id to match database schema
                    status: newStatus,
                    notes: null, // Notes functionality removed for cross-platform compatibility
                    created_at: new Date().toISOString(),
                  });

                if (statusError) {
                  console.error('❌ Status update insert error:', statusError);
                  throw statusError;
                }
                console.log('✅ Status update record created');

                console.log('🔄 Updating order status...');
                // Update order
                const updateData = { status: newStatus };
                if ((newStatus === "in_progress" || newStatus === "in_transit") && !order.actual_start_time) {
                  updateData.actual_start_time = new Date().toISOString();
                }
                if (newStatus === "completed") {
                  console.log('🏁 Completing order - setting end times and stopping tracking...');
                  updateData.actual_end_time = new Date().toISOString();
                  updateData.delivered_at = new Date().toISOString();
                  console.log('🛑 Calling locationService.stopTracking()...');
                  await locationService.stopTracking();
                  console.log('✅ locationService.stopTracking() completed');
                  setIsTracking(false);
                  console.log('✅ setIsTracking(false) called');
                }

                console.log('📊 Update data:', updateData);
                const { error: orderError } = await supabase
                  .from("orders")
                  .update(updateData)
                  .eq("id", order.id);

                if (orderError) {
                  console.error('❌ Order update error:', orderError);
                  throw orderError;
                }
                console.log('✅ Order status updated successfully in database to:', newStatus);

                // If completing the order, show success and navigate away
                if (newStatus === "completed") {
                  Alert.alert(
                    "✅ Delivery Complete!", 
                    `Order ${order.order_number} has been completed successfully.`,
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          console.log('🏠 Navigating back to dashboard after completion');
                          router.replace('/(tabs)/orders'); // Navigate back to orders list
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert("Success", `Status updated to "${newStatus}" successfully`);
                  console.log('🔄 Refreshing order data...');
                  // Refresh order data
                  loadOrderDetails();
                }
              } catch (e) {
                console.error("❌ Update status error:", e);
                Alert.alert("Error", `Failed to update status: ${e?.message || 'Unknown error'}`);
              } finally {
                setStatusUpdating(false);
                console.log('🏁 Status update process completed');
              }
            },
          },
        ],
        'plain-text'
      );
    },
    [order, user, loadOrderDetails, router]
  );

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
        android: `${scheme}${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}(${encodeURIComponent(label)})`,
      });
      
      if (url) {
        Linking.openURL(url).catch((err) => {
          console.error("Error opening maps:", err);
          Alert.alert("Error", "Unable to open maps application.");
        });
      }
    } catch (error) {
      console.error("Error in openMaps:", error);
      Alert.alert("Error", "Failed to open navigation.");
    }
  }, []);

  const handleBack = useCallback(() => {
    if (isTracking) {
      Alert.alert(
        'Location Tracking Active',
        'Do you want to stop tracking before leaving?',
        [
          {
            text: 'Stop and Leave',
            onPress: async () => {
              await stopTracking();
              router.back();
            },
          },
          {
            text: 'Keep Tracking',
            onPress: () => router.back(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    router.back();
  }, [isTracking, stopTracking, router]);

  // Loading state
  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrderDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Order not found
  if (!order) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="inbox" size={64} color="#9ca3af" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Order #{order.order_number}</Text>
          <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
            <Text style={styles.statusText}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Information</Text>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="numbers" size={20} color="#6b7280" />
          <Text style={styles.label}>Order Number:</Text>
          <Text style={styles.value}>{order.order_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="info-outline" size={20} color="#6b7280" />
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{order.status.replace('_', ' ')}</Text>
        </View>

        {order.assigned_driver && (
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{order.assigned_driver.full_name}</Text>
          </View>
        )}
      </View>

      {/* Location Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Details</Text>

        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <MaterialIcons name="place" size={20} color="#10b981" />
            <Text style={styles.locationTitle}>Loading Point</Text>
          </View>
          <Text style={styles.locationName}>{order.loading_point_name}</Text>
          {order.loading_point_address && (
            <Text style={styles.locationAddress}>{order.loading_point_address}</Text>
          )}
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openMaps(loadingPoint, order.loading_point_name)}
          >
            <MaterialIcons name="navigation" size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <MaterialIcons name="location-on" size={20} color="#ef4444" />
            <Text style={styles.locationTitle}>Delivery Point</Text>
          </View>
          <Text style={styles.locationName}>{order.unloading_point_name}</Text>
          {order.unloading_point_address && (
            <Text style={styles.locationAddress}>{order.unloading_point_address}</Text>
          )}
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openMaps(unloadingPoint, order.unloading_point_name)}
          >
            <MaterialIcons name="navigation" size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>

        {order.estimated_distance_km && (
          <View style={styles.infoRow}>
            <MaterialIcons name="straighten" size={20} color="#6b7280" />
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.value}>{order.estimated_distance_km} km</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={20} color="#6b7280" />
          <Text style={styles.label}>Created:</Text>
          <Text style={styles.value}>
            {new Date(order.created_at).toLocaleString()}
          </Text>
        </View>

        {order.load_activated_at && (
          <View style={styles.infoRow}>
            <MaterialIcons name="check-circle" size={20} color="#10b981" />
            <Text style={styles.label}>Activated:</Text>
            <Text style={styles.value}>
              {new Date(order.load_activated_at).toLocaleString()}
            </Text>
          </View>
        )}

        {order.actual_start_time && (
          <View style={styles.infoRow}>
            <MaterialIcons name="play-circle-filled" size={20} color="#6366f1" />
            <Text style={styles.label}>Started:</Text>
            <Text style={styles.value}>
              {new Date(order.actual_start_time).toLocaleString()}
            </Text>
          </View>
        )}

        {order.delivered_at && (
          <View style={styles.infoRow}>
            <MaterialIcons name="done-all" size={20} color="#059669" />
            <Text style={styles.label}>Delivered:</Text>
            <Text style={styles.value}>
              {new Date(order.delivered_at).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Location Tracking */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Tracking</Text>
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
            <MaterialIcons name="location-off" size={20} color="#fff" />
            <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startTrackingButton}
            onPress={startTracking}
          >
            <MaterialIcons name="location-on" size={20} color="#fff" />
            <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Load Activation */}
        {order.status === "assigned" && !order.load_activated_at && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/LoadActivationScreen",
                params: { orderId: order.id, orderNumber: order.order_number },
              })
            }
          >
            <MaterialIcons name="play-circle-filled" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Activate Load</Text>
          </TouchableOpacity>
        )}

        {/* Scanner Access */}
        {order.load_activated_at && 
         ["activated", "in_progress", "in_transit", "arrived", "loading", "loaded", "unloading"].includes(order.status) && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push(`/(tabs)/scanner?orderId=${order.id}&orderNumber=${order.order_number}`)
            }
          >
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {order.status === "activated" ? "Start Order" : "Manage Order"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Status Updates */}
        {order.status !== "completed" && order.status !== "cancelled" && getNextActions(order.status).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Update Status</Text>
            {getNextActions(order.status).map((action) => (
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
            ))}
          </>
        )}

        {/* Info Message */}
        {order.status === "assigned" && order.load_activated_at && (
          <View style={styles.infoContainer}>
            <MaterialIcons name="info-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              Load is activated! You can now scan QR codes to start the order.
            </Text>
          </View>
        )}

        {/* Completed/Cancelled Message */}
        {(order.status === "completed" || order.status === "cancelled") && (
          <View style={styles.completedContainer}>
            <MaterialIcons 
              name={order.status === "completed" ? "check-circle" : "cancel"} 
              size={48} 
              color={order.status === "completed" ? colors.green600 : colors.red500} 
            />
            <Text style={[
              styles.completedText,
              order.status === "completed" ? styles.completedTextGreen : styles.cancelledTextRed
            ]}>
              This order has been {order.status === "completed" ? "completed" : "cancelled"}.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStatusStyle = (status) => {
  const styles = {
    pending: { backgroundColor: "#9ca3af" },
    assigned: { backgroundColor: "#3b82f6" },
    activated: { backgroundColor: "#10b981" },
    in_progress: { backgroundColor: "#6366f1" },
    in_transit: { backgroundColor: "#8b5cf6" },
    arrived: { backgroundColor: "#10b981" },
    loading: { backgroundColor: "#f59e0b" },
    loaded: { backgroundColor: "#10b981" },
    unloading: { backgroundColor: "#f59e0b" },
    delivered: { backgroundColor: "#059669" },
    completed: { backgroundColor: "#10b981" },
    cancelled: { backgroundColor: "#ef4444" },
  };
  return styles[status] || { backgroundColor: "#6b7280" };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.gray100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray500,
  },
  errorText: {
    fontSize: 18,
    color: colors.red500,
    textAlign: "center",
    marginTop: 16,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray700,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray500,
    marginLeft: 8,
    width: 120,
  },
  value: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
  },
  locationSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray700,
    marginLeft: 8,
  },
  locationName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 12,
    lineHeight: 20,
  },
  navigateButton: {
    backgroundColor: colors.blue500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navigateButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  trackingDescription: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 12,
    lineHeight: 20,
  },
  startTrackingButton: {
    backgroundColor: colors.green500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  startTrackingButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
  stopTrackingButton: {
    backgroundColor: colors.red500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  stopTrackingButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blue50,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.blue800,
  },
  completedContainer: {
    alignItems: "center",
    padding: 20,
    marginTop: 12,
  },
  completedText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  completedTextGreen: {
    color: colors.green600,
  },
  cancelledTextRed: {
    color: colors.red500,
  },
});
