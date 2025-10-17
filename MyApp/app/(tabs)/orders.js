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
import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";

const locationService = new LocationService();

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
  surfaceSecondary: "#f1f5f9",
  
  // Semantic colors for better mobile UX
  greenLight: "#dcfce7",
  greenBorder: "#bbf7d0",
  redLight: "#fef2f2",
  redBorder: "#fecaca",
  yellowLight: "#fef3c7",
  yellowBorder: "#fed7aa",
  blueLight: "#eff6ff",
  blueBorder: "#bfdbfe",
  
  // Shadow and border colors
  border: "#e2e8f0",
  shadow: "#0f172a",
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
  const { user } = useAuth();
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
        
        // Validate activeOrderId - check if it's valid
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValid = activeId && 
                        activeId !== 'undefined' && 
                        activeId !== 'null' && 
                        uuidRegex.test(activeId);
        
        if (isValid) {
          setActiveOrderId(activeId);
        } else if (activeId) {
          // Invalid value found - clean it up
          console.warn('Invalid activeOrderId found, cleaning up:', activeId);
          await storage.removeItem('activeOrderId');
          setActiveOrderId(null);
        }
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

  const sendLocationToDashboard = async () => {
    try {
      setSendingLocation(true);
      
      // Initialize LocationService to get current order info
      await locationService.initialize();
      const currentOrderId = await locationService.getCurrentOrderId();
      
      await locationService.sendImmediateLocationUpdate();
      
      Alert.alert(
        "Location Sent", 
        `Your current location has been sent to the dashboard.\n\nOrder ID: ${currentOrderId || 'NULL'}\n\nIf Order ID shows NULL, scan a QR code first to activate an order.`, 
        [{ text: "OK" }]
      );
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
        setLoading(false);
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

      // Fetch all orders assigned to this driver (EXCLUDING completed/cancelled)
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .not("status", "in", '("completed","cancelled")') // Exclude completed and cancelled orders
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
  }, [user]); // Include full user object to satisfy dependencies

  // Smart order activation handler
  const handleOrderPress = async (order) => {
    try {
      console.log('📦 Order pressed:', order.order_number, 'Status:', order.status);
      
      // Set this order as the active order in storage (same as QR scan)
      await AsyncStorage.setItem('activeOrderId', order.id.toString());
      
      // Initialize LocationService and start tracking (same as QR scan)
      const LocationService = require("../services/LocationService").default;
      const locationService = new LocationService();
      
      // Initialize the service to detect current order
      await locationService.initialize();
      
      // Start tracking for this order (same as QR scan)
      await locationService.startTracking(order.id);
      
      console.log("📍 Location tracking started for order:", order.order_number);
      
      // Navigate based on order status
      switch (order.status) {
        case 'assigned':
          // For newly assigned orders, activate them and go to details
          console.log('📦 Activating assigned order');
          router.push(`/(tabs)/${order.id}`);
          break;
        case 'activated':
        case 'in_progress':
        case 'in_transit':
        case 'arrived':
        case 'loading':
        case 'loaded':
        case 'unloading':
          // For active orders, go directly to order management
          console.log('📦 Opening active order management');
          router.push(`/(tabs)/${order.id}`);
          break;
        case 'completed':
        case 'delivered':
          // For completed orders, go to details view
          console.log('📦 Opening completed order details');
          router.push(`/(tabs)/${order.id}`);
          break;
        default:
          // For other statuses, might need QR scanning or different flow
          console.log('📦 Order status requires special handling:', order.status);
          router.push(`/scanner?orderId=${order.id}`);
          break;
      }
    } catch (error) {
      console.error('Error handling order press:', error);
      Alert.alert('Error', 'Failed to open order. Please try again.');
    }
  };

  // Load orders when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id, loadOrders]);

  // Refresh orders periodically to catch completed orders - but less aggressive
  useEffect(() => {
    if (!user?.id) return;
    
    // Refresh every 30 seconds (reduced from 5 seconds) when screen is active
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing orders list');
      loadOrders();
    }, 30000); // Changed from 5000 to 30000 (30 seconds)

    return () => clearInterval(interval);
  }, [user?.id, loadOrders]); // Include loadOrders in dependencies

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: colors.gray500,
      assigned: colors.info,
      activated: colors.success,
      in_progress: colors.info,
      in_transit: colors.primary,
      arrived: colors.success,
      loading: colors.warning,
      loaded: colors.success,
      unloading: colors.warning,
      delivered: colors.successDark,
      completed: colors.success,
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
          <LogoutButton 
            variant="primary"
            size="small"
            onLogoutStart={async () => {
              // Clear active order before logout
              await storage.removeItem('activeOrderId');
            }}
          />
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
  // Container and layout styles
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  
  // Text styles with improved typography
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.gray600,
    fontWeight: '500'
  },
  errorText: { 
    fontSize: 18, 
    color: colors.danger, 
    textAlign: "center", 
    marginTop: 16, 
    marginBottom: 20,
    fontWeight: '600'
  },
  
  // Button styles with enhanced mobile UX
  retryButton: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 18, 
    minHeight: 52, // Ensure 52dp minimum
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
    fontWeight: "700" 
  },
  
  // Header styles with modern design
  header: { 
    backgroundColor: colors.white, 
    paddingHorizontal: 20,
    paddingVertical: 24, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: colors.gray900, 
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 15, 
    color: colors.gray600,
    fontWeight: '500'
  },
  // List and card styles with modern mobile design
  listContent: { 
    padding: 16 
  },
  orderCard: { 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 24, // Increased for better breathing room
    marginBottom: 16, 
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, // Slightly more prominent
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  orderHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  orderNumber: { 
    fontSize: 19, 
    fontWeight: "bold", 
    color: colors.gray900,
    letterSpacing: -0.3
  },
  statusBadge: { 
    paddingHorizontal: 14, 
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
    fontSize: 13, // Improved readability 
    fontWeight: "700",
    letterSpacing: 0.5
  },
  orderDetails: { 
    marginBottom: 16 
  },
  detailRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 10,
    paddingHorizontal: 4
  },
  detailText: { 
    fontSize: 15, 
    color: colors.gray700, 
    marginLeft: 12, 
    flex: 1,
    lineHeight: 20
  },
  orderFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingTop: 16, 
    marginTop: 8,
    borderTopWidth: 1, 
    borderTopColor: colors.gray100 
  },
  dateText: { 
    fontSize: 13, 
    color: colors.gray500,
    fontWeight: '500'
  },
  // Empty state and debug styles
  emptyState: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 32 
  },
  emptyText: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: colors.gray700, 
    marginTop: 16,
    letterSpacing: -0.3
  },
  emptySubtext: { 
    fontSize: 15, 
    color: colors.gray500, 
    marginTop: 8, 
    marginBottom: 24, 
    textAlign: "center",
    lineHeight: 22
  },
  debugInfo: { 
    marginVertical: 16, 
    padding: 16, 
    backgroundColor: colors.gray50, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200
  },
  debugText: { 
    fontSize: 13, 
    color: colors.gray600, 
    marginBottom: 4,
    fontWeight: '500'
  },
  
  // Enhanced button styles with better touch targets
  refreshButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 18, 
    minHeight: 52, // Ensure 52dp minimum
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scanQRText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: "700", 
    marginLeft: 8 
  },
  
  // Starting point card modernization  
  startingPointCard: { 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 24, // Increased padding for comfort
    marginBottom: 16, 
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, // Softer shadow
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  startingPointHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16 
  },
  startingPointTitle: { 
    fontSize: 19, 
    fontWeight: "700", 
    color: colors.gray900, 
    marginLeft: 8,
    letterSpacing: -0.3
  },
  startingPointInfo: { 
    padding: 16, 
    backgroundColor: colors.gray50, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200
  },
  locationText: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: colors.gray700, 
    marginBottom: 6 
  },
  locationTime: { 
    fontSize: 13, 
    color: colors.gray600, 
    marginBottom: 16,
    fontWeight: '500'
  },
  buttonRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  // Enhanced action buttons with 52dp touch targets
  updateButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    minHeight: 52, // Ensure minimum touch target
    borderRadius: 12, 
    flex: 1, 
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  clearButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.danger, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    minHeight: 52, // Ensure minimum touch target
    borderRadius: 12, 
    flex: 1, 
    justifyContent: "center",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dashboardButtonRow: { 
    marginTop: 12 
  },
  dashboardButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.success, 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    minHeight: 52, // Ensure minimum touch target
    borderRadius: 12, 
    justifyContent: "center",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  noLocationInfo: { 
    padding: 20, 
    backgroundColor: colors.yellowLight, 
    borderRadius: 12, 
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.yellowBorder
  },
  noLocationText: { 
    fontSize: 15, 
    color: colors.warningDark, 
    textAlign: "center", 
    marginBottom: 16,
    fontWeight: '600',
    lineHeight: 20
  },
  setLocationButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.success, 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    minHeight: 52, // Ensure minimum touch target
    borderRadius: 12, 
    justifyContent: "center",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: { 
    color: colors.white, 
    fontWeight: "700", 
    marginLeft: 6 
  },
  // Active order styling
  activeOrderCard: {
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.greenLight,
    shadowColor: colors.success,
    shadowOpacity: 0.15,
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
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.successLight,
  },
  activeText: {
    fontSize: 11,
    color: colors.successDark,
    fontWeight: "700",
    marginLeft: 2,
    letterSpacing: 0.3
  },
});
