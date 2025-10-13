// app/(tabs)/order-details.js
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import
  {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
import { supabase } from "../lib/supabase";

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      console.error("Error loading order details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

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

  if (!order) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="inbox" size={64} color="#9ca3af" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
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
        <Text style={styles.title}>Order #{order.order_number}</Text>
        <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Order Information Card */}
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
          <Text style={styles.value}>{order.status}</Text>
        </View>

        {order.assigned_driver && (
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{order.assigned_driver.full_name}</Text>
          </View>
        )}
      </View>

      {/* Location Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Details</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="place" size={20} color="#10b981" />
          <Text style={styles.label}>Loading Point:</Text>
          <Text style={styles.value}>{order.loading_point_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={20} color="#ef4444" />
          <Text style={styles.label}>Delivery Point:</Text>
          <Text style={styles.value}>{order.unloading_point_name}</Text>
        </View>

        {order.estimated_distance_km && (
          <View style={styles.infoRow}>
            <MaterialIcons name="straighten" size={20} color="#6b7280" />
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.value}>{order.estimated_distance_km} km</Text>
          </View>
        )}
      </View>

      {/* Timestamps Card */}
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

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
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

        {order.load_activated_at && ["activated", "in_progress", "in_transit", "arrived", "loading", "loaded", "unloading"].includes(order.status) && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/scanner",
                params: { orderId: order.id, orderNumber: order.order_number },
              })
            }
          >
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {order.status === "activated" ? "Start Order" : "Manage Order"}
            </Text>
          </TouchableOpacity>
        )}

        {order.status === "assigned" && order.load_activated_at && (
          <View style={styles.infoContainer}>
            <MaterialIcons name="info-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              Load is activated! You can now scan QR codes to start the order.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Back to Orders</Text>
        </TouchableOpacity>
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
    delivered: { backgroundColor: "#059669" },
    completed: { backgroundColor: "#10b981" },
  };
  return styles[status] || { backgroundColor: "#6b7280" };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 16,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    marginLeft: 8,
    width: 120,
  },
  value: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
