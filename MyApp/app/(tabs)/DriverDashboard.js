import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
  } from "react-native";
import StatusUpdateButtons from "../../components/StatusUpdateButtons";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";
import StatusUpdateService from "../../services/StatusUpdateService";
import { useResponsive } from "../utils/responsive";

const locationService = new LocationService();

// Modern Mobile-First Color System
const colors = {
  // Primary brand colors
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  
  // Semantic colors
  success: '#059669',
  successLight: '#10B981',
  successBackground: '#ECFDF5',
  
  danger: '#DC2626',
  dangerLight: '#EF4444',
  dangerBackground: '#FEF2F2',
  
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningBackground: '#FFFBEB',
  
  info: '#2563EB',
  infoLight: '#3B82F6',
  infoBackground: '#EFF6FF',
  
  purple: '#7C3AED',
  purpleLight: '#8B5CF6',
  purpleBackground: '#F3E8FF',
  
  // Neutral grays (improved contrast)
  white: '#FFFFFF',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  // Background colors
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  
  // Border colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  
  // Shadow colors
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.16)',
};

const getStatusColor = (status) => {
  const statusColors = {
    pending: colors.gray400,
    assigned: colors.primary,
    activated: colors.success,
    in_progress: colors.info,
    in_transit: colors.purple,
    arrived: colors.successLight,
    loading: colors.warning,
    loaded: colors.success,
    unloading: colors.warningLight,
    delivered: colors.success,
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
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // Add auto-refresh toggle
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Responsive utilities for mobile-first design
  const { spacing, fontSizes, isSmallScreen, scale, touchTarget } = useResponsive();

  // Dynamic responsive styles (memoized for performance)
  const responsiveStyles = useMemo(() => ({
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    title: {
      fontSize: fontSizes['3xl'],
    },
    subtitle: {
      fontSize: fontSizes.md,
      marginTop: spacing.xs,
    },
    statsContainer: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      gap: isSmallScreen ? spacing.sm : spacing.md,
      marginTop: spacing.md,
    },
    statCard: {
      padding: spacing.md,
      marginBottom: isSmallScreen ? spacing.sm : 0,
    },
    statNumber: {
      fontSize: isSmallScreen ? fontSizes['2xl'] : fontSizes['3xl'],
    },
    statLabel: {
      fontSize: fontSizes.sm,
      marginTop: spacing.xs,
    },
    card: {
      padding: spacing.lg,
      margin: spacing.md,
      borderRadius: scale(16),
    },
    cardTitle: {
      fontSize: fontSizes.lg,
    },
    cardSubtitle: {
      fontSize: fontSizes.sm,
      marginTop: spacing.xs,
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: touchTarget(44),
      borderRadius: scale(12),
    },
    buttonText: {
      fontSize: fontSizes.md,
      marginLeft: spacing.xs,
    },
    orderItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    orderNumber: {
      fontSize: fontSizes.lg,
    },
    orderDetails: {
      fontSize: fontSizes.sm,
      marginTop: spacing.xs,
    },
  }), [spacing, fontSizes, isSmallScreen, scale, touchTarget]);

  // Define activateOrderWithTracking to properly activate orders through load activation
  const activateOrderWithTracking = useCallback(async (order) => {
    try {
      // Validate order has a valid ID
      if (!order || !order.id) {
        throw new Error("Invalid order: missing ID");
      }
      
      // Ensure order.id is a string
      const orderId = String(order.id);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        throw new Error(`Invalid order ID format: ${orderId}`);
      }
      
      // Validate user is authenticated
      if (!user || !user.id) {
        throw new Error("User not authenticated");
      }
      
      // Check Supabase connection
      const { data: testData, error: testError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .limit(1);
      
      if (testError) {
        console.error("❌ Supabase connection test failed:", {
          error: testError,
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        });
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      if (!testData || testData.length === 0) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      console.log("🚀 Activating order through load activation:", {
        orderNumber: order.order_number,
        orderId: orderId,
        currentStatus: order.status,
        userId: user.id
      });
      
      // Check if order is already activated
      if (order.status === "activated" || order.load_activated_at) {
        console.log("Order already activated, proceeding to in_progress");
        
        // Move activated order to in_progress
        const { data: updatedOrder, error: updateError } = await supabase
          .from("orders")
          .update({
            status: "in_progress",
            actual_start_time: new Date().toISOString(),
            tracking_active: true,
            trip_start_time: new Date().toISOString()
          })
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating to in_progress:", {
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          throw updateError;
        }

        // Create status update record
        await supabase.from("status_updates").insert({
          order_id: orderId,
          driver_id: user.id,
          status: "in_progress",
          notes: "Started trip from activated order",
          created_at: new Date().toISOString()
        });

        setActiveOrder(updatedOrder);
      } else {
        // Order needs load activation first
        console.log("Order needs load activation first");
        
        // Get current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        let currentLocation = null;
        
        if (status === 'granted') {
          try {
            currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
          } catch (locError) {
            console.warn("Could not get location:", locError);
          }
        }

        // Perform load activation
        const updateData = {
          load_activated_at: new Date().toISOString(),
          status: "activated",
          updated_at: new Date().toISOString(),
        };

        // Store GPS coordinates in proper latitude/longitude columns
        if (currentLocation) {
          updateData.loading_point_latitude = currentLocation.coords.latitude;
          updateData.loading_point_longitude = currentLocation.coords.longitude;
        }

        console.log("📝 Attempting load activation with data:", {
          orderId,
          updateData,
          hasLocation: !!currentLocation
        });

        const { data: updatedOrder, error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          console.error("Error in load activation:", {
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          throw updateError;
        }

        // Create status update record
        await supabase.from("status_updates").insert({
          order_id: orderId,
          driver_id: user.id,
          status: "activated",
          notes: "Load activated manually by driver",
          created_at: new Date().toISOString()
        });

        console.log("✅ Load activation successful:", {
          orderId,
          newStatus: updatedOrder.status,
          loadActivatedAt: updatedOrder.load_activated_at
        });

        setActiveOrder(updatedOrder);
      }
      
      // Set as active order
      await storage.setItem("activeOrderId", orderId);
      
      // Initialize and start location tracking
      await locationService.initialize();
      await locationService.setCurrentOrder(orderId);
      await locationService.startTracking(orderId);
      
      // Update UI state
      setLocationTracking(true);
      
      console.log("🎉 Order activated with tracking:", order.order_number);
      
      // Show success message
      Alert.alert(
        "Order Activated",
        `Order #${order.order_number} has been activated successfully.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error activating order:", {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        orderId: order?.id,
        orderNumber: order?.order_number
      });
      Alert.alert(
        "Activation Error",
        `Failed to activate order: ${error.message || error.toString()}. Please try again.`,
        [{ text: "OK" }]
      );
    }
  }, [user]);

  const loadDriverData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user || !isAuthenticated) return;

      // Initialize LocationService to ensure it knows about current order
      await locationService.initialize();

      let activeOrderData = null;
      const activeOrderId = await storage.getItem("activeOrderId");
      
      // Validate activeOrderId - check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = activeOrderId && 
                          activeOrderId !== 'undefined' && 
                          activeOrderId !== 'null' && 
                          uuidRegex.test(activeOrderId);

      if (isValidUUID) {
        const { data, error: activeError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", activeOrderId)
          .eq("assigned_driver_id", user.id)
          .single();

        if (activeError) {
          if (activeError.code === "PGRST116") {
            await storage.removeItem("activeOrderId");
            console.log("Removed invalid active order ID");
          } else {
            console.error("Error fetching active order:", activeError);
          }
        } else {
          activeOrderData = data;
        }
      } else if (activeOrderId) {
        // activeOrderId exists but is invalid - clean it up
        console.warn("Invalid activeOrderId found in storage:", activeOrderId);
        await storage.removeItem("activeOrderId");
        console.log("Cleaned up invalid activeOrderId");
      }

      // If no active order, look for newly assigned orders and auto-activate them through load activation
      if (!activeOrderData) {
        const { data: assignedOrders, error: assignedError } = await supabase
          .from("orders")
          .select("*")
          .eq("assigned_driver_id", user.id)
          .eq("status", "assigned")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!assignedError && assignedOrders && assignedOrders.length > 0) {
          // Auto-activate the most recent assigned order through PROPER load activation
          const orderToActivate = assignedOrders[0];
          console.log("Auto-activating newly assigned order:", orderToActivate.order_number);
          
          try {
            // Get current location for activation
            const { status } = await Location.requestForegroundPermissionsAsync();
            let currentLocation = null;
            
            if (status === 'granted') {
              try {
                currentLocation = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                });
              } catch (locError) {
                console.warn("Could not get location for auto-activation:", locError);
              }
            }

            // Update order status through LOAD ACTIVATION (not directly to in_progress)
            const updateData = {
              load_activated_at: new Date().toISOString(),
              status: "activated", // Proper load activation status
              updated_at: new Date().toISOString(),
            };

            // Add GPS coordinates to proper latitude/longitude columns
            if (currentLocation) {
              updateData.loading_point_latitude = currentLocation.coords.latitude;
              updateData.loading_point_longitude = currentLocation.coords.longitude;
            }

            const { data: updatedOrder, error: updateError } = await supabase
              .from("orders")
              .update(updateData)
              .eq("id", orderToActivate.id)
              .select()
              .single();

            if (updateError) {
              console.error("Error updating order status:", {
                error: updateError,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code,
                orderId: orderToActivate.id
              });
              throw updateError;
            }

            console.log("✅ Order load activated automatically:", updatedOrder);

            // Create status update record for load activation
            const { error: statusError } = await supabase
              .from("status_updates")
              .insert({
                order_id: orderToActivate.id,
                driver_id: user.id,
                status: "activated",
                notes: "Load auto-activated upon driver login",
                created_at: new Date().toISOString()
              });

            if (statusError) {
              console.warn("Status update insert failed:", statusError);
            }

            // Set as active order locally
            await storage.setItem("activeOrderId", String(orderToActivate.id));
            
            // Initialize location service and start tracking (for activated status)
            await locationService.initialize();
            await locationService.setCurrentOrder(orderToActivate.id);
            await locationService.startTracking(orderToActivate.id);
            
            // Use the updated order data
            activeOrderData = updatedOrder;
            
            console.log("🚀 Order load activated with tracking:", orderToActivate.order_number);
            
          } catch (activationError) {
            console.error("Error in auto-load-activation:", activationError);
            // Fallback to basic activation without database update
            try {
              await storage.setItem("activeOrderId", String(orderToActivate.id));
              await locationService.initialize();
              await locationService.setCurrentOrder(orderToActivate.id);
              activeOrderData = orderToActivate;
              console.log("Fallback: Order set as active without status update");
            } catch (fallbackError) {
              console.error("Fallback activation also failed:", fallbackError);
            }
          }
        }
      }

      // Load all assigned orders for display
      const { data: allAssignedOrders, error: allAssignedError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .eq("status", "assigned")
        .order("created_at", { ascending: false });

      if (!allAssignedError) {
        setAssignedOrders(allAssignedOrders || []);
      }

      setActiveOrder(activeOrderData);

      // Fetch scanned/in-progress orders (EXCLUDING completed and cancelled)
      const { data: scannedData, error: scannedError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .not("status", "in", '("pending","completed","cancelled")') // Exclude pending, completed, and cancelled
        .order("updated_at", { ascending: false })
        .limit(5);

      if (scannedError) {
        console.error("Error fetching scanned orders:", scannedError);
        setScannedOrders([]);
      } else {
        setScannedOrders(scannedData || []);
      }

      try {
        // Only check tracking status if we have an active order to avoid unnecessary location access
        if (activeOrderData) {
          const trackingStatus = await locationService.isCurrentlyTracking();
          setLocationTracking(trackingStatus);
        } else {
          setLocationTracking(false);
        }
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
  }, [user, isAuthenticated]); // Include all required dependencies

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      // Initialize StatusUpdateService with current user
      StatusUpdateService.initialize(user);
      loadDriverData();
    } else {
      setLoading(false);
    }
  }, [user, isAuthenticated, loadDriverData]);

  // Auto-refresh to catch completed orders - but much less aggressive and optional
  useEffect(() => {
    if (!user?.id || !isAuthenticated || !autoRefresh) return;
    
    // Reduced refresh to every 2 minutes instead of 5 seconds, and only if enabled
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data (2min interval)');
      loadDriverData();
    }, 120000); // 2 minutes instead of 5 seconds = 96% reduction in refreshes

    return () => clearInterval(interval);
  }, [user?.id, isAuthenticated, autoRefresh, loadDriverData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDriverData();
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

  // Navigation function to open maps with destination
  const openMaps = useCallback((destinationName) => {
    try {
      if (!destinationName) {
        Alert.alert("Error", "Missing location information");
        return;
      }
      
      // Use location name for search since we don't have coordinates here
      const query = encodeURIComponent(destinationName);
      const scheme = Platform.select({ 
        ios: 'maps:', 
        android: 'geo:',
        default: 'https:'
      });
      
      let url;
      if (Platform.OS === 'ios') {
        url = `${scheme}?q=${query}`;
      } else if (Platform.OS === 'android') {
        url = `${scheme}0,0?q=${query}`;
      } else {
        // Web fallback
        url = `https://www.google.com/maps/search/${query}`;
      }
      
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url).catch((err) => {
          console.error("Error opening maps:", err);
          Alert.alert("Error", "Unable to open maps application.");
        });
      }
    } catch (error) {
      console.error("Error in openMaps:", error);
      Alert.alert("Error", "Failed to open navigation.");
    }
  }, []);

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
        <View style={[styles.header, responsiveStyles.header]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.title, responsiveStyles.title]}>Driver Dashboard</Text>
              <Text style={[styles.subtitle, responsiveStyles.subtitle]}>
                Welcome back, {user?.email?.split("@")[0]}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable 
                style={[styles.autoRefreshToggle, autoRefresh && styles.autoRefreshToggleActive]} 
                onPress={() => setAutoRefresh(!autoRefresh)}
              >
                <MaterialIcons 
                  name={autoRefresh ? "sync" : "sync-disabled"} 
                  size={16} 
                  color={autoRefresh ? colors.success : colors.gray400} 
                />
                <Text style={[styles.autoRefreshText, autoRefresh && styles.autoRefreshTextActive]}>
                  Auto-refresh
                </Text>
              </Pressable>
              <Pressable 
                style={styles.logoutButton} 
                onPress={handleLogout}
              >
                <MaterialIcons name="logout" size={20} color={colors.danger} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
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
              <Pressable 
                style={styles.navigationRow}
                onPress={() => openMaps(activeOrder.loading_point_name)}
              >
                <MaterialIcons name="place" size={18} color={colors.success} />
                <Text style={styles.locationText}>
                  {activeOrder.loading_point_name}
                </Text>
                <MaterialIcons name="directions" size={20} color={colors.success} />
              </Pressable>
              
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={colors.gray400}
                style={styles.routeArrow}
              />
              
              <Pressable 
                style={styles.navigationRow}
                onPress={() => openMaps(activeOrder.unloading_point_name)}
              >
                <MaterialIcons name="location-on" size={18} color={colors.danger} />
                <Text style={styles.locationText}>
                  {activeOrder.unloading_point_name}
                </Text>
                <MaterialIcons name="directions" size={20} color={colors.danger} />
              </Pressable>
            </View>

            {/* Load Activation Section - Show if order needs activation */}
            {activeOrder.status === "assigned" && !activeOrder.load_activated_at && (
              <View style={styles.loadActivationSection}>
                <View style={styles.activationPromptCard}>
                  <MaterialIcons name="warning" size={24} color={colors.warning} />
                  <Text style={styles.activationPromptTitle}>Load Activation Required</Text>
                  <Text style={styles.activationPromptText}>
                    This order needs to be activated before you can start delivery operations.
                  </Text>
                </View>
                <Pressable 
                  style={styles.activateLoadButton} 
                  onPress={() => activateOrderWithTracking(activeOrder)}
                >
                  <MaterialIcons name="play-circle-filled" size={20} color={colors.white} />
                  <Text style={styles.activateLoadButtonText}>Activate Load</Text>
                </Pressable>
              </View>
            )}

            {/* Primary Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push(`/(tabs)/${activeOrder.id}`)}
              >
                <MaterialIcons name="description" size={20} color={colors.white} />
                <Text style={styles.buttonText}>Order Details</Text>
              </Pressable>

              {/* Show different button based on status */}
              {activeOrder.status === "activated" && activeOrder.load_activated_at ? (
                <Pressable
                  style={[styles.scanButton, { backgroundColor: colors.success }]}
                  onPress={() => activateOrderWithTracking(activeOrder)}
                >
                  <MaterialIcons name="play-arrow" size={20} color={colors.white} />
                  <Text style={styles.buttonText}>Start Trip</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.scanButton}
                  onPress={() => router.push(`/(tabs)/scanner?orderId=${activeOrder.id}`)}
                >
                  <MaterialIcons name="qr-code-scanner" size={20} color={colors.white} />
                  <Text style={styles.buttonText}>Scan QR</Text>
                </Pressable>
              )}
            </View>

            {/* Tracking Control - Enhanced for Auto-Assigned Orders */}
            <View style={[
              styles.trackingControlSection,
              !locationTracking && styles.trackingPromptSection
            ]}>
              <View style={styles.trackingControlHeader}>
                <MaterialIcons 
                  name={locationTracking ? "gps-fixed" : "gps-not-fixed"} 
                  size={20} 
                  color={locationTracking ? colors.success : colors.warning} 
                />
                <Text style={styles.trackingControlTitle}>Location Tracking</Text>
                {!locationTracking && (
                  <View style={styles.promptBadge}>
                    <Text style={styles.promptBadgeText}>Action Required</Text>
                  </View>
                )}
              </View>
              
              {locationTracking ? (
                <View style={styles.trackingActiveContainer}>
                  <View style={styles.trackingStatusRow}>
                    <MaterialIcons name="gps-fixed" size={16} color={colors.success} />
                    <Text style={styles.trackingStatusText}>
                      Location tracking active for this order
                    </Text>
                  </View>
                  <Pressable 
                    style={styles.stopTrackingButton} 
                    onPress={stopLocationTracking}
                  >
                    <MaterialIcons name="stop" size={20} color={colors.white} />
                    <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.trackingInactiveContainer}>
                  <View style={styles.trackingPromptCard}>
                    <MaterialIcons name="my-location" size={24} color={colors.warning} />
                    <Text style={styles.trackingPromptTitle}>
                      Start Tracking Your Journey
                    </Text>
                    <Text style={styles.trackingPromptText}>
                      Enable location tracking to monitor your route to the loading point and throughout delivery. This helps customers track their order progress.
                    </Text>
                  </View>
                  <Pressable 
                    style={styles.startTrackingButtonProminent} 
                    onPress={() => activateOrderWithTracking(activeOrder)}
                  >
                    <MaterialIcons name="my-location" size={20} color={colors.white} />
                    <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Status Update Section */}
            <StatusUpdateButtons 
              order={activeOrder}
              onStatusUpdate={(updatedOrder) => {
                setActiveOrder(updatedOrder);
                loadDriverData(); // Refresh data after status update
              }}
              disabled={loading}
            />
          </View>
        ) : (
          <View style={styles.noActiveOrderCard}>
            <MaterialIcons name="inbox" size={48} color={colors.gray400} />
            <Text style={styles.noActiveText}>No Active Order</Text>
            <Text style={styles.noActiveSubtext}>
              No assigned orders available. Check back later or scan a QR code to start tracking an order.
            </Text>
            <Pressable style={styles.scanButton} onPress={() => router.push('scanner')}>
              <MaterialIcons name="qr-code-scanner" size={20} color={colors.white} />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </Pressable>
          </View>
        )}

        {assignedOrders.length > 0 && !activeOrder && (
          <View style={styles.assignedOrdersCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="assignment" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Available Orders</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Tap any order to activate and start tracking
            </Text>

            {assignedOrders.map((order) => (
              <Pressable
                key={order.id}
                style={styles.assignedOrderItem}
                onPress={() => activateOrderWithTracking(order)}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.assignedOrderNumber}>
                    #{order.order_number}
                  </Text>
                  <Text style={styles.assignedOrderDetails}>
                    {order.customer_name} • {order.delivery_address}
                  </Text>
                  <Text style={styles.assignedOrderDate}>
                    Assigned: {new Date(order.created_at).toLocaleString()}
                  </Text>
                </View>
                <Pressable
                  style={styles.activateButton}
                  onPress={() => activateOrderWithTracking(order)}
                >
                  <MaterialIcons name="play-circle-filled" size={24} color={colors.white} />
                </Pressable>
              </Pressable>
            ))}
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

            <Pressable 
              style={[styles.quickActionButton, { backgroundColor: colors.info }]} 
              onPress={async () => {
                try {
                  // Test Supabase connection
                  const { data: testOrders, error: testError } = await supabase
                    .from("orders")
                    .select("id, order_number, status, assigned_driver_id")
                    .limit(3);
                  
                  if (testError) {
                    Alert.alert(
                      'Database Error',
                      `Connection failed: ${testError.message}`,
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  
                  // Test user authentication
                  const { data: { user: currentUser } } = await supabase.auth.getUser();
                  
                  Alert.alert(
                    'Connection Test',
                    `✅ Database: Connected\n✅ Orders found: ${testOrders?.length || 0}\n✅ User: ${currentUser?.email || 'Not authenticated'}\n✅ User ID: ${currentUser?.id || 'None'}`,
                    [{ text: 'OK' }]
                  );
                } catch (err) {
                  Alert.alert(
                    'Test Failed',
                    `Error: ${err.message}`,
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <MaterialIcons name="bug-report" size={24} color={colors.white} />
              <Text style={[styles.quickActionText, { color: colors.white }]}>Debug</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container with improved background
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  scrollView: { 
    flex: 1 
  },
  
  // Loading and centered states
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: colors.surface,
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.primary,
    fontWeight: '500'
  },
  
  // Modern header design with better spacing
  header: {
    backgroundColor: colors.surface,
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
    alignItems: "flex-start",
    gap: 16
  },
  
  // Improved typography hierarchy
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: colors.gray900,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.gray600, 
    marginTop: 4,
    fontWeight: '500'
  },
  
  // Header actions with improved styling
  headerActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12 
  },
  // Auto refresh toggle with modern styling
  autoRefreshToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  autoRefreshToggleActive: {
    backgroundColor: colors.greenLight,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.15,
  },
  autoRefreshText: {
    fontSize: 12,
    color: colors.gray600,
    marginLeft: 4,
    fontWeight: "600",
  },
  autoRefreshTextActive: {
    color: colors.successDark,
  },
  // Modern logout button styling
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.redLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.redBorder,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: { 
    color: colors.danger, 
    fontSize: 12, 
    fontWeight: "600", 
    marginLeft: 4 
  },
  // Modern order card styling with enhanced mobile UX
  activeOrderCard: {
    backgroundColor: colors.white,
    padding: 24,
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  noActiveOrderCard: {
    backgroundColor: colors.white,
    padding: 32,
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  noActiveText: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: colors.gray900, 
    marginTop: 12,
    letterSpacing: -0.3
  },
  noActiveSubtext: { 
    fontSize: 15, 
    color: colors.gray600, 
    marginTop: 8, 
    textAlign: "center",
    lineHeight: 22
  },
  // Enhanced card header styling
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100
  },
  cardHeaderLeft: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  cardTitle: { 
    fontSize: 19, 
    fontWeight: "700", 
    color: colors.gray900, 
    marginLeft: 8,
    letterSpacing: -0.3
  },
  // Modern tracking indicator
  trackingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.successLight,
  },
  trackingText: { 
    fontSize: 12, 
    color: colors.successDark, 
    marginLeft: 4, 
    fontWeight: "700" 
  },
  
  // Enhanced order info section
  orderInfo: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16,
    paddingVertical: 4
  },
  orderNumber: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: colors.gray900,
    letterSpacing: -0.2
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
    fontSize: 12, 
    fontWeight: "700",
    letterSpacing: 0.5
  },
  // Route information section with navigation
  routeInfo: { 
    marginBottom: 20,
    paddingTop: 4
  },
  navigationRow: {
    flexDirection: "row", 
    alignItems: "center", 
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.gray50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  routeArrow: {
    alignSelf: 'center', 
    marginVertical: 8
  },
  locationText: { 
    fontSize: 15, 
    color: colors.gray700, 
    marginLeft: 12, 
    flex: 1,
    lineHeight: 20,
    fontWeight: '500'
  },
  
  // Modern action buttons with enhanced mobile UX
  actionButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 16
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Tracking Control Section
  trackingControlSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  // Enhanced Tracking Control Styles
  trackingPromptSection: {
    borderColor: colors.warning,
    borderWidth: 2,
    backgroundColor: colors.warningBackground,
  },
  trackingControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackingControlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginLeft: 8,
    flex: 1,
    letterSpacing: -0.2,
  },
  promptBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  promptBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  trackingPromptCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  trackingPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  trackingPromptText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  startTrackingButtonProminent: {
    backgroundColor: colors.warning,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  trackingActiveContainer: {
    alignItems: 'stretch',
  },
  trackingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  trackingStatusText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: 8,
    fontWeight: '600',
  },
  stopTrackingButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopTrackingButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  trackingInactiveContainer: {
    alignItems: 'stretch',
  },
  startTrackingButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // Scan button with modern styling
  scanButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Enhanced button text styling
  buttonText: { 
    color: colors.white, 
    fontSize: 15, 
    fontWeight: "700", 
    marginLeft: 8,
    letterSpacing: 0.2
  },
  // Enhanced recent orders card
  recentOrdersCard: {
    backgroundColor: colors.white,
    padding: 24,
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  
  // Modern order list item styling
  recentOrderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    borderRadius: 8,
    marginVertical: 2,
  },
  recentOrderNumber: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: colors.gray900,
    letterSpacing: -0.2
  },
  recentOrderDate: { 
    fontSize: 13, 
    color: colors.gray600, 
    marginTop: 4,
    fontWeight: '500'
  },
  miniStatusBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  miniStatusText: { 
    color: colors.white, 
    fontSize: 11, 
    fontWeight: "700",
    letterSpacing: 0.3
  },
  
  // View all button enhancement
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  viewAllText: { 
    fontSize: 14, 
    color: colors.primary, 
    fontWeight: "700", 
    marginRight: 4 
  },
  // Modern quick actions card
  quickActionsCard: {
    backgroundColor: colors.white,
    padding: 24,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  // Enhanced quick action grid
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: colors.gray50,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: colors.gray700, 
    marginTop: 8,
    textAlign: 'center'
  },
  
  // Enhanced assigned orders card
  assignedOrdersCard: {
    backgroundColor: colors.white,
    padding: 24,
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  cardSubtitle: {
    fontSize: 15,
    color: colors.gray600,
    marginBottom: 20,
    fontWeight: '500',
    lineHeight: 20,
  },
  assignedOrderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.gray50,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // Enhanced assigned order text styling
  assignedOrderNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: -0.2,
  },
  assignedOrderDetails: {
    fontSize: 14,
    color: colors.gray700,
    marginTop: 4,
    fontWeight: '500',
  },
  assignedOrderDate: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Modern activate button
  activateButton: {
    backgroundColor: colors.success,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Load Activation Section Styles
  loadActivationSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.warningBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  activationPromptCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activationPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  activationPromptText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  activateLoadButton: {
    backgroundColor: colors.warning,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  activateLoadButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default DriverDashboard;
