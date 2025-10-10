// src/services/LocationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { parsePostGISPoint, toPostGISPoint } from '../shared/locationUtils';
import { Location as AppLocation, LocationUpdate, Order } from '../shared/types';

// ======================== CONSTANTS ========================
const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS_METERS = 100;
const STORAGE_KEY_ORDER_ID = 'current_tracked_order_id';
const STORAGE_KEY_GEOFENCES = 'active_geofences';
const STORAGE_KEY_LAST_UPDATE = 'last_location_update_time';
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds
const LOCATION_DISTANCE_INTERVAL = 50; // 50 meters

// ======================== TYPES ========================
interface Geofence {
  latitude: number;
  longitude: number;
}

interface ActiveGeofences {
  [orderId: string]: {
    loading?: Geofence;
    unloading?: Geofence;
  };
}

// ======================== NOTIFICATION SETUP ========================
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

// ======================== HELPER FUNCTIONS ========================

/**
 * Calculate distance between two points using Haversine formula
 */
const getDistance = (point1: AppLocation, point2: Geofence): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Trigger geofence notification
 */
const triggerGeofenceAlert = async (orderId: string, type: 'loading' | 'unloading') => {
  try {
    console.log(`[LocationService] Triggering ${type} geofence alert for order: ${orderId}`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Geofence Alert: ${type === 'loading' ? 'Loading Point' : 'Unloading Point'}`,
        body: `You are within ${GEOFENCE_RADIUS_METERS}m of the ${type} point for order #${orderId}.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 200, 500],
        data: { orderId, type },
      },
      trigger: null,
    });
    
    console.log(`[LocationService] Geofence alert sent successfully`);
  } catch (error) {
    console.error('[LocationService] Error triggering geofence notification:', error);
  }
};

/**
 * Auto-update order status to "arrived" when reaching loading point
 */
const autoArriveIfNeeded = async (orderId: string) => {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('[LocationService] Error fetching order for auto-arrive:', fetchError);
      return;
    }

    if (order?.status === 'in_transit') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'arrived',
          actual_start_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('[LocationService] Error auto-updating to arrived:', updateError);
      } else {
        console.log(`[LocationService] Auto-updated order ${orderId} to 'arrived'`);
        
        // Send notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Arrived at Loading Point',
            body: 'Order status automatically updated to "Arrived"',
            data: { orderId, autoUpdate: true },
          },
          trigger: null,
        });
      }
    }
  } catch (error) {
    console.error('[LocationService] Error in autoArriveIfNeeded:', error);
  }
};

/**
 * Auto-update order status to "completed" when reaching unloading point
 */
const autoCompleteIfNeeded = async (orderId: string) => {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('[LocationService] Error fetching order for auto-complete:', fetchError);
      return;
    }

    const completableStatuses = ['arrived', 'loading', 'loaded', 'unloading'];
    if (order?.status && completableStatuses.includes(order.status)) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          actual_end_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('[LocationService] Error auto-updating to completed:', updateError);
      } else {
        console.log(`[LocationService] Auto-updated order ${orderId} to 'completed'`);
        
        // Send notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Delivery Completed',
            body: 'Order status automatically updated to "Completed"',
            data: { orderId, autoUpdate: true },
          },
          trigger: null,
        });
      }
    }
  } catch (error) {
    console.error('[LocationService] Error in autoCompleteIfNeeded:', error);
  }
};

