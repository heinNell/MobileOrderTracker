// Order Details Screen with Navigation and Status Updates
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { LocationService } from "../services/locationService";
import type { Order, OrderStatus } from "../../../shared/types";
import {
  parsePostGISPoint,
  toPostGISPoint,
} from "../../../shared/locationUtils";

const STATUS_ACTIONS: { status: OrderStatus; label: string; color: string }[] =
  [
    { status: "in_transit", label: "Start Transit", color: "#8B5CF6" },
    { status: "arrived", label: "Arrived", color: "#10B981" },
    { status: "loading", label: "Start Loading", color: "#F59E0B" },
    { status: "loaded", label: "Loading Complete", color: "#10B981" },
    { status: "unloading", label: "Start Unloading", color: "#F59E0B" },
    { status: "completed", label: "Complete Delivery", color: "#059669" },
  ];

export const OrderDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { order: initialOrder } = route.params as { order: Order };

  const [order, setOrder] = useState<Order>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    checkTrackingStatus();
    subscribeToOrderUpdates();
  }, []);

  const checkTrackingStatus = () => {
    const trackingOrderId = LocationService.getCurrentOrderId();
    setIsTracking(trackingOrderId === order.id);
  };

  const subscribeToOrderUpdates = () => {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const openGoogleMaps = (
    destination: { latitude: number; longitude: number },
    label: string
  ) => {
    const scheme = Platform.select({ ios: "maps:", android: "geo:" });
    const url = Platform.select({
      ios: `${scheme}?daddr=${destination.latitude},${destination.longitude}`,
      android: `${scheme}${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const startTracking = async () => {
    try {
      const success = await LocationService.startTracking(order.id);

      if (success) {
        setIsTracking(true);
        Alert.alert("Success", "Location tracking started");
      } else {
        Alert.alert("Error", "Failed to start location tracking");
      }
    } catch (error) {
      console.error("Error starting tracking:", error);
      Alert.alert("Error", "Failed to start location tracking");
    }
  };

  const stopTracking = async () => {
    try {
      await LocationService.stopTracking();
      setIsTracking(false);
      Alert.alert("Success", "Location tracking stopped");
    } catch (error) {
      console.error("Error stopping tracking:", error);
    }
  };

  const updateStatus = async (newStatus: OrderStatus, notes?: string) => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get current location
      const location = await LocationService.getCurrentLocation();

      // Create status update
      const { error: statusError } = await supabase
        .from("status_updates")
        .insert({
          order_id: order.id,
          driver_id: user.id,
          status: newStatus,
          location: location
            ? `SRID=4326;POINT(${location.coords.longitude} ${location.coords.latitude})`
            : null,
          notes,
        });

      if (statusError) throw statusError;

      // Update order status
      const updateData: any = { status: newStatus };

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

      // Start tracking on transit
      if (newStatus === "in_transit" && !isTracking) {
        await startTracking();
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const reportIncident = () => {
    navigation.navigate(
      "ReportIncident" as never,
      { orderId: order.id } as never
    );
  };

  const sendMessage = () => {
    navigation.navigate("Messages" as never, { orderId: order.id } as never);
  };

  const getNextActions = () => {
    const currentIndex = STATUS_ACTIONS.findIndex(
      (action) => action.status === order.status
    );
    return STATUS_ACTIONS.slice(currentIndex + 1);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Order Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
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
          onPress={() =>
            openGoogleMaps(
              parsePostGISPoint(order.loading_point_location),
              order.loading_point_name
            )
          }
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
          onPress={() =>
            openGoogleMaps(
              parsePostGISPoint(order.unloading_point_location),
              order.unloading_point_name
            )
          }
        >
          <Text style={styles.navigateButtonText}>
            Navigate to Unloading Point
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delivery Instructions */}
      {order.delivery_instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions</Text>
          <Text style={styles.instructions}>{order.delivery_instructions}</Text>
        </View>
      )}

      {/* Special Handling */}
      {order.special_handling_instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Handling</Text>
          <Text style={styles.instructions}>
            {order.special_handling_instructions}
          </Text>
        </View>
      )}

      {/* Contact Info */}
      {order.contact_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactName}>{order.contact_name}</Text>
          {order.contact_phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${order.contact_phone}`)}
            >
              <Text style={styles.contactPhone}>{order.contact_phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tracking Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>
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
          {getNextActions().map((action) => (
            <TouchableOpacity
              key={action.status}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => updateStatus(action.status)}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
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
  return colors[status];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
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
  },
  navigateButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  navigateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: "#3B82F6",
  },
  startTrackingButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startTrackingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  stopTrackingButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  stopTrackingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
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
  quickActionText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
});
