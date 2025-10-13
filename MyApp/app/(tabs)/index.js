import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
  } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";

// Web-compatible button component
const WebCompatibleButton = ({ children, onPress, style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        onClick={onPress}
        style={{
          ...StyleSheet.flatten(style),
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: StyleSheet.flatten(style)?.flexDirection || 'column',
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
  
  return (
    <TouchableOpacity style={style} onPress={onPress} {...props}>
      {children}
    </TouchableOpacity>
  );
};

const locationService = new LocationService();

// Platform-aware storage to handle web compatibility
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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

function DriverDashboard() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [scannedOrders, setScannedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('📊 Dashboard auth state:', { 
      user: user?.email, 
      isAuthenticated,
      hasUser: !!user,
      loading
    });
    
    // If not authenticated, should redirect to login
    if (!isAuthenticated && !loading) {
      console.log('🚪 Not authenticated, should redirect to login');
    }
  }, [user, isAuthenticated, loading]);

  const loadDriverData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Check for active order from AsyncStorage first (from QR scan)
      const activeOrderId = await storage.getItem("activeOrderId");

      if (activeOrderId) {
        // Get the specific active order
        const { data: activeOrderData, error: activeError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", activeOrderId)
          .eq("assigned_driver_id", user.id)
          .single();

        if (activeError) {
          if (activeError.code === "PGRST116") {
            // Order not found - clear invalid active order
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

      // Get recently scanned orders (last 5)
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

      // Check location tracking status
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
  };

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDriverData();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#9ca3af",
      assigned: "#3b82f6",
      activated: "#10b981",
      in_progress: "#6366f1",
      in_transit: "#8b5cf6",
      arrived: "#10b981",
      loading: "#f59e0b",
      loaded: "#10b981",
      unloading: "#f59e0b",
      delivered: "#059669",
      completed: "#10b981",
      cancelled: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const startLocationTracking = async () => {
    try {
      await locationService.startTracking(activeOrder.id);
      setLocationTracking(true);
      Alert.alert("Location Tracking", "Started tracking your location for this order.");
    } catch (error) {
      Alert.alert("Error", "Failed to start location tracking.");
    }
  };

  const stopLocationTracking = async () => {
    try {
      await locationService.stopTracking();
      setLocationTracking(false);
      Alert.alert("Location Tracking", "Stopped tracking your location.");
    } catch (error) {
      Alert.alert("Error", "Failed to stop location tracking.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? This will stop location tracking and clear your active order.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🔄 Starting logout from dashboard...');
              
              // Stop location tracking first
              if (locationTracking) {
                console.log('⏹️ Stopping location tracking...');
                await locationService.stopTracking();
                setLocationTracking(false);
              }

              // Clear active order from AsyncStorage
              await storage.removeItem("activeOrderId");
              setActiveOrder(null);

              // Call signOut from AuthContext - this handles navigation automatically
              console.log('🔐 Signing out...');
              const result = await signOut();
              
              if (!result.success) {
                console.error('❌ Logout failed:', result.error);
                Alert.alert('Error', result.error || 'Failed to logout properly');
              } else {
                console.log('✅ Logout successful from dashboard');
                // Don't manually navigate - AuthContext will handle this
              }
            } catch (error) {
              console.error("❌ Error during logout:", error);
              Alert.alert("Error", "Failed to logout properly");
              
              // Ensure we try to clear state even on error
              try {
                await signOut();
              } catch (fallbackError) {
                console.error("❌ Fallback logout also failed:", fallbackError);
              }
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Driver Dashboard</Text>
              <Text style={styles.subtitle}>
                Welcome back, {user?.email?.split("@")[0]}
              </Text>
            </View>
            <WebCompatibleButton 
              style={styles.logoutButton}
              onPress={() => {
                console.log('🔘 Logout button clicked');
                handleLogout();
              }}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </WebCompatibleButton>
          </View>
        </View>

        {/* Active Order Section */}
        {activeOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="local-shipping" size={24} color="#10b981" />
                <Text style={styles.cardTitle}>Active Order</Text>
              </View>
              {locationTracking && (
                <View style={styles.trackingIndicator}>
                  <MaterialIcons name="gps-fixed" size={16} color="#10b981" />
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
                <MaterialIcons name="place" size={18} color="#10b981" />
                <Text style={styles.locationText}>
                  {activeOrder.loading_point_name}
                </Text>
              </View>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color="#9ca3af"
              />
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={18} color="#ef4444" />
                <Text style={styles.locationText}>
                  {activeOrder.unloading_point_name}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => {
                  console.log('🔘 Update Status button clicked');
                  router.navigate(`/(tabs)/${activeOrder.id}`);
                }}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Status</Text>
              </Pressable>

              {locationTracking ? (
                <Pressable
                  style={styles.stopButton}
                  onPress={stopLocationTracking}
                >
                  <MaterialIcons name="stop" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Stop Tracking</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.trackButton}
                  onPress={startLocationTracking}
                >
                  <MaterialIcons name="my-location" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Start Tracking</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noActiveOrderCard}>
            <MaterialIcons name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.noActiveText}>No Active Order</Text>
            <Text style={styles.noActiveSubtext}>
              Scan a QR code to start tracking an order
            </Text>
            <WebCompatibleButton
              style={styles.scanButton}
              onPress={() => {
                console.log('🔘 Scan QR Code button clicked');
                router.navigate('/(tabs)/scanner');
              }}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </WebCompatibleButton>
          </View>
        )}

        {/* Recent Scanned Orders */}
        {scannedOrders.length > 0 && (
          <View style={styles.recentOrdersCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="history" size={24} color="#6366f1" />
              <Text style={styles.cardTitle}>Recent Orders</Text>
            </View>

            {scannedOrders.slice(0, 5).map((order) => (
              <Pressable
                key={order.id}
                style={styles.recentOrderItem}
                onPress={() => router.navigate(`/(tabs)/${order.id}`)}
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

            <Pressable
              style={styles.viewAllButton}
              onPress={() => router.navigate('/(tabs)/orders')}
            >
              <Text style={styles.viewAllText}>View All Orders</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#6366f1" />
            </Pressable>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>

          <View style={styles.quickActionGrid}>
            <WebCompatibleButton
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔘 All Orders button clicked');
                router.navigate('/(tabs)/orders');
              }}
            >
              <MaterialIcons name="list-alt" size={24} color="#3b82f6" />
              <Text style={styles.quickActionText}>All Orders</Text>
            </WebCompatibleButton>

            <WebCompatibleButton
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔘 Scanner button clicked');
                router.navigate('/(tabs)/scanner');
              }}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="#10b981" />
              <Text style={styles.quickActionText}>Scan QR</Text>
            </WebCompatibleButton>

            <WebCompatibleButton
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔘 Profile button clicked');
                router.navigate('/(tabs)/profile');
              }}
            >
              <MaterialIcons name="person" size={24} color="#8b5cf6" />
              <Text style={styles.quickActionText}>Profile</Text>
            </WebCompatibleButton>

            <WebCompatibleButton
              style={styles.quickActionButton}
              onPress={() => {
                console.log('🔘 Refresh button clicked');
                loadDriverData();
              }}
            >
              <MaterialIcons name="refresh" size={24} color="#f59e0b" />
              <Text style={styles.quickActionText}>Refresh</Text>
            </WebCompatibleButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },
  errorButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#2563eb",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  activeOrderCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noActiveOrderCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noActiveText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  noActiveSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  trackingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trackingText: {
    fontSize: 12,
    color: "#10b981",
    marginLeft: 4,
    fontWeight: "600",
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
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
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  trackButton: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  recentOrdersCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentOrderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  recentOrderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  recentOrderDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  miniStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  miniStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "600",
    marginRight: 4,
  },
  quickActionsCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
});

export default function WrappedDriverDashboard() {
  return (
    <ErrorBoundary>
      <DriverDashboard />
    </ErrorBoundary>
  );
}