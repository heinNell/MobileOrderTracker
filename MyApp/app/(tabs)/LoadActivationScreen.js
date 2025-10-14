// app/(tabs)/LoadActivationScreen.js
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

// Define colors constant to fix ESLint warnings
const colors = {
  primary: '#2563eb',
  white: '#ffffff',
  gray: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    700: '#374151',
  },
  slate: {
    900: '#111827',
  },
  green: {
    600: '#059669',
    700: '#065f46',
  },
  emerald: {
    100: '#d1fae5',
    500: '#10b981',
  },
  purple: {
    500: '#8b5cf6',
  },
  blue: {
    500: '#3b82f6',
  },
  red: {
    500: '#ef4444',
  },
};

const getStatusStyle = (status) => {
  const statusStyles = {
    pending: { backgroundColor: colors.gray[400] },
    assigned: { backgroundColor: colors.blue[500] },
    activated: { backgroundColor: colors.emerald[500] },
    in_transit: { backgroundColor: colors.purple[500] },
    delivered: { backgroundColor: colors.green[600] },
    completed: { backgroundColor: colors.emerald[500] },
  };
  return statusStyles[status] || { backgroundColor: colors.gray[500] };
};

export default function LoadActivationScreen() {
  const { orderId, orderNumber } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);

      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setOrderDetails(order);
    } catch (error) {
      console.error("Error loading order:", error);
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      if (status === "granted") {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  }, []);

  useEffect(() => {
    loadOrderDetails();
    requestLocationPermission();
  }, [loadOrderDetails, requestLocationPermission]);

  const handleActivateLoad = async () => {
    try {
      if (!location && locationPermission) {
        Alert.alert(
          "Location Required",
          "Please wait while we get your current location..."
        );
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
      }

      Alert.alert(
        "Activate Load",
        `Are you sure you want to activate load for order ${orderNumber}?\n\nThis will:\n• Mark the order as activated\n• Enable QR code scanning\n• Start tracking your location`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Activate",
            style: "default",
            onPress: async () => {
              await activateLoad();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing activation:", error);
      Alert.alert("Error", "Failed to prepare load activation");
    }
  };

  const activateLoad = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const activationData = {
        order_id: orderId,
      };

      if (location) {
        activationData.location = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            activationData.location_address = [
              addr.street,
              addr.city,
              addr.region,
              addr.country,
            ]
              .filter(Boolean)
              .join(", ");
          }
        } catch (geoError) {
          console.warn("Reverse geocoding failed:", geoError);
        }
      }

      activationData.device_info = {
        platform: Platform.OS,
        app_version: "1.0.0",
        os_version: Platform.Version,
      };

      const { data, error } = await supabase.functions.invoke("activate-load", {
        body: activationData,
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to activate load");
      }

      if (!data.success) {
        throw new Error(data.message || "Failed to activate load");
      }

      console.log("Load activated successfully:", data);

      Alert.alert(
        "Load Activated!",
        `Order ${orderNumber} has been activated successfully.\n\nYou can now scan QR codes for pickup and delivery.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
          {
            text: "Scan QR Code",
            onPress: () => {
              router.push({
                pathname: "/(tabs)/scanner",
                params: { orderId, orderNumber },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error activating load:", error);
      let message = "Failed to activate load";

      if (error.message.includes("not assigned")) {
        message = "You are not assigned to this order";
      } else if (error.message.includes("already activated")) {
        message = "This load has already been activated";
      } else if (error.message.includes("status")) {
        message = "Order is not in a valid status for activation";
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert("Activation Failed", message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !orderDetails) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="local-shipping" size={64} color={colors.primary} />
          <Text style={styles.title}>Activate Load</Text>
          <Text style={styles.subtitle}>Order {orderNumber}</Text>
        </View>

        {orderDetails && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  getStatusStyle(orderDetails.status),
                ]}
              >
                <Text style={styles.statusText}>
                  {orderDetails.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loading Point:</Text>
              <Text style={styles.infoValue}>
                {orderDetails.loading_point_name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivery Point:</Text>
              <Text style={styles.infoValue}>
                {orderDetails.unloading_point_name}
              </Text>
            </View>

            {orderDetails.estimated_distance_km && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance:</Text>
                <Text style={styles.infoValue}>
                  {orderDetails.estimated_distance_km} km
                </Text>
              </View>
            )}

            {orderDetails.load_activated_at && (
              <View style={styles.alertBox}>
                <MaterialIcons name="check-circle" size={20} color={colors.emerald[500]} />
                <Text style={styles.alertText}>
                  This load was already activated on{" "}
                  {new Date(orderDetails.load_activated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Services</Text>

          {locationPermission ? (
            <View style={styles.locationStatus}>
              <MaterialIcons name="location-on" size={24} color={colors.emerald[500]} />
              <Text style={styles.locationText}>
                Location services enabled
                {location && (
                  <>
                    {"\n"}
                    Lat: {location.coords.latitude.toFixed(6)}, Lon:{" "}
                    {location.coords.longitude.toFixed(6)}
                  </>
                )}
              </Text>
            </View>
          ) : (
            <View style={styles.locationStatus}>
              <MaterialIcons name="location-off" size={24} color={colors.red[500]} />
              <Text style={styles.locationText}>
                Location permission required
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Before You Activate</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <MaterialIcons
                name="check-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.instructionText}>
                Ensure you are at the loading point
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons
                name="check-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.instructionText}>
                Verify the vehicle is ready for loading
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons
                name="check-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.instructionText}>
                Location services must be enabled
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons
                name="check-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.instructionText}>
                After activation, you can scan QR codes
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.activateButton,
              (loading ||
                !locationPermission ||
                orderDetails?.load_activated_at) &&
                styles.disabledButton,
            ]}
            onPress={handleActivateLoad}
            disabled={
              loading || !locationPermission || orderDetails?.load_activated_at
            }
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialIcons
                  name="play-circle-filled"
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.activateButtonText}>
                  {orderDetails?.load_activated_at
                    ? "Already Activated"
                    : "Activate Load"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[100],
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.slate[900],
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[500],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.slate[900],
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray[500],
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: colors.slate[900],
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.emerald[100],
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.green[700],
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.gray[700],
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  instructionText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.gray[700],
    flex: 1,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  activateButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: colors.gray[400],
    opacity: 0.6,
  },
  activateButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.gray[700],
    fontSize: 16,
    fontWeight: "600",
  },
});
