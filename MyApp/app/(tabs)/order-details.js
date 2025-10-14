// app/(tabs)/order-details.js
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

// Color palette
const colors = {
  white: "#fff",
  black: "#000",
  primary: "#2563eb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#111827",
  red500: "#ef4444",
  green500: "#10b981",
  green600: "#059669",
  blue500: "#3b82f6",
  indigo500: "#6366f1",
  purple500: "#8b5cf6",
  border: "#d1d5db",
  blue50: "#eff6ff",
  blue800: "#1e40af",
};

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
  }, [orderId, loadOrderDetails]);

  const loadOrderDetails = useCallback(async () => {
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
  }, [orderId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
  };

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
        <MaterialIcons name="error-outline" size={64} color={colors.red500} />
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
        <MaterialIcons name="inbox" size={64} color={colors.gray400} />
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
          <MaterialIcons name="numbers" size={20} color={colors.gray500} />
          <Text style={styles.label}>Order Number:</Text>
          <Text style={styles.value}>{order.order_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="info-outline" size={20} color={colors.gray500} />
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{order.status}</Text>
        </View>

        {order.assigned_driver && (
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color={colors.gray500} />
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{order.assigned_driver.full_name}</Text>
          </View>
        )}
      </View>

      {/* Location Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Details</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="place" size={20} color={colors.green500} />
          <Text style={styles.label}>Loading Point:</Text>
          <Text style={styles.value}>{order.loading_point_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={20} color={colors.red500} />
          <Text style={styles.label}>Delivery Point:</Text>
          <Text style={styles.value}>{order.unloading_point_name}</Text>
        </View>

        {order.estimated_distance_km && (
          <View style={styles.infoRow}>
            <MaterialIcons name="straighten" size={20} color={colors.gray500} />
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.value}>{order.estimated_distance_km} km</Text>
          </View>
        )}
      </View>

      {/* Timestamps Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={20} color={colors.gray500} />
          <Text style={styles.label}>Created:</Text>
          <Text style={styles.value}>
            {new Date(order.created_at).toLocaleString()}
          </Text>
        </View>

        {order.load_activated_at && (
          <View style={styles.infoRow}>
            <MaterialIcons name="check-circle" size={20} color={colors.green500} />
            <Text style={styles.label}>Activated:</Text>
            <Text style={styles.value}>
              {new Date(order.load_activated_at).toLocaleString()}
            </Text>
          </View>
        )}

        {order.delivered_at && (
          <View style={styles.infoRow}>
            <MaterialIcons name="done-all" size={20} color={colors.green600} />
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
            <MaterialIcons name="play-circle-filled" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>Activate Load</Text>
          </TouchableOpacity>
        )}

        {order.load_activated_at && ["activated", "in_progress", "in_transit", "arrived", "loading", "loaded", "unloading"].includes(order.status) && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
router.push(`/(tabs)/scanner?orderId=${order.id}&orderNumber=${order.order_number}`)
            }
          >
            <MaterialIcons name="qr-code-scanner" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>
              {order.status === "activated" ? "Start Order" : "Manage Order"}
            </Text>
          </TouchableOpacity>
        )}

        {order.status === "assigned" && order.load_activated_at && (
          <View style={styles.infoContainer}>
            <MaterialIcons name="info-outline" size={20} color={colors.indigo500} />
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
  const statusStyles = {
    pending: { backgroundColor: colors.gray400 },
    assigned: { backgroundColor: colors.blue500 },
    activated: { backgroundColor: colors.green500 },
    in_progress: { backgroundColor: colors.indigo500 },
    in_transit: { backgroundColor: colors.purple500 },
    delivered: { backgroundColor: colors.green600 },
    completed: { backgroundColor: colors.green500 },
  };
  return statusStyles[status] || { backgroundColor: colors.gray500 };
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
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.gray800,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray800,
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
    color: colors.gray800,
    flex: 1,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
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
  secondaryButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.gray700,
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
});