// ======================== BACKGROUND LOCATION TASK ========================

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[LocationService] Background location error:', error);
    return;
  }

  const { locations } = data as any;
  if (!locations || locations.length === 0) {
    console.warn('[LocationService] No location data in background task');
    return;
  }

  try {
    const location = locations[0];
    const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
    const { data: auth } = await supabase.auth.getUser();
    const driverId = auth?.user?.id;

    if (!orderId || !driverId) {
      console.warn('[LocationService] Missing order ID or driver ID, skipping update');
      return;
    }

    const newLocation: AppLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Get battery level
    let batteryLevel: number | undefined;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch (batteryError) {
      console.warn('[LocationService] Could not get battery level:', batteryError);
    }

    // Save location update to database
    const locationUpdate: LocationUpdate = {
      id: uuidv4(),
      order_id: orderId,
      driver_id: driverId,
      location: toPostGISPoint(newLocation),
      accuracy_meters: location.coords.accuracy ?? undefined,
      speed_kmh: location.coords.speed ? location.coords.speed * 3.6 : undefined,
      heading: location.coords.heading ?? undefined,
      battery_level: batteryLevel ? Math.round(batteryLevel * 100) : undefined,
      timestamp: new Date(location.timestamp).toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('location_updates')
      .insert([locationUpdate]);

    if (insertError) {
      console.error('[LocationService] Error saving background location update:', insertError);
      return;
    }

    // Update user's last known location
    await supabase
      .from('users')
      .update({
        last_location: toPostGISPoint(newLocation),
        last_location_update: new Date().toISOString(),
      })
      .eq('id', driverId);

    // Update last update time
    await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());

    console.log(`[LocationService] Successfully saved location update for order: ${orderId}`);

    // ======================== GEOFENCE CHECKING ========================
    const rawGeofences = await AsyncStorage.getItem(STORAGE_KEY_GEOFENCES);
    if (!rawGeofences) return;

    const activeGeofences: ActiveGeofences = JSON.parse(rawGeofences);
    const orderGeofences = activeGeofences[orderId];
    if (!orderGeofences) return;

    // Check loading point geofence
    if (orderGeofences.loading) {
      const distance = getDistance(newLocation, orderGeofences.loading);
      console.log(`[LocationService] Distance to loading point: ${Math.round(distance)}m`);
      
      if (distance <= GEOFENCE_RADIUS_METERS) {
        console.log(`[LocationService] Entered loading geofence`);
        await triggerGeofenceAlert(orderId, 'loading');
        await autoArriveIfNeeded(orderId);
        
        // Remove triggered geofence
        delete orderGeofences.loading;
      }
    }

    // Check unloading point geofence
    if (orderGeofences.unloading) {
      const distance = getDistance(newLocation, orderGeofences.unloading);
      console.log(`[LocationService] Distance to unloading point: ${Math.round(distance)}m`);
      
      if (distance <= GEOFENCE_RADIUS_METERS) {
        console.log(`[LocationService] Entered unloading geofence`);
        await triggerGeofenceAlert(orderId, 'unloading');
        await autoCompleteIfNeeded(orderId);
        
        // Remove triggered geofence
        delete orderGeofences.unloading;
      }
    }

    // Clean up if no geofences left
    if (!orderGeofences.loading && !orderGeofences.unloading) {
      delete activeGeofences[orderId];
      console.log(`[LocationService] All geofences cleared for order ${orderId}`);
    }

    await AsyncStorage.setItem(STORAGE_KEY_GEOFENCES, JSON.stringify(activeGeofences));
  } catch (err) {
    console.error('[LocationService] Unexpected error in background task:', err);
  }
});

// ======================== LOCATION SERVICE ========================

