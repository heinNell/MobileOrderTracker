// services/LocationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getDistance } from 'geolib';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import GeocodingService from './GeocodingService';

// Task name for background location updates
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define background location task (only on native platforms)
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }

    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;
    const timestamp = new Date(locations[0].timestamp).toISOString();

    console.log('Background location:', { latitude, longitude, timestamp });

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user for background location update');
        return;
      }

      // Get tracking order ID from storage
      const orderId = await AsyncStorage.getItem('trackingOrderId');
      if (!orderId) {
        console.warn('No active order ID in background task');
        return;
      }

      // Fetch order details for loading point proximity check
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('loading_point_name, loading_point_latitude, loading_point_longitude')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order for proximity check:', orderError);
        return;
      }

      // Calculate proximity to loading point
      let loadingCoord = [];
      if (order.loading_point_latitude && order.loading_point_longitude) {
        loadingCoord = [{
          latitude: parseFloat(order.loading_point_latitude),
          longitude: parseFloat(order.loading_point_longitude),
        }];
      } else if (order.loading_point_name) {
        loadingCoord = await GeocodingService.geocodeAsync(order.loading_point_name);
      }

      if (loadingCoord.length > 0) {
        const distance = getDistance(
          { latitude, longitude },
          { latitude: loadingCoord[0].latitude, longitude: loadingCoord[0].longitude }
        );
        if (distance < 100) {
          console.log('Driver within 100m of loading point!');
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Near Loading Point',
              body: 'You are within 100 meters of the loading point for your order!',
              sound: 'default',
            },
            trigger: null,
          });
        }
      }

      // Insert location into map_locations
      const { error: insertError } = await supabase
        .from('map_locations')
        .insert({
          order_id: orderId,
          user_id: user.id, // Include user_id
          latitude,
          longitude,
          created_at: timestamp,
        });

      if (insertError) {
        console.error('Supabase insert error (map_locations):', insertError);
      } else {
        console.log('📍 Background location inserted:', { orderId, latitude, longitude });
      }
    } catch (err) {
      console.error('Background task error:', err);
    }
  });
}

