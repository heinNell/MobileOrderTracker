import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";

const locationService = new LocationService();

export default function OrdersScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [startingPoint, setStartingPoint] = useState(null);
  const [settingLocation, setSettingLocation] = useState(false);

  useEffect(() => {
    loadOrders();
    loadStartingPoint();
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
      
      Alert.alert(
        "Starting Point Set",
        `Your current location has been set as the starting point for orders.\n\nLat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to set starting point. Please check location permissions and try again.",
        [{ text: "OK" }]
      );
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

  const [sendingLocation, setSendingLocation] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will clear your active order.',
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
              // Clear active order when logging out
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.removeItem('activeOrderId');
              
              const result = await signOut();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to sign out');
              }
            } catch (error) {
              console.error('❌ Logout error:', error);
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
      Alert.alert(
        "Location Sent", 
        "Your current location has been sent to the dashboard for tracking.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error sending location to dashboard:', error);
      Alert.alert(
        "Error", 
        "Failed to send location to dashboard. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSendingLocation(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError("Please log in to view orders");
        return;
      }

      // Check for active order from QR scan (stored in AsyncStorage)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const activeOrderId = await AsyncStorage.getItem('activeOrderId');

      if (!activeOrderId) {
        // No active order - show empty state with instruction to scan QR
        setOrders([]);
        return;
      }

      // Fetch ONLY the active scanned order
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", activeOrderId)
        .eq("assigned_driver_id", user.id) // Security: ensure order is assigned to this driver
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No order found - clear invalid active order
          await AsyncStorage.removeItem('activeOrderId');
          setOrders([]);
          setError("Active order not found. Please scan QR code again.");
        } else {
          throw error;
        }
      } else {
        setOrders([data]);
      }
    } catch (err) {
      console.error("Error loading active order:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
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
    };
    return colors[status] || "#6b7280";
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/QRScannerScreen?orderId=${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.order_number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
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
            <Text style={styles.detailText}>
              {item.estimated_distance_km} km
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Active Order</Text>
            <Text style={styles.subtitle}>
              {orders.length === 1 ? "1 active order" : "Scan QR to start"}
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
          <MaterialIcons name="qr-code-scanner" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No Active Order</Text>
          <Text style={styles.emptySubtext}>
            Scan the QR code from the dashboard to activate your assigned order
          </Text>
          <TouchableOpacity 
            style={styles.scanQRButton}
            onPress={() => router.push('/(tabs)/scanner')}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
            <Text style={styles.scanQRText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
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
                  
                  {/* Dashboard Location Button */}
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
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
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
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
  },
  scanQRButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanQRText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Starting Point Styles
  startingPointCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  startingPointHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  startingPointTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
  },
  startingPointInfo: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  locationTime: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
  },
  dashboardButtonRow: {
    marginTop: 8,
  },
  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
  },
  noLocationInfo: {
    padding: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    alignItems: "center",
  },
  noLocationText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    marginBottom: 12,
  },
  setLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
    marginLeft: 4,
  },
});
