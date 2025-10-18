import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getDistance } from 'geolib';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import GeocodingService from '../../services/GeocodingService';

// Task name for background location updates
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define background location task (only on native platforms)
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    const { locations } = data;
    const { latitude, longitude, accuracy, speed, heading } = locations[0].coords;
    const timestamp = new Date(locations[0].timestamp).toISOString();

    console.log('Background location:', { latitude, longitude });

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

      // Fetch order details for loading point
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('loading_point_name')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order for proximity check:', orderError);
        return;
      }

      // Calculate proximity to loading point using coordinates from database or geocoding fallback
      let loadingCoord = [];
      
      // Try to get coordinates from database first (new numeric fields)
      if (order.loading_point_latitude && order.loading_point_longitude) {
        loadingCoord = [{
          latitude: parseFloat(order.loading_point_latitude),
          longitude: parseFloat(order.loading_point_longitude)
        }];
      } else if (order.loading_point_name) {
        // Fallback to geocoding service
        loadingCoord = await GeocodingService.geocodeAsync(order.loading_point_name);
      }
      
      if (loadingCoord.length > 0) {
        const distance = getDistance(
          { latitude, longitude },
          { latitude: loadingCoord[0].latitude, longitude: loadingCoord[0].longitude }
        );
        if (distance < 100) {
          console.log('Driver is within 100m of loading point!');
          // Trigger notification
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

      // Update Supabase with driver's location
      const locationData = {
        driver_id: user.id,
        order_id: orderId,
        latitude,
        longitude,
        location: { lat: latitude, lng: longitude },
        accuracy: accuracy || null,
        accuracy_meters: accuracy || null,
        speed: speed || null,
        speed_kmh: speed ? speed * 3.6 : null,
        heading: heading || null,
        timestamp,
        created_at: new Date().toISOString(),
        is_manual_update: false,
      };

      const { error: updateError } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (updateError) {
        console.error('Supabase update error:', updateError);
      } else {
        console.log('📍 Background location updated:', { orderId, latitude, longitude });
      }
    } catch (err) {
      console.error('Background task error:', err);
    }
  });
}