// Web-compatible storage adapter
const storage = Platform.OS === 'web'
  ? {
      getItem: async (key) => (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
      setItem: async (key, value) => {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      },
      removeItem: async (key) => {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      },
      multiRemove: async (keys) => {
        if (typeof window !== 'undefined') keys.forEach(key => window.localStorage.removeItem(key));
      },
    }
  : AsyncStorage;

class LocationService {
  constructor() {
    this.currentOrderId = null;
    this.isTracking = false;
    this.trackingInterval = null;
    this.lastLocation = null;
    this.startingPoint = null;
    this.initialized = false;
  }

  // Initialize the service
  async initialize() {
    if (this.initialized) return;

    try {
      // Request notification permissions
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permission not granted');
        }
      }

      // Check for actively tracking order
      const trackingOrderId = await storage.getItem('trackingOrderId');
      const activeOrderId = await storage.getItem('activeOrderId');
      this.currentOrderId = trackingOrderId || activeOrderId;

      if (this.currentOrderId) {
        console.log('📍 LocationService initialized with order:', this.currentOrderId);
        if (trackingOrderId) {
          this.isTracking = true;
          console.log('🔄 Restoring tracking state for order:', trackingOrderId);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing LocationService:', error);
      this.initialized = true; // Proceed to avoid blocking
    }
  }

  // Ensure service is initialized
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Start background location tracking
  async startTracking(orderId) {
    try {
      await this.ensureInitialized();

      if (Platform.OS === 'web') {
        console.warn('⚠️ Background location tracking not supported on web');
        this.currentOrderId = orderId;
        await storage.setItem('activeOrderId', orderId);
        await this.updateLocation(orderId); // Foreground update
        return true;
      }

      if (this.isTracking && this.currentOrderId === orderId) {
        console.log('Already tracking order:', orderId);
        return true;
      }

      // Stop any existing tracking
      await this.stopTracking();

      // Request background location permission
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Background location permission not granted');
      }

      this.currentOrderId = orderId;
      this.isTracking = true;

      // Store tracking and active order IDs
      await storage.setItem('trackingOrderId', orderId);
      await storage.setItem('activeOrderId', orderId);

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 1000,
        deferredUpdatesInterval: 1000,
        foregroundService: {
          notificationTitle: 'Order Tracker',
          notificationBody: 'Tracking your location for delivery.',
          notificationColor: '#2563eb',
        },
      });

      // Initial location update
      await this.updateLocation(orderId);

      console.log('✅ Started background tracking for order:', orderId);
      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.isTracking = false;
      this.currentOrderId = null;
      await storage.multiRemove(['trackingOrderId', 'activeOrderId']);
      throw error;
    }
  }

  // Stop background location tracking
  async stopTracking() {
    try {
      console.log('🛑 Stopping tracking...');

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        console.log('✅ Cleared tracking interval');
      }

      if (Platform.OS !== 'web' && await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Stopped background location updates');
      }

      this.isTracking = false;
      this.currentOrderId = null;
      await storage.multiRemove(['trackingOrderId', 'activeOrderId']);
      console.log('✅ Cleared tracking state and storage');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Foreground location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.lastLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp).toISOString(),
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
      };

      return this.lastLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Update location in order_locations
  async updateLocation(orderId = null, location = null) {
    try {
      await this.ensureInitialized();

      if (!location) {
        location = await this.getCurrentLocation();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for location update');
        return;
      }

      orderId = orderId || this.currentOrderId;

      if (orderId) {
        const { data: orderExists, error: orderCheckError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .single();

        if (orderCheckError || !orderExists) {
          console.warn('Order not found, skipping location update:', orderId);
          return;
        }
      }

      const { latitude, longitude, timestamp } = location;

      const { error } = await supabase
        .from('map_locations')
        .insert({
          order_id: orderId,
          user_id: user.id, // Include user_id
          latitude,
          longitude,
          created_at: timestamp || new Date().toISOString(),
        });

      if (error) {
        console.error('Error inserting location into map_locations:', error);
      } else {
        console.log('📍 Location updated:', { orderId, latitude, longitude });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Send immediate location update
  async sendImmediateLocationUpdate() {
    try {
      await this.ensureInitialized();
      const location = await this.getCurrentLocation();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const orderId = await this.getCurrentOrderId();
      let validatedOrderId = orderId;

      if (orderId) {
        const { data: orderExists, error: orderCheckError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .single();

        if (orderCheckError || !orderExists) {
          console.warn('Order not found for immediate update:', orderId);
          validatedOrderId = null;
        }
      }

      const { latitude, longitude, timestamp } = location;

      const { error } = await supabase
        .from('map_locations')
        .insert({
          order_id: validatedOrderId,
          user_id: user.id, // Include user_id
          latitude,
          longitude,
          created_at: timestamp,
        });

      if (error) throw error;

      console.log('📍 Immediate location update sent:', { orderId: validatedOrderId, latitude, longitude });
      return { latitude, longitude };
    } catch (error) {
      console.error('Error sending immediate location update:', error);
      throw error;
    }
  }

  // Cleanup for logout
  async cleanup() {
    try {
      await this.stopTracking();
      await storage.multiRemove(['trackingOrderId', 'activeOrderId', 'orderStartingPoint']);
      this.currentOrderId = null;
      this.isTracking = false;
      this.trackingInterval = null;
      this.lastLocation = null;
      this.startingPoint = null;
      console.log('✅ LocationService cleaned up');
    } catch (error) {
      console.error('Error cleaning up LocationService:', error);
    }
  }

  // Set current order without starting tracking
  async setCurrentOrder(orderId) {
    try {
      await this.ensureInitialized();
      this.currentOrderId = orderId;
      await storage.setItem('activeOrderId', orderId);
      console.log('📍 Set current order:', orderId);
    } catch (error) {
      console.error('Error setting current order:', error);
      throw error;
    }
  }
}

// Singleton instance
const locationServiceInstance = new LocationService();

// Export helper functions for backward compatibility
export const startBackgroundLocation = (orderId) => {
  return locationServiceInstance.startTracking(orderId);
};

export const stopBackgroundLocation = () => {
  return locationServiceInstance.stopTracking();
};

export const getCurrentLocation = () => {
  return locationServiceInstance.getCurrentLocation();
};

export const updateLocation = (orderId, location) => {
  return locationServiceInstance.updateLocation(orderId, location);
};

export const isTrackingActive = () => {
  return locationServiceInstance.isTrackingActive();
};

export default LocationService;
