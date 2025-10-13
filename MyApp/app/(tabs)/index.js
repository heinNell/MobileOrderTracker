import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
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

const locationService = new LocationService();

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
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
          <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>Something went wrong</Text>
          <TouchableOpacity 
            style={{backgroundColor: '#007AFF', padding: 12, borderRadius: 8}}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{color: 'white', fontWeight: 'bold'}}>Try Again</Text>
          </TouchableOpacity>
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
  const { user, signOut } = useAuth();
  const router = useRouter();

  const loadDriverData = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      // Check for active order from AsyncStorage first (from QR scan)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const activeOrderId = await AsyncStorage.getItem('activeOrderId');

      if (activeOrderId) {
        // Get the specific active order
        const { data: activeOrderData, error: activeError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", activeOrderId)
          .eq("assigned_driver_id", user.id)
          .single();

        if (activeError) {
          if (activeError.code === 'PGRST116') {
            // Order not found - clear invalid active order
            await AsyncStorage.removeItem('activeOrderId');
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
        const trackingStatus = locationService.isCurrentlyTracking();
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
      completed: "#10b981"
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
      'Sign Out',
      'Are you sure you want to sign out? This will stop location tracking and clear your active order.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop location tracking
              if (locationTracking) {
                await locationService.stopTracking();
              }
              
              // Clear active order
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.removeItem('activeOrderId');
              
              // Sign out
              await signOut();
              
              // Navigate to login
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout properly');
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
                Welcome back, {user?.email?.split('@')[0]}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeOrder.status) }]}>
                <Text style={styles.statusText}>{activeOrder.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.routeInfo}>
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={18} color="#10b981" />
                <Text style={styles.locationText}>{activeOrder.loading_point_name}</Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#9ca3af" />
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={18} color="#ef4444" />
                <Text style={styles.locationText}>{activeOrder.unloading_point_name}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.push(`/QRScannerScreen?orderId=${activeOrder.id}`)}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update Status</Text>
              </TouchableOpacity>
              
              {locationTracking ? (
                <TouchableOpacity style={styles.stopButton} onPress={stopLocationTracking}>
                  <MaterialIcons name="stop" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Stop Tracking</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.trackButton} onPress={startLocationTracking}>
                  <MaterialIcons name="my-location" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Start Tracking</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noActiveOrderCard}>
            <MaterialIcons name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.noActiveText}>No Active Order</Text>
            <Text style={styles.noActiveSubtext}>Scan a QR code to start tracking an order</Text>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => router.push('/scanner')}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Scanned Orders */}
        {scannedOrders.length > 0 && (
          <View style={styles.recentOrdersCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="history" size={24} color="#6366f1" />
              <Text style={styles.cardTitle}>Recent Orders</Text>
            </View>
            
            {scannedOrders.slice(0, 5).map((order, index) => (
              <TouchableOpacity 
                key={order.id}
                style={styles.recentOrderItem}
                onPress={() => router.push(`/QRScannerScreen?orderId=${order.id}`)}
              >
                <View>
                  <Text style={styles.recentOrderNumber}>#{order.order_number}</Text>
                  <Text style={styles.recentOrderDate}>
                    Scanned: {new Date(order.updated_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.miniStatusText}>{order.status.replace('_', ' ')}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/orders')}
            >
              <Text style={styles.viewAllText}>View All Orders</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionGrid}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/orders')}
            >
              <MaterialIcons name="list-alt" size={24} color="#3b82f6" />
              <Text style={styles.quickActionText}>All Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/scanner')}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="#10b981" />
              <Text style={styles.quickActionText}>Scan QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <MaterialIcons name="person" size={24} color="#8b5cf6" />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={loadDriverData}
            >
              <MaterialIcons name="refresh" size={24} color="#f59e0b" />
              <Text style={styles.quickActionText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  
  // Active Order Card
  activeOrderCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "space-between",
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
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trackingText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
    marginLeft: 4,
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  routeInfo: {
    marginBottom: 16,
    alignItems: "center",
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
    gap: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // No Active Order Card
  noActiveOrderCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noActiveText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
  },
  noActiveSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  // Recent Orders Card
  recentOrdersCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recentOrderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  recentOrderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  recentOrderDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
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
  
  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickActionButton: {
    width: "48%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  customer: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
});

export default function WrappedDriverDashboard() {
  return (
    <ErrorBoundary>
      <DriverDashboard />
    </ErrorBoundary>
  );
}
