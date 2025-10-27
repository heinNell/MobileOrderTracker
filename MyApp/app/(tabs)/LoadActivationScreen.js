// app/(tabs)/LoadActivationScreen.js
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import
  {
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
import GeocodingService from "../services/GeocodingService";

// Modern mobile-first color palette
const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',
  
  // Primary colors
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  
  // Gray scale with improved contrast
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Semantic colors
  slate: {
    900: '#0f172a',
  },
  
  // Status colors
  success: '#10b981',
  successLight: '#34d399',
  successDark: '#059669',
  danger: '#ef4444',
  dangerLight: '#f87171',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  
  // Background colors
  green: {
    600: '#059669',
    700: '#047857',
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
  
  // Border and shadow
  border: '#e2e8f0',
  shadow: '#0f172a',
};

const getStatusStyle = (status) => {
  const statusStyles = {
    pending: { backgroundColor: colors.gray[400] },
    assigned: { backgroundColor: colors.blue[500] },
    activated: { backgroundColor: colors.emerald[500] },
    in_progress: { backgroundColor: colors.blue[500] },
    in_transit: { backgroundColor: colors.purple[500] },
    arrived: { backgroundColor: colors.green[600] },
    arrived_at_loading_point: { backgroundColor: colors.green[600] },
    loading: { backgroundColor: colors.purple[500] },
    loaded: { backgroundColor: colors.emerald[500] },
    arrived_at_unloading_point: { backgroundColor: colors.green[600] },
    unloading: { backgroundColor: colors.purple[500] },
    delivered: { backgroundColor: colors.green[600] },
    completed: { backgroundColor: colors.emerald[500] },
    cancelled: { backgroundColor: colors.red[500] },
  };
  return statusStyles[status] || { backgroundColor: colors.gray[500] };
};

// Helper function to validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid && typeof uuid === 'string' && uuidRegex.test(uuid);
};

