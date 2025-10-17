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

// Modern mobile-first color palette
const colors = {
  // Base colors
  white: "#ffffff",
  black: "#000000",
  
  // Primary colors
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  primaryDark: "#1d4ed8",
  
  // Gray scale with improved contrast
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#0f172a",
  
  // Status colors with better contrast
  success: "#10b981",
  successLight: "#34d399",
  successDark: "#059669",
  danger: "#ef4444",
  dangerLight: "#f87171",
  dangerDark: "#dc2626",
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  warningDark: "#d97706",
  info: "#3b82f6",
  infoLight: "#60a5fa",
  infoDark: "#2563eb",
  
  // Background colors
  background: "#f8fafc",
  surface: "#ffffff",
  
  // Semantic background colors
  blue50: "#eff6ff",
  blue800: "#1e40af",
  green500: "#10b981",
  green600: "#059669",
  red500: "#ef4444",
  indigo500: "#6366f1",
  purple500: "#8b5cf6",
  
  // Border and shadow
  border: "#e2e8f0",
  shadow: "#0f172a",
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

      // Validate orderId format to prevent UUID errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(orderId)) {
        throw new Error(`Invalid order ID format: ${orderId}`);
      }

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
    pending: { backgroundColor: colors.gray500 },
    assigned: { backgroundColor: colors.info },
    activated: { backgroundColor: colors.success },
    in_progress: { backgroundColor: colors.info },
    in_transit: { backgroundColor: colors.primary },
    delivered: { backgroundColor: colors.successDark },
    completed: { backgroundColor: colors.success },
  };
  return statusStyles[status] || { backgroundColor: colors.gray500 };
};

const styles = StyleSheet.create({
  // Container and layout styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  
  // Enhanced text and loading styles
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    textAlign: "center",
    marginTop: 16,
    fontWeight: '600',
  },
  
  // Modern button styling
  retryButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  
  // Enhanced header design
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.gray900,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  
  // Modern card design
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // Enhanced info row styling
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray600,
    marginLeft: 12,
    width: 120,
  },
  value: {
    fontSize: 15,
    color: colors.gray900,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Modern action container and buttons
  actionContainer: {
    padding: 20,
    paddingBottom: 36,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  
  // Enhanced secondary button
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: colors.gray700,
    fontSize: 16,
    fontWeight: "700",
  },
  
  // Info container styling
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blue50,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.blue800,
    fontWeight: '600',
    lineHeight: 20,
  },
});
