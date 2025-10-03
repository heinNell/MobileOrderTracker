// Location tracking service for background location updates
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { supabase } from "../lib/supabase";

const LOCATION_TASK_NAME = "background-location-task";
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

let currentOrderId: string | null = null;
let isTracking = false;

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Location task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location && currentOrderId) {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Send location update to Supabase
          await supabase.from("location_updates").insert({
            order_id: currentOrderId,
            driver_id: user.id,
            location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
            accuracy_meters: location.coords.accuracy,
            speed_kmh: location.coords.speed
              ? location.coords.speed * 3.6
              : null,
            heading: location.coords.heading,
            timestamp: new Date(location.timestamp).toISOString(),
          });

          // Update user's last location
          await supabase
            .from("users")
            .update({
              last_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
              last_location_update: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      } catch (error) {
        console.error("Error sending location update:", error);
      }
    }
  }
});

export const LocationService = {
  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== "granted") {
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();

    return backgroundStatus === "granted";
  },

  // Start tracking location for an order
  async startTracking(orderId: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        throw new Error("Location permissions not granted");
      }

      currentOrderId = orderId;

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 50, // Update every 50 meters
        foregroundService: {
          notificationTitle: "Order Tracking Active",
          notificationBody: "Your location is being tracked for delivery",
          notificationColor: "#3B82F6",
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      isTracking = true;
      return true;
    } catch (error) {
      console.error("Error starting location tracking:", error);
      return false;
    }
  },

  // Stop tracking location
  async stopTracking(): Promise<void> {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        LOCATION_TASK_NAME
      );

      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      currentOrderId = null;
      isTracking = false;
    } catch (error) {
      console.error("Error stopping location tracking:", error);
    }
  },

  // Get current location once
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error("Error getting current location:", error);
      return null;
    }
  },

  // Send manual location update
  async sendLocationUpdate(
    orderId: string,
    location: Location.LocationObject
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      await supabase.from("location_updates").insert({
        order_id: orderId,
        driver_id: user.id,
        location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
        accuracy_meters: location.coords.accuracy,
        speed_kmh: location.coords.speed ? location.coords.speed * 3.6 : null,
        heading: location.coords.heading,
        timestamp: new Date(location.timestamp).toISOString(),
      });
    } catch (error) {
      console.error("Error sending manual location update:", error);
      throw error;
    }
  },

  // Check if currently tracking
  isTracking(): boolean {
    return isTracking;
  },

  // Get current order ID being tracked
  getCurrentOrderId(): string | null {
    return currentOrderId;
  },
};