// Web-compatible storage adapter
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
      multiRemove: (keys) => {
        if (typeof window !== 'undefined') {
          keys.forEach(key => window.localStorage.removeItem(key));
        }
        return Promise.resolve();
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

  // Start background location tracking
  async startTracking(orderId) {
    try {
      await this.ensureInitialized();

      // Web platform doesn't support background location tracking
      if (Platform.OS === 'web') {
        console.warn('⚠️ Background location tracking is not supported on web platform');
        // Still set the order ID for foreground tracking
        this.currentOrderId = orderId;
        await storage.setItem('activeOrderId', orderId);
        // Get initial location
        await this.updateLocation(orderId);
        return true;
      }

      if (this.isTracking && this.currentOrderId === orderId) {
        console.log('Already tracking this order');
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
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 1000, // Update every 1 second
        deferredUpdatesInterval: 1000, // Batch updates
        foregroundService: {
          notificationTitle: 'Order Tracker',
          notificationBody: 'Tracking your location for delivery.',
          notificationColor: '#2563eb',
        },
      });

      // Get initial location
      await this.updateLocation(orderId);

      console.log('✅ Started background tracking for order:', orderId);
      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.isTracking = false;
      this.currentOrderId = null;
      await storage.removeItem('trackingOrderId');
      await storage.removeItem('activeOrderId');
      throw error;
    }
  }

  // Stop background location tracking
  async stopTracking() {
    try {
      console.log('🛑 stopTracking() called - clearing tracking state...');

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        console.log('✅ Cleared tracking interval');
      }

      // Only stop background location on native platforms
      if (Platform.OS !== 'web') {
        if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log('✅ Stopped background location updates');
        }
      }

      this.isTracking = false;
      this.currentOrderId = null;
      console.log('✅ Reset in-memory state: isTracking=false, currentOrderId=null');

      // Clear both tracking state AND active order
      await storage.multiRemove(['trackingOrderId', 'activeOrderId']);
      console.log('✅ Removed trackingOrderId and activeOrderId from storage');

      console.log('✅ Stopped tracking and cleared active order - COMPLETE');
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.lastLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
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

  // Set current location as starting point for new orders
  async setCurrentLocationAsStartingPoint() {
    try {
      const location = await this.getCurrentLocation();
      this.startingPoint = location;

      // Store in storage for persistence
      await storage.setItem('orderStartingPoint', JSON.stringify(location));

      console.log('✅ Starting point set:', location);
      return location;
    } catch (error) {
      console.error('Error setting starting point:', error);
      throw error;
    }
  }

  // Get the stored starting point
  async getStartingPoint() {
    try {
      if (this.startingPoint) {
        return this.startingPoint;
      }

      const stored = await storage.getItem('orderStartingPoint');
      if (stored) {
        this.startingPoint = JSON.parse(stored);
        return this.startingPoint;
      }

      return null;
    } catch (error) {
      console.error('Error getting starting point:', error);
      return null;
    }
  }

  // Clear the starting point
  async clearStartingPoint() {
    try {
      this.startingPoint = null;
      await storage.removeItem('orderStartingPoint');
      console.log('✅ Starting point cleared');
    } catch (error) {
      console.error('Error clearing starting point:', error);
      throw error;
    }
  }

  // Check if tracking is currently active
  async isTrackingActive() {
    try {
      // First check in-memory state
      if (this.isTracking && this.currentOrderId) {
        return true;
      }

      // Then check storage for persistence across app restarts
      const storedOrderId = await storage.getItem('trackingOrderId');

      if (storedOrderId) {
        // Update in-memory state if found in storage
        this.currentOrderId = storedOrderId;
        this.isTracking = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking tracking status:', error);
      return false;
    }
  }

  // Process location data with validation
  processLocationData(location, orderId, isManualUpdate = false) {
    // Helper function to safely parse numbers
    const parseNumberField = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    // Extract coordinates with fallbacks
    let latitude = null;
    let longitude = null;

    if (location?.latitude !== undefined && location?.longitude !== undefined) {
      latitude = parseNumberField(location.latitude);
      longitude = parseNumberField(location.longitude);
    } else if (location?.lat !== undefined && location?.lng !== undefined) {
      latitude = parseNumberField(location.lat);
      longitude = parseNumberField(location.lng);
    } else if (location?.coords?.latitude !== undefined && location?.coords?.longitude !== undefined) {
      latitude = parseNumberField(location.coords.latitude);
      longitude = parseNumberField(location.coords.longitude);
    }

    // Validate coordinates
    if (latitude === null || longitude === null) {
      throw new Error('Invalid or missing coordinates');
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}`);
    }

    // Prepare the insert data
    return {
      latitude,
      longitude,
      location: { lat: latitude, lng: longitude },
      accuracy: parseNumberField(location.accuracy),
      accuracy_meters: parseNumberField(location.accuracy || location.accuracy_meters),
      speed: parseNumberField(location.speed),
      speed_kmh: parseNumberField(location.speed ? (location.speed * 3.6) : location.speed_kmh),
      heading: parseNumberField(location.heading),
      timestamp: location.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_manual_update: Boolean(isManualUpdate),
      notes: location.notes || null,
    };
  }

  // Update location in database
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

      // Use the provided orderId or get current active order
      if (!orderId) {
        orderId = await this.getCurrentOrderId();
      }

      // Validate that order exists before inserting location
      if (orderId) {
        const { data: orderExists, error: orderCheckError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .single();

        if (orderCheckError || !orderExists) {
          console.warn('⚠️ Order not found, setting order_id to null:', orderId);
          orderId = null;
        }
      }

      console.log('📍 Processing location update:', {
        orderId,
        rawLocation: location,
        tracking: this.isTracking,
      });

      // Process location data
      const processedData = this.processLocationData(location, orderId, !this.isTracking);

      const locationData = {
        driver_id: user.id,
        order_id: orderId,
        ...processedData,
      };

      // Insert location record
      const { error } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (error) {
        console.error('Error saving location:', error);
      } else {
        console.log('📍 Location updated:', {
          orderId,
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          tracking: this.isTracking,
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Initialize the service
  async initialize() {
    if (this.initialized) return;

    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
      }

      // Check for actively tracking order
      const trackingOrderId = await storage.getItem('trackingOrderId');

      // Check for active order (from QR scanning)
      const activeOrderId = await storage.getItem('activeOrderId');

      // Use tracking order if available, otherwise use active order
      this.currentOrderId = trackingOrderId || activeOrderId;

      if (this.currentOrderId) {
        console.log('📍 LocationService initialized with order:', this.currentOrderId);

        // Restore tracking state
        if (trackingOrderId) {
          this.isTracking = true;
          console.log('🔄 Restoring tracking state for order:', trackingOrderId);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing LocationService:', error);
      this.initialized = true; // Don't block the service
    }
  }

  // Ensure service is initialized
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Get current active order ID
  async getCurrentOrderId() {
    await this.ensureInitialized();

    if (this.currentOrderId) {
      return this.currentOrderId;
    }

    try {
      const trackingOrderId = await storage.getItem('trackingOrderId');
      if (trackingOrderId) {
        this.currentOrderId = trackingOrderId;
        return trackingOrderId;
      }

      const activeOrderId = await storage.getItem('activeOrderId');
      if (activeOrderId) {
        this.currentOrderId = activeOrderId;
        return activeOrderId;
      }
    } catch (error) {
      console.error('Error getting current order ID:', error);
    }

    return null;
  }

  // Check if currently tracking
  isCurrentlyTracking() {
    return this.isTracking;
  }

  // Resume tracking after app restart
  async resumeTracking() {
    try {
      await this.ensureInitialized();
      const orderId = await this.getCurrentOrderId();
      if (orderId) {
        console.log('Resuming tracking for order:', orderId);
        await this.startTracking(orderId);
      }
    } catch (error) {
      console.error('Error resuming tracking:', error);
    }
  }

  // Update order with starting point location
  async updateOrderStartingPoint(orderId) {
    try {
      const startingPoint = await this.getStartingPoint();
      if (!startingPoint) {
        throw new Error('No starting point set');
      }

      const { error } = await supabase
        .from('orders')
        .update({
          loading_point_location: `SRID=4326;POINT(${startingPoint.longitude} ${startingPoint.latitude})`,
          actual_start_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      console.log('✅ Order updated with starting point');
      return true;
    } catch (error) {
      console.error('Error updating order starting point:', error);
      throw error;
    }
  }

  // Calculate distance from starting point to current location
  async getDistanceFromStart() {
    try {
      const startingPoint = await this.getStartingPoint();
      const currentLocation = await this.getCurrentLocation();

      if (!startingPoint || !currentLocation) {
        return null;
      }

      return getDistance(startingPoint, currentLocation);
    } catch (error) {
      console.error('Error calculating distance from start:', error);
      return null;
    }
  }

  // Send immediate location update
  async sendImmediateLocationUpdate() {
    try {
      await this.ensureInitialized();

      const location = await this.getCurrentLocation();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const orderId = await this.getCurrentOrderId();

      let validatedOrderId = orderId;
      if (orderId) {
        const { data: orderExists, error: orderCheckError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .single();

        if (orderCheckError || !orderExists) {
          console.warn('⚠️ Order not found for immediate update, setting order_id to null:', orderId);
          validatedOrderId = null;
        }
      }

      console.log('📍 Sending immediate location update:', {
        orderId: validatedOrderId,
        rawLocation: location,
      });

      const processedData = this.processLocationData(location, validatedOrderId, true);

      const locationData = {
        driver_id: user.id,
        order_id: validatedOrderId,
        ...processedData,
      };

      const { error } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (error) throw error;

      console.log('📍 Manual location update sent:', {
        orderId: validatedOrderId,
        lat: locationData.latitude,
        lng: locationData.longitude,
        processedSuccessfully: true,
      });
      return { latitude: locationData.latitude, longitude: locationData.longitude };
    } catch (error) {
      console.error('Error sending immediate location update:', error);
      throw error;
    }
  }

  // Cleanup for logout
  async cleanup() {
    try {
      await this.stopTracking();

      await storage.multiRemove([
        'trackingOrderId',
        'orderStartingPoint',
        'lastKnownLocation',
        'activeOrderId',
      ]);

      this.currentOrderId = null;
      this.isTracking = false;
      this.trackingInterval = null;
      this.lastLocation = null;
      this.startingPoint = null;

      console.log('✅ LocationService cleaned up for logout');
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