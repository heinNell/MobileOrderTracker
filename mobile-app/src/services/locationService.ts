// src/services/locationService.ts
// Background location tracking service for order delivery
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const LOCATION_TASK_NAME = "background-location-task";
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY_ORDER_ID = "tracking_order_id";

// Define the background task (must be at top level)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("[LocationService] Background task error:", error);
    return;
  }

  if (!data || !data.locations || data.locations.length === 0) {
    console.warn("[LocationService] No location data in background task");
    return;
  }

  try {
    // Get tracked order ID from persistent storage (module state can be unreliable)
    const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
    if (!orderId) {
      console.warn("[LocationService] No order ID found in storage, skipping update");
      return;
    }

    // Get current user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.error("[LocationService] Auth error in background task:", authError);
      return;
    }

    const location = data.locations[0];
    const { coords, timestamp } = location;

    // Insert location update to Supabase
    const { error: insertError } = await supabase.from("location_updates").insert({
      order_id: orderId,
      driver_id: authData.user.id,
      location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`,
      accuracy_meters: coords.accuracy ?? null,
      speed_kmh: coords.speed ? coords.speed * 3.6 : null,
      heading: coords.heading ?? null,
      timestamp: new Date(timestamp).toISOString(),
    });

    if (insertError) {
      console.error("[LocationService] Error inserting location update:", insertError);
      return;
    }

    // Update user's last known location
    const { error: updateError } = await supabase
      .from("users")
      .update({
        last_location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`,
        last_location_update: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (updateError) {
      console.error("[LocationService] Error updating user location:", updateError);
    }
  } catch (err) {
    console.error("[LocationService] Unexpected error in background task:", err);
  }
});

export class LocationService {
  /**
   * Request foreground and background location permissions.
   * Returns true if both are granted.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        console.warn("[LocationService] Foreground permission denied");
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.warn("[LocationService] Background permission denied");
        return false;
      }

      return true;
    } catch (error) {
      console.error("[LocationService] Error requesting permissions:", error);
      return false;
    }
  }

  /**
   * Start tracking location for a specific order.
   * Persists order ID to AsyncStorage for background task access.
   */
  static async startTracking(orderId: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error("[LocationService] Permissions not granted, cannot start tracking");
        return false;
      }

      // Check if already tracking this order
      const currentOrderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
      if (currentOrderId === orderId) {
        console.log("[LocationService] Already tracking this order");
        return true;
      }

      // Stop any existing tracking first
      if (currentOrderId) {
        await this.stopTracking();
      }

      // Persist order ID for background task
      await AsyncStorage.setItem(STORAGE_KEY_ORDER_ID, orderId);

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 50, // Update every 50 meters
        foregroundService: {
          notificationTitle: "Order Tracking Active",
          notificationBody: `Tracking order for delivery`,
          notificationColor: "#3B82F6",
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      console.log(`[LocationService] Started tracking for order: ${orderId}`);
      return true;
    } catch (error) {
      console.error("[LocationService] Error starting tracking:", error);
      return false;
    }
  }

  /**
   * Stop location tracking and clear persisted order ID.
   */
  static async stopTracking(): Promise<void> {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log("[LocationService] Stopped background location updates");
      }

      await AsyncStorage.removeItem(STORAGE_KEY_ORDER_ID);
      console.log("[LocationService] Cleared tracking order ID");
    } catch (error) {
      console.error("[LocationService] Error stopping tracking:", error);
    }
  }

  /**
   * Get current location once (foreground only).
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[LocationService] Foreground permission not granted");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error("[LocationService] Error getting current location:", error);
      return null;
    }
  }

  /**
   * Manually send a location update for a specific order.
   * Useful for on-demand updates (e.g., status changes).
   */
  static async sendLocationUpdate(
    orderId: string,
    location: Location.LocationObject
  ): Promise<void> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error("User not authenticated");
      }

      const { coords, timestamp } = location;

      const { error: insertError } = await supabase.from("location_updates").insert({
        order_id: orderId,
        driver_id: authData.user.id,
        location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`,
        accuracy_meters: coords.accuracy ?? null,
        speed_kmh: coords.speed ? coords.speed * 3.6 : null,
        heading: coords.heading ?? null,
        timestamp: new Date(timestamp).toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      console.log(`[LocationService] Sent manual location update for order: ${orderId}`);
    } catch (error) {
      console.error("[LocationService] Error sending manual location update:", error);
      throw error;
    }
  }

  /**
   * Check if currently tracking an order.
   */
  static async isTracking(): Promise<boolean> {
    try {
      const orderId = await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      return !!orderId && isTaskRegistered;
    } catch (error) {
      console.error("[LocationService] Error checking tracking status:", error);
      return false;
    }
  }

  /**
   * Get the current order ID being tracked.
   */
  static async getCurrentOrderId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEY_ORDER_ID);
    } catch (error) {
      console.error("[LocationService] Error getting current order ID:", error);
      return null;
    }
  }
}