export default function LoadActivationScreen() {
  const params = useLocalSearchParams();
  const { orderId, orderNumber, autoStart } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [paramError, setParamError] = useState(null);
  const isActivatingRef = useRef(false);

  // Debug and validate parameters on component mount
  useEffect(() => {
    console.log('=== LoadActivationScreen Debug ===');
    console.log('Raw params:', params);
    console.log('orderId:', orderId, 'Type:', typeof orderId);
    console.log('orderNumber:', orderNumber, 'Type:', typeof orderNumber);
    console.log('autoStart:', autoStart, 'Type:', typeof autoStart);
    
    // Check for invalid orderId
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      const error = `Invalid orderId: "${orderId}"`;
      console.error('❌', error);
      setParamError(error);
      return;
    }
    
    // Validate UUID format
    if (!isValidUUID(orderId)) {
      const error = `Invalid UUID format: "${orderId}"`;
      console.error('❌', error);
      setParamError(error);
      return;
    }
    
    console.log('✅ Parameters validated successfully');
    setParamError(null);
  }, [params, orderId, orderNumber, autoStart]);

  // Helper: get location with timeout fallback
  const getLocationWithTimeout = useCallback(async (ms = 4000) => {
    try {
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), ms)),
      ]);
      return result;
    } catch (e) {
      console.warn('⚠️ getLocationWithTimeout failed:', e?.message || e);
      return null; // Fallback to no-location activation
    }
  }, []);

  const loadOrderDetails = useCallback(async () => {
    try {
      // CRITICAL: Validate orderId immediately before any operations
      if (!orderId) {
        console.warn('⚠️ loadOrderDetails called with no orderId');
        return;
      }
      
      if (orderId === 'undefined' || orderId === 'null') {
        console.error('❌ loadOrderDetails called with string "undefined" or "null"');
        Alert.alert('Error', 'Invalid order ID. Please select an order from the dashboard.');
        router.back();
        return;
      }
      
      if (!isValidUUID(orderId)) {
        console.error('❌ loadOrderDetails called with invalid UUID:', orderId);
        Alert.alert('Error', 'Invalid order ID format. Please try again.');
        router.back();
        return;
      }

      // Don't proceed if there's a parameter error
      if (paramError) {
        console.log('Skipping loadOrderDetails due to parameter error:', paramError);
        return;
      }

      setLoading(true);
      console.log('🔍 Loading order details for ID:', orderId);

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

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Order loaded successfully:', order?.order_number);
      setOrderDetails(order);
    } catch (error) {
      console.error("❌ Error loading order:", error);
      
      let errorMessage = "Failed to load order details";
      
      if (error.code === 'PGRST116') {
        errorMessage = "Order not found";
      } else if (error.message.includes('invalid input syntax for type uuid')) {
        errorMessage = "Invalid order ID format";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage, [
        {
          text: "Go Back",
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [orderId, paramError, router]);

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
    if (!paramError) {
      loadOrderDetails();
    }
    requestLocationPermission();
  }, [loadOrderDetails, requestLocationPermission, paramError]);

  // Auto-start activation if requested and order is not already activated
  useEffect(() => {
    const shouldAutoStart = String(autoStart || '').toLowerCase() === '1' || String(autoStart || '').toLowerCase() === 'true';
    if (!shouldAutoStart) return;
    if (!orderDetails) return;
    if (orderDetails?.load_activated_at) return;
    if (loading || isActivatingRef.current) return;
    if (paramError) return;

    // Fire and forget: attempt activation without confirmation
    (async () => {
      try {
        // Try to ensure we have a location, but don't block excessively
        if (!location && locationPermission) {
          const loc = await getLocationWithTimeout(3000);
          if (loc) setLocation(loc);
        }
        await activateLoad(true);
      } catch {
        // Any error will be surfaced via activateLoad
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, orderDetails, locationPermission, paramError]);

  const handleActivateLoad = async () => {
    try {
      if (!location && locationPermission) {
        Alert.alert(
          "Location Required",
          "Please wait while we get your current location..."
        );
        const currentLocation = await getLocationWithTimeout(4000);
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
              await activateLoad(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing activation:", error);
      Alert.alert("Error", "Failed to prepare load activation");
    }
  };

  // Fallback activation using direct database updates
  const activateLoadFallback = async (locationData = null) => {
    console.log("🔄 Using fallback activation method");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const now = new Date().toISOString();
    
    // Prepare update data
    const updateData = {
      load_activated_at: now,
      status: 'activated',
      updated_at: now
    };

    // Add location data if available
    if (locationData) {
      updateData.activation_location_lat = locationData.latitude;
      updateData.activation_location_lng = locationData.longitude;
      
      if (locationData.address) {
        updateData.activation_location_address = locationData.address;
      }
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('assigned_driver_id', session.user.id) // Ensure driver is assigned
      .select()
      .single();

    if (updateError) {
      console.error('❌ Fallback activation failed:', updateError);
      throw updateError;
    }

    console.log('✅ Fallback activation successful:', updatedOrder);

    // Create activation log entry
    try {
      const { error: logError } = await supabase
        .from('order_status_logs')
        .insert({
          order_id: orderId,
          status: 'activated',
          notes: 'Load activated from mobile app (fallback method)',
          location_lat: locationData?.latitude,
          location_lng: locationData?.longitude,
          location_address: locationData?.address,
          created_by: session.user.id,
          created_at: now
        });

      if (logError) {
        console.warn('⚠️ Failed to create activation log:', logError);
        // Don't fail the activation if logging fails
      }
    } catch (logError) {
      console.warn('⚠️ Failed to create activation log:', logError);
    }

    return updatedOrder;
  };

  const activateLoad = async (isAuto = false) => {
    try {
      if (isActivatingRef.current) return;
      
      // Validate orderId before proceeding
      if (!orderId || orderId === 'undefined' || orderId === 'null' || !isValidUUID(orderId)) {
        throw new Error(`Cannot activate load: Invalid orderId "${orderId}"`);
      }
      
      isActivatingRef.current = true;
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      console.log("🔄 Activating load for order:", orderId);

      // Prepare location data
      let locationData = null;
      if (location) {
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };

        // Try to get address via reverse geocoding
        try {
          const addresses = await GeocodingService.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            const address = [
              addr.street,
              addr.city,
              addr.region,
              addr.country,
            ].filter(Boolean).join(", ");

            if (address) {
              locationData.address = address;
            }
          }
        } catch (geoError) {
          console.warn("Reverse geocoding failed:", geoError);
        }
      }

      // Try Edge Function first, fallback to direct database update
      let activationResult = null;
      let usedFallback = false;

      try {
        // Prepare activation data for the edge function
        const activationData = {
          order_id: orderId,
          notes: 'Load activated from mobile app'
        };

        // Add location data if available
        if (locationData) {
          activationData.location = {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          };

          if (locationData.address) {
            activationData.location_address = locationData.address;
          }
        }

        // Add device info
        activationData.device_info = {
          platform: Platform.OS,
          app_version: '1.0.0'
        };

        console.log("📝 Trying Edge Function first...");

        // Call the activate-load edge function with shorter timeout
        const edgeCall = supabase.functions.invoke('activate-load', { body: activationData });
        const timeoutMs = 8000; // Reduced timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Edge function timeout')), timeoutMs)
        );

        const { data: activationResponse, error: activationError } = await Promise.race([
          edgeCall, 
          timeoutPromise
        ]);

        if (activationError) {
          throw activationError;
        }

        if (!activationResponse || !activationResponse.success) {
          throw new Error(activationResponse?.message || 'Edge function returned failure');
        }

        console.log("✅ Edge Function activation successful:", activationResponse);
        activationResult = activationResponse;

      } catch (edgeError) {
        console.warn("⚠️ Edge Function failed, using fallback:", edgeError.message);
        
        // Use fallback method
        try {
          const fallbackResult = await activateLoadFallback(locationData);
          activationResult = { success: true, data: fallbackResult };
          usedFallback = true;
        } catch (fallbackError) {
          console.error("❌ Fallback activation also failed:", fallbackError);
          throw fallbackError;
        }
      }

      // Log activation result for debugging
      console.log("✅ Activation result:", activationResult?.success ? "Success" : "Failed");

      // Store as active order
      try {
        const storage = Platform.OS === 'web' 
          ? {
              setItem: (key, value) => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(key, value);
                }
                return Promise.resolve();
              },
            }
          : require('@react-native-async-storage/async-storage').default;
        
        await storage.setItem('activeOrderId', String(orderId));
        console.log("✅ Active order ID stored:", orderId);
      } catch (storageError) {
        console.warn("⚠️ Failed to store active order ID:", storageError);
      }

      // Initialize location tracking
      try {
        const LocationService = require("../../services/LocationService").default;
        const locationService = new LocationService();
        await locationService.initialize();
        await locationService.setCurrentOrder(orderId);
        await locationService.startTracking();
        
        // Send immediate location update so dashboard sees it right away
        await locationService.sendImmediateLocationUpdate();
        console.log("✅ Location tracking started and initial update sent");
      } catch (trackError) {
        console.warn("⚠️ Location tracking start failed:", trackError);
        // Don't fail activation if tracking fails
      }

      // Refresh order details to show updated status
      await loadOrderDetails();

      const successMessage = usedFallback 
        ? `Order ${orderNumber} has been activated successfully using backup method.\n\nYou can now scan QR codes for pickup and delivery.`
        : `Order ${orderNumber} has been activated successfully.\n\nYou can now scan QR codes for pickup and delivery.`;

      if (isAuto) {
        // On auto-activation, take user directly to order details
        router.push({ pathname: `/(tabs)/${orderId}`, params: { orderId, orderNumber } });
      } else {
        Alert.alert(
          "Load Activated!",
          successMessage,
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
      }
    } catch (error) {
      console.error("❌ Error activating load:", error);
      let message = "Failed to activate load";

      if (error.message) {
        message = error.message;
      }

      if (error.code === 'PGRST116') {
        message = "Order not found or you don't have permission to activate it";
      } else if (error.message.includes("not assigned")) {
        message = "You are not assigned to this order";
      } else if (error.message.includes("already activated")) {
        message = "This load has already been activated";
      } else if (error.message.includes("status")) {
        message = "Order is not in a valid status for activation";
      } else if (error.message.includes("Invalid orderId")) {
        message = "Invalid order ID. Please try again.";
      }

      Alert.alert("Activation Failed", message);
    } finally {
      isActivatingRef.current = false;
      setLoading(false);
    }
  };

  // Show error screen if there's a parameter error
  if (paramError) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color={colors.red[500]} />
        <Text style={styles.errorTitle}>Invalid Parameters</Text>
        <Text style={styles.errorText}>{paramError}</Text>
        <Text style={styles.errorHint}>
          This usually happens when trying to access this screen without selecting an order first.
        </Text>
        <View style={styles.errorButtonContainer}>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.errorButton, styles.primaryErrorButton]}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <MaterialIcons name="list" size={20} color={colors.white} />
            <Text style={styles.errorButtonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
  // Container styles with modern background
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
    padding: 24,
  },
  content: {
    padding: 20,
  },
  
  // Error screen styles
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.red[500],
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  errorButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  errorButton: {
    flex: 1,
    backgroundColor: colors.gray[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryErrorButton: {
    backgroundColor: colors.primary,
  },
  errorButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Enhanced header design
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.slate[900],
    marginTop: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: colors.gray[600],
    marginTop: 6,
    fontWeight: '500',
  },
  // Enhanced text styles
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
    fontWeight: '500',
  },
  
  // Modern card design
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate[900],
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // Enhanced info row styling
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  infoLabel: {
    fontSize: 15,
    color: colors.gray[600],
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 15,
    color: colors.slate[900],
    flex: 1,
    textAlign: "right",
    fontWeight: '500',
  },
  
  // Enhanced status badge
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  
  // Modern alert box
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.emerald[100],
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.successLight,
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.green[700],
    fontWeight: '600',
    lineHeight: 20,
  },
  // Enhanced location and permission styles
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    color: colors.gray[700],
    fontWeight: '500',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  
  // Instructions styling
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  instructionText: {
    marginLeft: 16,
    fontSize: 15,
    color: colors.gray[700],
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  
  // Modern action container and buttons
  actionContainer: {
    marginTop: 16,
    marginBottom: 40,
  },
  activateButton: {
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
  disabledButton: {
    backgroundColor: colors.gray[400],
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  activateButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  
  // Enhanced cancel button
  cancelButton: {
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: colors.gray[700],
    fontSize: 16,
    fontWeight: "700",
  },
});