export const LocationService = {
  /**
   * Request all necessary location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('[LocationService] Foreground permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[LocationService] Background permission denied');
        return false;
      }

      // Request notification permissions
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        console.warn('[LocationService] Notification permission denied');
      }

      console.log('[LocationService] All permissions granted');
      return true;
    } catch (error) {
      console.error('[LocationService] Error requesting permissions:', error);
      return false;
    }
  },

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[LocationService] Foreground permission not granted');
        return null;
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      console.error('[LocationService] Error getting current location:', error);
      return null;
    }
  },

  /**
   * Get the currently tracked order ID
   */
  async getCurrentOrderId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
    } catch (error) {
      console.error('[LocationService] Error getting current order ID:', error);
      return null;
    }
  },

  /**
   * Check if currently tracking
   */
  async isTracking(): Promise<boolean> {
    try {
      const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      return !!orderId && isTaskRegistered;
    } catch (error) {
      console.error('[LocationService] Error checking tracking status:', error);
      return false;
    }
  },

  /**
   * Start tracking with geofences
   */
  async startTracking(orderId: string, order: Order): Promise<boolean> {
    try {
      console.log(`[LocationService] Starting tracking for order: ${orderId}`);

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('[LocationService] Permissions not granted');
        return false;
      }

      // Stop existing tracking if any
      const currentOrderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
      if (currentOrderId && currentOrderId !== orderId) {
        console.log('[LocationService] Stopping existing tracking');
        await this.stopTracking();
      }

      // Store order ID
      await AsyncStorage.setItem(STORAGE_KEY_ORDER_ID, orderId);

      // Set up geofences
      const activeGeofences: ActiveGeofences = {};
      
      try {
        const loadingPoint = parsePostGISPoint(order.loading_point_location);
        const unloadingPoint = parsePostGISPoint(order.unloading_point_location);
        
        activeGeofences[orderId] = {
          loading: loadingPoint,
          unloading: unloadingPoint,
        };
        
        await AsyncStorage.setItem(STORAGE_KEY_GEOFENCES, JSON.stringify(activeGeofences));
        console.log(`[LocationService] Geofences set up for order ${orderId}`);
      } catch (parseError) {
        console.error('[LocationService] Error parsing geofence points:', parseError);
        // Continue without geofences
      }

      // Stop task if already running
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: LOCATION_DISTANCE_INTERVAL,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: '📦 Order Tracking Active',
          notificationBody: `Tracking delivery for order #${order.order_number || orderId.substring(0, 8)}`,
          notificationColor: '#3B82F6',
        },
      });

      // Send initial location update
      const currentLocation = await this.getCurrentLocation();
      if (currentLocation) {
        await this.sendLocationUpdate(orderId, currentLocation);
        await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());
      }

      console.log(`[LocationService] Successfully started tracking for order: ${orderId}`);
      return true;
    } catch (error) {
      console.error('[LocationService] Error starting tracking:', error);
      return false;
    }
  },

  /**
   * Stop tracking and clean up
   */
  async stopTracking(): Promise<boolean> {
    try {
      console.log('[LocationService] Stopping location tracking');

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[LocationService] Stopped background location updates');
      }

      await AsyncStorage.removeItem(STORAGE_KEY_ORDER_ID);
      await AsyncStorage.removeItem(STORAGE_KEY_GEOFENCES);
      console.log('[LocationService] Cleared tracking data');
      return true;
    } catch (error) {
      console.error('[LocationService] Error stopping tracking:', error);
      return false;
    }
  },

  /**
   * Send manual location update
   */
  async sendLocationUpdate(
    orderId: string,
    location: Location.LocationObject
  ): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        console.error('[LocationService] User not authenticated');
        return false;
      }

      let batteryLevel: number | undefined;
      try {
        batteryLevel = await Battery.getBatteryLevelAsync();
      } catch (batteryError) {
        console.warn('[LocationService] Could not get battery level:', batteryError);
      }

      const { coords, timestamp } = location;

      const locationUpdate: LocationUpdate = {
        id: uuidv4(),
        order_id: orderId,
        driver_id: authData.user.id,
        location: toPostGISPoint({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
        accuracy_meters: coords.accuracy ?? undefined,
        speed_kmh: coords.speed ? coords.speed * 3.6 : undefined,
        heading: coords.heading ?? undefined,
        battery_level: batteryLevel ? Math.round(batteryLevel * 100) : undefined,
        timestamp: new Date(timestamp).toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('location_updates')
        .insert([locationUpdate]);

      if (insertError) {
        console.error('[LocationService] Error inserting location update:', insertError);
        return false;
      }

      await supabase
        .from('users')
        .update({
          last_location: toPostGISPoint({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
          last_location_update: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      console.log(`[LocationService] Sent manual location update for order: ${orderId}`);
      return true;
    } catch (error) {
      console.error('[LocationService] Error sending manual location update:', error);
      return false;
    }
  },

  /**
   * Send current location update for tracked order
   */
  async sendCurrentLocationUpdate(orderId?: string): Promise<boolean> {
    try {
      const targetOrderId = orderId || (await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID));

      if (!targetOrderId) {
        console.error('[LocationService] No order ID provided or found');
        return false;
      }

      const location = await this.getCurrentLocation();
      if (!location) {
        console.error('[LocationService] Could not get current location');
        return false;
      }

      const success = await this.sendLocationUpdate(targetOrderId, location);
      if (success) {
        await AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE, new Date().toISOString());
      }

      return success;
    } catch (error) {
      console.error('[LocationService] Error sending current location update:', error);
      return false;
    }
  },

  /**
   * Get tracking statistics
   */
  async getTrackingStats(): Promise<{
    isTracking: boolean;
    currentOrderId: string | null;
    taskRegistered: boolean;
    lastUpdateTime: Date | null;
    hasGeofences: boolean;
  }> {
    try {
      const isTracking = await this.isTracking();
      const currentOrderId = await this.getCurrentOrderId();
      const taskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      const lastUpdateStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_UPDATE);
      const geofencesStr = await AsyncStorage.getItem(STORAGE_KEY_GEOFENCES);

      return {
        isTracking,
        currentOrderId,
        taskRegistered,
        lastUpdateTime: lastUpdateStr ? new Date(lastUpdateStr) : null,
        hasGeofences: !!geofencesStr,
      };
    } catch (error) {
      console.error('[LocationService] Error getting tracking stats:', error);
      return {
        isTracking: false,
        currentOrderId: null,
        taskRegistered: false,
        lastUpdateTime: null,
        hasGeofences: false,
      };
    }
  },

  /**
   * Restore tracking after app restart
   */
  async restoreTracking(): Promise<boolean> {
    try {
      console.log('[LocationService] Attempting to restore tracking');

      const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
      if (!orderId) {
        console.log('[LocationService] No previous tracking session found');
        return false;
      }

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        console.log('[LocationService] Background task already running');
        return true;
      }

      // Fetch order to restart tracking
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        console.error('[LocationService] Error fetching order for restoration:', error);
        await this.stopTracking();
        return false;
      }

      return await this.startTracking(orderId, order as Order);
    } catch (error) {
      console.error('[LocationService] Error restoring tracking:', error);
      return false;
    }
  },
};
