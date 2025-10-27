import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    View,
  } from "react-native";

import StatusUpdateButtons from "../components/order/StatusUpdateButtons";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LocationService from "../services/LocationService";
import statusUpdateServiceInstance from "../services/StatusUpdateService";

const DriverDashboard = () => {
  // Initialize LocationService inside the component to prevent memory leaks
  const locationServiceRef = useRef(null);
  
  // Complete color palette - wrapped in useMemo to prevent recreation
  const colors = useMemo(() => ({
    // Primary brand colors
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#1D4ED8',
    
    // Semantic colors
    success: '#059669',
    successLight: '#10B981',
    successBackground: '#ECFDF5',
    successDark: '#047857',
    
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
    
    // Neutral grays
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
    
    // Additional colors
    greenLight: '#D1FAE5',
    redLight: '#FEE2E2',
    redBorder: '#FECACA',
  }), []);

  const styles = StyleSheet.create({
    // Main container
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
    
    // Header design
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
    
    // Typography
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
    
    // Header actions
    headerActions: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 12 
    },
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
    
    // Order cards
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
    
    // Card headers
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
    
    // Tracking indicator
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
      fontWeight: '700' 
    },
    
    // Order info
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
    
    // Route information
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
    
    // Action buttons
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
    buttonText: { 
      color: colors.white, 
      fontSize: 15, 
      fontWeight: "700", 
      marginLeft: 8,
      letterSpacing: 0.2
    },
    
    // Tracking control section
    trackingControlSection: {
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.gray50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
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
    
    // ✅ MISSING STYLES ADDED
    trackingInactiveContainer: {
      alignItems: 'stretch',
    },
    trackingPromptCard: {
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.infoBackground,
      borderRadius: 12,
      marginTop: 8,
    },
    trackingPromptTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.info,
      marginTop: 8,
      textAlign: 'center',
    },
    trackingPromptText: {
      fontSize: 14,
      color: colors.gray600,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
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
    
    // Recent orders card
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
    
    // Quick actions card
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
    
    // Assigned orders card
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
  });

  // State management
  const [activeOrder, setActiveOrder] = useState(null);
  const [scannedOrders, setScannedOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [navigationInProgress, setNavigationInProgress] = useState(false); // ✅ PREVENT DOUBLE NAVIGATION
  
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();


  // Initialize LocationService inside component
  useEffect(() => {
    if (!locationServiceRef.current) {
      locationServiceRef.current = new LocationService();
    }
  }, []);

  // Status color helper function
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'assigned': return colors.info;
      case 'in_transit': return colors.primary;
      case 'arrived': return colors.purple;
      case 'loading': return colors.warning;
      case 'loaded': return colors.success;
      case 'unloading': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.gray500;
    }
  }, [colors]);

  // ✅ SINGLE NAVIGATION HANDLER - PREVENTS DOUBLE NAVIGATION
  const handleOrderNavigation = useCallback((orderId) => {
    if (navigationInProgress) {
      console.log('🚫 Navigation already in progress, ignoring duplicate request');
      return;
    }
    
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      console.error('❌ Invalid order ID for navigation:', orderId);
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.error('❌ Invalid UUID format for navigation:', orderId);
      return;
    }
    
    setNavigationInProgress(true);
    console.log('🔄 Navigating to order details:', orderId);
    
    // Navigate to order details using dynamic route - Expo Router syntax
    router.push(`/(tabs)/${orderId}`);
    
    // Reset navigation flag after a short delay
    setTimeout(() => {
      setNavigationInProgress(false);
    }, 1000);
  }, [navigationInProgress, router]);

  // Activate order with tracking
  const activateOrderWithTracking = useCallback(async (order) => {
    if (navigationInProgress) return; // Prevent during navigation
    
    try {
      if (!order || !order.id) {
        throw new Error("Invalid order: missing ID");
      }
      
      const orderId = String(order.id);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        throw new Error(`Invalid order ID format: ${orderId}`);
      }
      
      if (!user || !user.id) {
        throw new Error("User not authenticated");
      }
      
      console.log("🚀 Activating order:", {
        orderNumber: order.order_number,
        orderId: orderId,
        currentStatus: order.status,
        userId: user.id
      });
      
      // Check if order exists
      const { data: testData, error: testError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .limit(1);
      
      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      if (!testData || testData.length === 0) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      let updatedOrder = null;

      if (['in_transit', 'arrived', 'loading', 'loaded', 'unloading'].includes(order.status) || order.actual_start_time) {
        // Order already started, update to loading status
        const { data: loadingOrder, error: updateError } = await supabase
          .from("orders")
          .update({
            status: "loading",
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        await supabase.from("status_updates").insert({
          order_id: orderId,
          driver_id: user.id,
          status: "loading",
          notes: "Started loading from dashboard",
          created_at: new Date().toISOString()
        });

        updatedOrder = loadingOrder;
      } else {
        // Order needs load activation
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

        const activationData = {
          order_id: orderId,
          notes: 'Load activated automatically by driver from dashboard'
        };

        if (currentLocation) {
          activationData.location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          };
        }

        activationData.device_info = {
          platform: Platform.OS,
          app_version: '1.0.0'
        };

        try {
          // Try Edge Function first
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Edge function timeout')), 8000)
          );
          
          const edgeCallPromise = supabase.functions.invoke('activate-load', {
            body: activationData
          });

          const { data: activationResponse, error: activationError } = await Promise.race([
            edgeCallPromise,
            timeoutPromise
          ]);

          if (activationError) {
            throw activationError;
          }

          if (!activationResponse || !activationResponse.success) {
            throw new Error(activationResponse?.message || 'Edge function returned unsuccessful');
          }

          updatedOrder = activationResponse.data?.order;
        } catch (edgeError) {
          console.warn("⚠️ Edge function failed, using fallback method:", edgeError.message);
          
          // Fallback: Direct database update
          const now = new Date().toISOString();
          const updateData = {
            status: 'in_transit',
            actual_start_time: now,
            updated_at: now
          };

          const { data: fallbackOrder, error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .eq('assigned_driver_id', user.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          updatedOrder = fallbackOrder;

          // Create status update record
          try {
            const statusInsert = {
              order_id: orderId,
              driver_id: user.id,
              status: 'in_transit',
              notes: 'Load activated from dashboard (fallback method)',
              created_at: now
            };

            if (currentLocation) {
              const locationPoint = `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`;
              statusInsert.location = locationPoint;
            }

            await supabase.from('status_updates').insert(statusInsert);
          } catch (logError) {
            console.warn("⚠️ Failed to create status update:", logError);
          }

          // Create location updates
          if (currentLocation) {
            try {
              const locationPoint = `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`;
              
              await supabase.from('location_updates').insert({
                order_id: orderId,
                driver_id: user.id,
                location: locationPoint,
                accuracy_meters: currentLocation.coords.accuracy,
                speed_kmh: currentLocation.coords.speed ? currentLocation.coords.speed * 3.6 : null,
                timestamp: now,
                created_at: now
              });

              await supabase.from('driver_locations').insert({
                order_id: orderId,
                driver_id: user.id,
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy,
                speed: currentLocation.coords.speed ? currentLocation.coords.speed * 3.6 : null,
                heading: currentLocation.coords.heading,
                timestamp: now,
                created_at: now
              });
            } catch (locError) {
              console.warn("⚠️ Failed to create location update:", locError);
            }
          }
        }
      }
      
      setActiveOrder(updatedOrder);
      await AsyncStorage.setItem("activeOrderId", orderId);
      
      // Initialize and start location tracking
      await locationServiceRef.current.initialize();
      await locationServiceRef.current.setCurrentOrder(orderId);
      await locationServiceRef.current.startTracking(orderId);
      setLocationTracking(true);
      
      console.log("🎉 Order activated with tracking:", order.order_number);
      
      Alert.alert(
        "Order Activated",
        `Order #${order.order_number} has been activated successfully.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error activating order:", error);
      Alert.alert(
        "Activation Error",
        `Failed to activate order: ${error.message || error.toString()}. Please try again.`,
        [{ text: "OK" }]
      );
    }
  }, [user, navigationInProgress]);

  // Load driver data with stable dependencies
  const loadDriverData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id || !isAuthenticated) return;

      await locationServiceRef.current.initialize();

      let activeOrderData = null;
      const activeOrderId = await AsyncStorage.getItem("activeOrderId");
      
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
            await AsyncStorage.removeItem("activeOrderId");
          } else {
            console.error("Error fetching active order:", activeError);
          }
        } else {
          activeOrderData = data;
        }
      } else if (activeOrderId) {
        console.warn("Invalid activeOrderId found in storage:", activeOrderId);
        await AsyncStorage.removeItem("activeOrderId");
      }

      // Look for assigned orders from dashboard
      if (!activeOrderData) {
        const { data: assignedOrders, error: assignedError } = await supabase
          .from("orders")
          .select("*")
          .eq("assigned_driver_id", user.id)
          .in("status", ["assigned", "in_transit", "arrived", "loading", "loaded", "unloading"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (!assignedError && assignedOrders && assignedOrders.length > 0) {
          activeOrderData = assignedOrders[0];
          await AsyncStorage.setItem("activeOrderId", String(activeOrderData.id));
          
          try {
            await locationServiceRef.current.setCurrentOrder(activeOrderData.id);
            await locationServiceRef.current.startTracking(activeOrderData.id);
          } catch (trackError) {
            console.warn("⚠️ Could not auto-start tracking:", trackError);
          }
        }
      }

      // Load all assigned orders
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

      // Fetch recent orders
      const { data: scannedData, error: scannedError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", user.id)
        .not("status", "in", '("pending","completed","cancelled")')
        .order("updated_at", { ascending: false })
        .limit(5);

      if (scannedError) {
        console.error("Error fetching scanned orders:", scannedError);
        setScannedOrders([]);
      } else {
        setScannedOrders(scannedData || []);
      }

      // Check tracking status
      try {
        if (activeOrderData) {
          await locationServiceRef.current.initialize();
          const trackingStatus = await locationServiceRef.current.isCurrentlyTracking();
          
          if (!trackingStatus) {
            try {
              await locationServiceRef.current.setCurrentOrder(activeOrderData.id);
              await locationServiceRef.current.startTracking(activeOrderData.id);
              setLocationTracking(true);
            } catch (startError) {
              console.error("Failed to start tracking:", startError);
              setLocationTracking(false);
            }
          } else {
            setLocationTracking(trackingStatus);
          }
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
  }, [user?.id, isAuthenticated]); // Stable dependencies

  // Effects
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      statusUpdateServiceInstance.initialize(user);
      loadDriverData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated, loadDriverData]);

  // Auto-refresh with reduced frequency
  useEffect(() => {
    if (!user?.id || !isAuthenticated || !autoRefresh) return;
    
    const interval = setInterval(() => {
      loadDriverData();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [user?.id, isAuthenticated, autoRefresh, loadDriverData]);

  // Location tracking effect - simplified without map display
  useEffect(() => {
    if (!locationTracking || !activeOrder) return;

    // Location tracking is handled by LocationService
    // No need for separate location subscription here
    return () => {
      // Cleanup handled by LocationService
    };
  }, [locationTracking, activeOrder]);

  // Handlers
  const onRefresh = () => {
    setRefreshing(true);
    loadDriverData();
  };

  const stopLocationTracking = async () => {
    try {
      await locationServiceRef.current.stopTracking();
      setLocationTracking(false);
      if (Platform.OS === 'web') {
        alert("Stopped tracking your location.");
      } else {
        Alert.alert("Location Tracking", "Stopped tracking your location.");
      }
    } catch {
      if (Platform.OS === 'web') {
        alert("Failed to stop location tracking.");
      } else {
        Alert.alert("Error", "Failed to stop location tracking.");
      }
    }
  };

  const openMaps = useCallback((destinationName) => {
    try {
      if (!destinationName) {
        Alert.alert("Error", "Missing location information");
        return;
      }
      
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
    const performLogout = async () => {
      try {
        if (locationTracking) {
          try {
            await locationServiceRef.current.stopTracking();
            setLocationTracking(false);
          } catch (locError) {
            console.warn('⚠️ Location stop error:', locError);
          }
        }
        
        try {
          await AsyncStorage.removeItem("activeOrderId");
          setActiveOrder(null);
        } catch (storageError) {
          console.warn('⚠️ Storage clear error:', storageError);
        }
        
        const result = await signOut();
        if (!result || !result.success) {
          console.error('❌ SignOut failed:', result?.error);
        }
        
        router.replace('/(auth)/login');
      } catch (error) {
        console.error("❌ Logout exception:", error);
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out? This will stop location tracking and clear your active order.')) {
        await performLogout();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out? This will stop location tracking and clear your active order.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: performLogout },
        ]
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Main render
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
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <MaterialIcons name="logout" size={20} color={colors.danger} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Active Order Section */}
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

            {/* ✅ SINGLE NAVIGATION BUTTONS */}
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleOrderNavigation(activeOrder.id)}
                disabled={navigationInProgress}
              >
                <MaterialIcons name="description" size={20} color={colors.white} />
                <Text style={styles.buttonText}>Order Details</Text>
              </Pressable>
            </View>

            {/* Tracking Control Section */}
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
                    <Text style={styles.promptBadgeText}>Checking...</Text>
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
                    <MaterialIcons name="my-location" size={24} color={colors.info} />
                    <Text style={styles.trackingPromptTitle}>
                      Location Tracking Starting...
                    </Text>
                    <Text style={styles.trackingPromptText}>
                      Your location will be tracked automatically for this order. This helps with real-time delivery updates and customer tracking.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Status Update Buttons */}
            <StatusUpdateButtons 
              order={activeOrder}
              onStatusUpdate={(updatedOrder) => {
                setActiveOrder(updatedOrder);
                loadDriverData();
              }}
              disabled={loading}
            />
          </View>
        ) : (
          /* No Active Order */
          <View style={styles.noActiveOrderCard}>
            <MaterialIcons name="inbox" size={48} color={colors.gray400} />
            <Text style={styles.noActiveText}>No Active Order</Text>
            <Text style={styles.noActiveSubtext}>
              No assigned orders available. Check back later or contact dispatch for order assignment.
            </Text>
          </View>
        )}

        {/* Available Orders */}
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

        {/* Recent Orders */}
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
                onPress={() => handleOrderNavigation(order.id)}
                disabled={navigationInProgress}
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

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>

          <View style={styles.quickActionGrid}>
            <Pressable style={styles.quickActionButton} onPress={() => router.push('orders')}>
              <MaterialIcons name="list-alt" size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>All Orders</Text>
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
};

export default DriverDashboard;