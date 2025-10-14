import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";

const locationService = new LocationService();

// Color constants
const colors = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#6366f1',
  purple: '#8b5cf6',
  
  white: '#fff',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9ca3af',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  
  greenLight: '#D1FAE5',
  redLight: '#FEE2E2',
};

const getStatusColor = (status) => {
  const statusColors = {
    pending: colors.gray400,
    assigned: colors.primary,
    activated: colors.success,
    in_progress: colors.info,
    in_transit: colors.purple,
    arrived: colors.success,
    loading: colors.warning,
    loaded: colors.success,
    unloading: colors.warning,
    delivered: '#059669',
    completed: colors.success,
    cancelled: colors.danger,
  };
  return statusColors[status] || colors.gray500;
};

const storage = Platform.OS === 'web' 
  ? {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    }
  : AsyncStorage;

function DriverDashboard() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [scannedOrders, setScannedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();

  const loadDriverData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user || !isAuthenticated) return;

      const activeOrderId = await storage.getItem("activeOrderId");

      if (activeOrderId) {
        const { data: activeOrderData, error: activeError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", activeOrderId)
          .eq("assigned_driver_id", user.id)
          .single();

        if (activeError) {
          if (activeError.code === "PGRST116") {
            await storage.removeItem("activeOrderId");
            setActiveOrder(null);
          } else {
            console.error("Error fetching active order:", activeError);
          }
        } else {
          setActiveOrder(activeOrderData);
        }
      } else {
        setActiveOrder(null);
      }

      const { data: scannedData, error: scannedError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .not("status", "eq", "pending")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (scannedError) {
        console.error("Error fetching scanned orders:", scannedError);
        setScannedOrders([]);
      } else {
        setScannedOrders(scannedData || []);
      }

      try {
        const trackingStatus = await locationService.isCurrentlyTracking();
        setLocationTracking(trackingStatus);
      } catch (trackingError) {
        console.warn("Error checking tracking status:", trackingError);
        setLocationTracking(false);
      }
    } catch (error) {
      console.error("Error loading driver data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (user && isAuthenticated) {
      loadDriverData();
    } else {
      setLoading(false);
    }
  }, [user, isAuthenticated, loadDriverData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDriverData();
  };

  const startLocationTracking = async () => {
    try {
      if (!activeOrder?.id) return;
      await locationService.startTracking(activeOrder.id);
      setLocationTracking(true);
      if (Platform.OS === 'web') {
        alert("Started tracking your location for this order.");
      } else {
        Alert.alert("Location Tracking", "Started tracking your location for this order.");
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert("Failed to start location tracking.");
      } else {
        Alert.alert("Error", "Failed to start location tracking.");
      }
    }
  };

  const stopLocationTracking = async () => {
    try {
      await locationService.stopTracking();
      setLocationTracking(false);
      if (Platform.OS === 'web') {
        alert("Stopped tracking your location.");
      } else {
        Alert.alert("Location Tracking", "Stopped tracking your location.");
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert("Failed to stop location tracking.");
      } else {
        Alert.alert("Error", "Failed to stop location tracking.");
      }
    }
  };

  const handleLogout = async () => {
    console.log('🔘 Dashboard logout button pressed');
    
    const performLogout = async () => {
      console.log('✅ Performing logout...');
      try {
        if (locationTracking) {
          console.log('🛑 Stopping location tracking...');
          try {
            await locationService.stopTracking();
            setLocationTracking(false);
          } catch (locError) {
            console.warn('⚠️ Location stop error:', locError);
          }
        }
        
        console.log('🗑️ Clearing active order...');
        try {
          await storage.removeItem("activeOrderId");
          setActiveOrder(null);
        } catch (storageError) {
          console.warn('⚠️ Storage clear error:', storageError);
        }
        
        console.log('🔐 Calling signOut...');
        const result = await signOut();
        console.log('🔄 SignOut result:', result);
        
        if (!result || !result.success) {
          console.error('❌ SignOut failed:', result?.error);
        }
        
        console.log('🔄 Navigating to login...');
        router.replace('/(auth)/login');
        
      } catch (error) {
        console.error("❌ Logout exception:", error);
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out? This will stop location tracking and clear your active order.')) {
        await performLogout();
      } else {
        console.log('❌ Logout cancelled');
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out? This will stop location tracking and clear your active order.",
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => console.log('❌ Logout cancelled')
          },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: performLogout,
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Driver Dashboard</Text>
              <Text style={styles.subtitle}>
                Welcome back, {user?.email?.split("@")[0]}
              </Text>
            </View>
            <Pressable 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color={colors.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {activeOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="local-shipping" size={24} color={colors.success} />
                <Text style={styles.cardTitle}>Active Order</Text>
              </View>
              {locationTracking && (
                <View style={styles.trackingIndicator}>
                  <MaterialIcons name="gps-fixed" size={16} color={colors.success} />
                  <Text style={styles.trackingText}>Tracking</Text>
                </View>
              )}
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>#{activeOrder.order_number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(activeOrder.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {activeOrder.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.routeInfo}>
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={18} color={colors.success} />
                <Text style={styles.locationText}>
                  {activeOrder.loading_point_name}
                </Text>
              </View>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={colors.gray400}
              />
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={18} color={colors.danger} />
                <Text style={styles.locationText}>
                  {activeOrder.unloading_point_name}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push(`/(tabs)/${activeOrder.id}`)}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color={colors.white} />
                <Text style={styles.buttonText}>Update Status</Text>
              </Pressable>

              {locationTracking ? (
                <Pressable style={styles.stopButton} onPress={stopLocationTracking}>
                  <MaterialIcons name="stop" size={20} color={colors.white} />
                  <Text style={styles.buttonText}>Stop Tracking</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.trackButton} onPress={startLocationTracking}>
                  <MaterialIcons name="my-location" size={20} color={colors.white} />
                  <Text style={styles.buttonText}>Start Tracking</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noActiveOrderCard}>
            <MaterialIcons name="inbox" size={48} color={colors.gray400} />
            <Text style={styles.noActiveText}>No Active Order</Text>
            <Text style={styles.noActiveSubtext}>
              Scan a QR code to start tracking an order
            </Text>
            <Pressable style={styles.scanButton} onPress={() => router.push('scanner')}>
              <MaterialIcons name="qr-code-scanner" size={20} color={colors.white} />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </Pressable>
          </View>
        )}

        {scannedOrders.length > 0 && (
          <View style={styles.recentOrdersCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="history" size={24} color={colors.info} />
              <Text style={styles.cardTitle}>Recent Orders</Text>
            </View>

            {scannedOrders.slice(0, 5).map((order) => (
              <Pressable
                key={order.id}
                style={styles.recentOrderItem}
                onPress={() => router.push(`/(tabs)/${order.id}`)}
              >
                <View>
                  <Text style={styles.recentOrderNumber}>
                    #{order.order_number}
                  </Text>
                  <Text style={styles.recentOrderDate}>
                    Scanned: {new Date(order.updated_at).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.miniStatusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text style={styles.miniStatusText}>
                    {order.status.replace("_", " ")}
                  </Text>
                </View>
              </Pressable>
            ))}

            <Pressable style={styles.viewAllButton} onPress={() => router.push('orders')}>
              <Text style={styles.viewAllText}>View All Orders</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.info} />
            </Pressable>
          </View>
        )}

        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>

          <View style={styles.quickActionGrid}>
            <Pressable style={styles.quickActionButton} onPress={() => router.push('orders')}>
              <MaterialIcons name="list-alt" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>All Orders</Text>
            </Pressable>

            <Pressable style={styles.quickActionButton} onPress={() => router.push('scanner')}>
              <MaterialIcons name="qr-code-scanner" size={24} color={colors.success} />
              <Text style={styles.quickActionText}>Scan QR</Text>
            </Pressable>

            <Pressable style={styles.quickActionButton} onPress={() => router.push('profile')}>
              <MaterialIcons name="person" size={24} color={colors.purple} />
              <Text style={styles.quickActionText}>Profile</Text>
            </Pressable>

            <Pressable style={styles.quickActionButton} onPress={loadDriverData}>
              <MaterialIcons name="refresh" size={24} color={colors.warning} />
              <Text style={styles.quickActionText}>Refresh</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  scrollView: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.white,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.primary },
  header: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: colors.gray900 },
  subtitle: { fontSize: 16, color: colors.gray500, marginTop: 4 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: colors.redLight,
    borderRadius: 8,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: "600", marginLeft: 4 },
  activeOrderCard: {
    backgroundColor: colors.white,
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 3,
  },
  noActiveOrderCard: {
    backgroundColor: colors.white,
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: "center",
    elevation: 3,
  },
  noActiveText: { fontSize: 18, fontWeight: "600", color: colors.gray900, marginTop: 12 },
  noActiveSubtext: { fontSize: 14, color: colors.gray500, marginTop: 8, textAlign: "center" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.gray900, marginLeft: 8 },
  trackingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trackingText: { fontSize: 12, color: colors.success, marginLeft: 4, fontWeight: "600" },
  orderInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: "600", color: colors.gray900 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  routeInfo: { marginBottom: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  locationText: { fontSize: 14, color: colors.gray700, marginLeft: 8, flex: 1 },
  actionButtons: { flexDirection: "row", justifyContent: "space-between" },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  trackButton: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: "600", marginLeft: 8 },
  recentOrdersCard: {
    backgroundColor: colors.white,
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 3,
  },
  recentOrderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  recentOrderNumber: { fontSize: 16, fontWeight: "600", color: colors.gray900 },
  recentOrderDate: { fontSize: 12, color: colors.gray500, marginTop: 4 },
  miniStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  miniStatusText: { color: colors.white, fontSize: 10, fontWeight: "600" },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: { fontSize: 14, color: colors.info, fontWeight: "600", marginRight: 4 },
  quickActionsCard: {
    backgroundColor: colors.white,
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 3,
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionText: { fontSize: 14, fontWeight: "600", color: colors.gray700, marginTop: 8 },
});

export default DriverDashboard;
