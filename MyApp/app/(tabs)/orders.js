import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
  } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";

const locationService = new LocationService();

// Color palette
const colors = {
  white: "#fff",
  primary: "#2563eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#374151",
  gray700: "#111827",
  gray900: "#1f2937",
  red500: "#ef4444",
  red600: "#dc2626",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  green500: "#10b981",
  green600: "#059669",
  yellow300: "#fef3c7",
  yellow800: "#92400e",
  blue50: "#eff6ff",
  gray50: "#f8fafc",
  gray100: "#f3f4f6",
  red50: "#fef2f2",
  gray200: "#e5e7eb",
  blue500: "#3b82f6",
  purple500: "#8b5cf6",
  indigo500: "#6366f1",
  amber500: "#f59e0b",
  emerald600: "#059669",
};

const storage = Platform.OS === 'web' 
  ? {
      getItem: (key) => Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
      setItem: (key, value) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key) => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); return Promise.resolve(); },
    }
  : AsyncStorage;

export default function OrdersScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [startingPoint, setStartingPoint] = useState(null);
  const [settingLocation, setSettingLocation] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);

  useEffect(() => {
    loadStartingPoint();
    // Load the active order ID from storage
    const loadActiveOrderId = async () => {
      try {
        const activeId = await storage.getItem('activeOrderId');
        setActiveOrderId(activeId);
      } catch (error) {
        console.error('Error loading active order ID:', error);
      }
    };
    loadActiveOrderId();
  }, []);

  const loadStartingPoint = async () => {
    try {
      const point = await locationService.getStartingPoint();
      setStartingPoint(point);
    } catch (error) {
      console.error('Error loading starting point:', error);
    }
  };

  const setCurrentLocationAsStartingPoint = async () => {
    try {
      setSettingLocation(true);
      const location = await locationService.setCurrentLocationAsStartingPoint();
      setStartingPoint(location);
      Alert.alert("Starting Point Set", `Your current location has been set as the starting point for orders.\n\nLat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}`, [{ text: "OK" }]);
    } catch (error) {
      Alert.alert("Error", "Failed to set starting point. Please check location permissions and try again.", [{ text: "OK" }]);
    } finally {
      setSettingLocation(false);
    }
  };

  const clearStartingPoint = async () => {
    try {
      await locationService.clearStartingPoint();
      setStartingPoint(null);
      Alert.alert("Starting Point Cleared", "The starting point has been removed.", [{ text: "OK" }]);
    } catch (error) {
      Alert.alert("Error", "Failed to clear starting point.", [{ text: "OK" }]);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will clear your active order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.removeItem('activeOrderId');
              const result = await signOut();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to sign out');
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out properly');
            }
          },
        },
      ]
    );
  };

  const sendLocationToDashboard = async () => {
    try {
      setSendingLocation(true);
      await locationService.sendImmediateLocationUpdate();
      Alert.alert("Location Sent", "Your current location has been sent to the dashboard for tracking.", [{ text: "OK" }]);
    } catch (error) {
      console.error('Error sending location to dashboard:', error);
      Alert.alert("Error", "Failed to send location to dashboard. Please check your internet connection and try again.", [{ text: "OK" }]);
    } finally {
      setSendingLocation(false);
    }
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        setError("Please log in to view orders");
        return;
      }

      console.log('🔍 Loading orders for driver ID:', user.id);
      console.log('🔍 User object:', user);

      // First, let's check if there are any orders in the database at all
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select("id, order_number, assigned_driver_id, status")
        .limit(10);

      if (allOrdersError) {
        console.error('Error fetching all orders:', allOrdersError);
      } else {
        console.log('📋 Sample orders in database:', allOrders);
      }

      // Fetch all orders assigned to this driver
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(data || []);
      
      // Enhanced debugging
      console.log('📦 Loaded orders for user:', user.id);
      console.log('📦 Found', data?.length || 0, 'assigned orders');
      if (data && data.length > 0) {
        console.log('📦 Orders:', data.map(o => ({ id: o.id, order_number: o.order_number, status: o.status, assigned_driver_id: o.assigned_driver_id })));
      } else {
        console.log('❌ No orders found assigned to driver ID:', user.id);
        
        // Let's also check for orders that might match the user's email or other identifiers
        const { data: emailOrders, error: emailError } = await supabase
          .from("orders")
          .select("id, order_number, assigned_driver_id, driver_email")
          .eq("driver_email", user.email)
          .limit(5);
          
        if (!emailError && emailOrders?.length > 0) {
          console.log('📧 Found orders by email:', emailOrders);
        }
      }
      
    } catch (err) {
      console.error("Error loading assigned orders:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Smart order activation handler
  const handleOrderPress = async (order) => {
    try {
      console.log('📦 Order pressed:', order.order_number, 'Status:', order.status);
      
      // Set this order as the active order in storage
      await AsyncStorage.setItem('activeOrderId', order.id.toString());
      
      // Navigate based on order status
      switch (order.status) {
        case 'assigned':
          // For newly assigned orders, activate them and go to details
          console.log('📦 Activating assigned order');
          router.push(`/order-details/${order.id}`);
          break;
        case 'activated':
        case 'in_progress':
          // For already active/in-progress orders, go directly to details
          console.log('📦 Opening active/in-progress order details');
          router.push(`/order-details/${order.id}`);
          break;
        default:
          // For other statuses, might need QR scanning or different flow
          console.log('📦 Order status requires special handling:', order.status);
          router.push(`/qr-scanner?orderId=${order.id}`);
          break;
      }
    } catch (error) {
      console.error('Error handling order press:', error);
      Alert.alert('Error', 'Failed to open order. Please try again.');
    }
  };

  // Load orders when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: colors.gray400,
      assigned: colors.blue500,
      activated: colors.green500,
      in_progress: colors.indigo500,
      in_transit: colors.purple500,
      arrived: colors.green500,
      loading: colors.amber500,
      loaded: colors.green500,
      unloading: colors.amber500,
      delivered: colors.emerald600,
      completed: colors.green500,
    };
    return statusColors[status] || colors.gray500;
  };

  const renderOrderItem = ({ item }) => {
    const isActive = activeOrderId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          isActive && styles.activeOrderCard
        ]}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleRow}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            {isActive && (
              <View style={styles.activeIndicator}>
                <MaterialIcons name="radio-button-checked" size={16} color="#10b981" />
                <Text style={styles.activeText}>Active</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="place" size={18} color="#10b981" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.loading_point_name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={18} color="#ef4444" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.unloading_point_name}
          </Text>
        </View>

        {item.estimated_distance_km && (
          <View style={styles.detailRow}>
            <MaterialIcons name="straighten" size={18} color="#6b7280" />
            <Text style={styles.detailText}>{item.estimated_distance_km} km</Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>My Orders</Text>
            <Text style={styles.subtitle}>
              {orders.length === 0 
                ? "No orders assigned" 
                : `${orders.length} order${orders.length !== 1 ? 's' : ''} assigned`}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No Orders Assigned</Text>
          <Text style={styles.emptySubtext}>
            You don&apos;t have any orders assigned to you yet.{'\n'}
            Contact dispatch or check back later for new assignments.
          </Text>
          {user && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>Driver ID: {user.id}</Text>
              <Text style={styles.debugText}>Email: {user.email}</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.scanQRText}>Refresh Orders</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={() => (
            <View style={styles.startingPointCard}>
              <View style={styles.startingPointHeader}>
                <MaterialIcons name="my-location" size={24} color="#2563eb" />
                <Text style={styles.startingPointTitle}>Starting Point</Text>
              </View>

              {startingPoint ? (
                <View style={styles.startingPointInfo}>
                  <Text style={styles.locationText}>
                    📍 Lat: {startingPoint.latitude.toFixed(6)}, Lng: {startingPoint.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationTime}>
                    Set: {new Date(startingPoint.timestamp).toLocaleString()}
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={styles.updateButton} 
                      onPress={setCurrentLocationAsStartingPoint}
                      disabled={settingLocation}
                    >
                      {settingLocation ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Update</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.clearButton} 
                      onPress={clearStartingPoint}
                    >
                      <MaterialIcons name="clear" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dashboardButtonRow}>
                    <TouchableOpacity 
                      style={styles.dashboardButton} 
                      onPress={sendLocationToDashboard}
                      disabled={sendingLocation}
                    >
                      {sendingLocation ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="dashboard" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Send to Dashboard</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.noLocationInfo}>
                  <Text style={styles.noLocationText}>
                    Set your current location as the starting point for order tracking
                  </Text>
                  <TouchableOpacity 
                    style={styles.setLocationButton} 
                    onPress={setCurrentLocationAsStartingPoint}
                    disabled={settingLocation}
                  >
                    {settingLocation ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="add-location" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Set Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.gray500 },
  errorText: { fontSize: 18, color: colors.red500, textAlign: "center", marginTop: 16, marginBottom: 20 },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  header: { backgroundColor: colors.white, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoutButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.red50, borderRadius: 8, borderWidth: 1, borderColor: colors.red200 },
  logoutText: { color: colors.red500, fontSize: 14, fontWeight: "600", marginLeft: 6 },
  title: { fontSize: 28, fontWeight: "bold", color: colors.gray700, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.gray500 },
  listContent: { padding: 16 },
  orderCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3, boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderNumber: { fontSize: 18, fontWeight: "bold", color: colors.gray700 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailText: { fontSize: 14, color: colors.gray600, marginLeft: 8, flex: 1 },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  dateText: { fontSize: 12, color: colors.gray400 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 18, fontWeight: "600", color: colors.gray600, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: colors.gray400, marginTop: 8, marginBottom: 20, textAlign: "center" },
  debugInfo: { marginVertical: 16, padding: 12, backgroundColor: colors.gray50, borderRadius: 8 },
  debugText: { fontSize: 12, color: colors.gray500, marginBottom: 4 },
  refreshButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  scanQRText: { color: colors.white, fontSize: 16, fontWeight: "600", marginLeft: 8 },
  startingPointCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3, boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" },
  startingPointHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  startingPointTitle: { fontSize: 18, fontWeight: "600", color: colors.gray900, marginLeft: 8 },
  startingPointInfo: { padding: 12, backgroundColor: colors.gray50, borderRadius: 8 },
  locationText: { fontSize: 14, fontWeight: "500", color: colors.gray600, marginBottom: 4 },
  locationTime: { fontSize: 12, color: colors.gray500, marginBottom: 12 },
  buttonRow: { flexDirection: "row", gap: 8 },
  updateButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, flex: 1, justifyContent: "center" },
  clearButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.red600, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, flex: 1, justifyContent: "center" },
  dashboardButtonRow: { marginTop: 8 },
  dashboardButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green500, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, justifyContent: "center" },
  noLocationInfo: { padding: 16, backgroundColor: colors.yellow300, borderRadius: 8, alignItems: "center" },
  noLocationText: { fontSize: 14, color: colors.yellow800, textAlign: "center", marginBottom: 12 },
  setLocationButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green500, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, justifyContent: "center" },
  buttonText: { color: colors.white, fontWeight: "500", marginLeft: 4 },
  activeOrderCard: {
    borderWidth: 2,
    borderColor: colors.green500,
    backgroundColor: colors.green50,
  },
  orderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: colors.green100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 10,
    color: colors.green600,
    fontWeight: "600",
    marginLeft: 2,
  },
});
