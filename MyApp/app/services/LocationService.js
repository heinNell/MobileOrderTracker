import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { calculateDistance, toPostGISPoint } from '../shared/locationUtils';

class LocationService {
  constructor() {
    this.currentOrderId = null;
    this.isTracking = false;
    this.trackingInterval = null;
    this.lastLocation = null;
    this.startingPoint = null;
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
      
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem('orderStartingPoint', JSON.stringify(location));
      
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

      const stored = await AsyncStorage.getItem('orderStartingPoint');
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
      await AsyncStorage.removeItem('orderStartingPoint');
      console.log('✅ Starting point cleared');
    } catch (error) {
      console.error('Error clearing starting point:', error);
      throw error;
    }
  }

  // Start tracking for an order
  async startTracking(orderId) {
    try {
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

      // Store tracking state
      await AsyncStorage.setItem('trackingOrderId', orderId);

      // Start location tracking interval
      this.trackingInterval = setInterval(async () => {
        try {
          await this.updateLocation();
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }, 30000); // Update every 30 seconds

      // Get initial location
      await this.updateLocation();

      console.log('✅ Started tracking for order:', orderId);
      return true;
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.isTracking = false;
      this.currentOrderId = null;
      throw error;
    }
  }

  // Stop tracking
  async stopTracking() {
    try {
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      this.isTracking = false;
      this.currentOrderId = null;

      // Clear tracking state
      await AsyncStorage.removeItem('trackingOrderId');

      console.log('✅ Stopped tracking');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }

  // Update current location to database
  async updateLocation() {
    if (!this.isTracking || !this.currentOrderId) {
      return;
    }

    try {
      const location = await this.getCurrentLocation();
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for location update');
        return;
      }

          // Insert location update with enhanced data for dashboard
      const locationData = {
        driver_id: user.id,
        order_id: this.currentOrderId,
        location: toPostGISPoint(location),
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        created_at: new Date().toISOString(),
        accuracy: location.accuracy || null,
        speed: location.speed || null,
        heading: location.heading || null,
      };

      const { error } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (error) {
        console.error('Error saving location:', error);
      } else {
        console.log('📍 Location updated:', location);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Get current tracking order ID
  async getCurrentOrderId() {
    if (this.currentOrderId) {
      return this.currentOrderId;
    }

    try {
      const stored = await AsyncStorage.getItem('trackingOrderId');
      if (stored) {
        this.currentOrderId = stored;
        return stored;
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
          loading_point_location: toPostGISPoint(startingPoint),
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

      return calculateDistance(startingPoint, currentLocation);
    } catch (error) {
      console.error('Error calculating distance from start:', error);
      return null;
    }
  }

  // Send immediate location update to dashboard (for real-time tracking)
  async sendImmediateLocationUpdate() {
    try {
      const location = await this.getCurrentLocation();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Send location even if not actively tracking an order
      const locationData = {
        driver_id: user.id,
        order_id: this.currentOrderId,
        location: toPostGISPoint(location),
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        created_at: new Date().toISOString(),
        accuracy: location.accuracy || null,
        speed: location.speed || null,
        heading: location.heading || null,
        is_manual_update: true, // Flag for dashboard to know this is a manual update
      };

      const { error } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (error) throw error;

      console.log('📍 Manual location update sent to dashboard');
      return location;
    } catch (error) {
      console.error('Error sending immediate location update:', error);
      throw error;
    }
  }

  // Enhanced cleanup method for logout
  async cleanup() {
    try {
      await this.stopTracking();
      
      // Clear all stored data
      await AsyncStorage.multiRemove([
        'trackingOrderId',
        'orderStartingPoint',
        'lastKnownLocation'
      ]);

      // Reset all instance variables
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
}

// Export the class so it can be instantiated
export default LocationService;