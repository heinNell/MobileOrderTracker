import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { calculateDistance } from '../shared/locationUtils';

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

  // Start tracking for an order
  async startTracking(orderId) {
    try {
      await this.ensureInitialized();
      
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

      // Store both tracking and active order IDs
      await storage.setItem('trackingOrderId', orderId);
      await storage.setItem('activeOrderId', orderId);

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
      console.log('🛑 stopTracking() called - clearing tracking state...');
      
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        console.log('✅ Cleared tracking interval');
      }

      this.isTracking = false;
      this.currentOrderId = null;
      console.log('✅ Reset in-memory state: isTracking=false, currentOrderId=null');

      // Clear both tracking state AND active order
      await storage.removeItem('trackingOrderId');
      console.log('✅ Removed trackingOrderId from storage');
      
      await storage.removeItem('activeOrderId');
      console.log('✅ Removed activeOrderId from storage');

      console.log('✅ Stopped tracking and cleared active order - COMPLETE');
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      throw error;
    }
  }

  // ✨ NEW METHOD: Check if tracking is currently active
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

  // Enhanced location data processing with bulletproof validation
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

    // Try to get coordinates from different possible locations
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

    // Prepare the insert data with proper types
    return {
      latitude: latitude,
      longitude: longitude,
      location: { lat: latitude, lng: longitude }, // JSONB field - restored after fixing database trigger
      accuracy: parseNumberField(location.accuracy),
      accuracy_meters: parseNumberField(location.accuracy || location.accuracy_meters),
      speed: parseNumberField(location.speed),
      speed_kmh: parseNumberField(location.speed ? (location.speed * 3.6) : location.speed_kmh),
      heading: parseNumberField(location.heading),
      timestamp: location.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_manual_update: Boolean(isManualUpdate),
      notes: location.notes || null
    };
  }

  // Update location in database (called both manually and during tracking)
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
        tracking: this.isTracking
      });

      // Process location data with enhanced validation
      const processedData = this.processLocationData(location, orderId, !this.isTracking);
      
      const locationData = {
        driver_id: user.id,
        order_id: orderId, // This will be the current active order or null
        ...processedData
      };

      // Insert location record (now allows history with no unique constraint)
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
          tracking: this.isTracking
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Initialize the service and detect active order
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check for actively tracking order first
      const trackingOrderId = await storage.getItem('trackingOrderId');
      
      // Check for active order (from QR scanning)
      const activeOrderId = await storage.getItem('activeOrderId');
      
      // Use tracking order if available, otherwise use active order
      this.currentOrderId = trackingOrderId || activeOrderId;
      
      if (this.currentOrderId) {
        console.log('📍 LocationService initialized with order:', this.currentOrderId);
        
        // If we have a tracking order, restore tracking state
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

  // Ensure service is initialized before any operation
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Get current active order ID (checks both tracking and active order)
  async getCurrentOrderId() {
    await this.ensureInitialized();
    
    if (this.currentOrderId) {
      return this.currentOrderId;
    }

    try {
      // Check for actively tracking order first
      const trackingOrderId = await storage.getItem('trackingOrderId');
      if (trackingOrderId) {
        this.currentOrderId = trackingOrderId;
        return trackingOrderId;
      }
      
      // Check for active order (from QR scanning)
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

      return calculateDistance(startingPoint, currentLocation);
    } catch (error) {
      console.error('Error calculating distance from start:', error);
      return null;
    }
  }

  // Send immediate location update to dashboard (for real-time tracking)
  async sendImmediateLocationUpdate() {
    try {
      await this.ensureInitialized();
      
      const location = await this.getCurrentLocation();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current order ID
      const orderId = await this.getCurrentOrderId();

      // Validate that order exists before inserting location
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

      console.log('� Sending immediate location update:', {
        orderId: validatedOrderId,
        rawLocation: location
      });

      // Process location data with enhanced validation
      const processedData = this.processLocationData(location, validatedOrderId, true);
      
      const locationData = {
        driver_id: user.id,
        order_id: validatedOrderId, // Will be current active order or null
        ...processedData
      };

      // Debug: Log the exact data being sent to database
      console.log('🔍 Debug locationData being sent to DB:', JSON.stringify(locationData, null, 2));

      // Insert location record (allows history tracking)
      const { error } = await supabase
        .from('driver_locations')
        .insert(locationData);

      if (error) throw error;

      console.log('📍 Manual location update sent to dashboard:', {
        orderId: validatedOrderId,
        lat: locationData.latitude,
        lng: locationData.longitude,
        processedSuccessfully: true
      });
      return { latitude: locationData.latitude, longitude: locationData.longitude };
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
      await storage.multiRemove([
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

  // Set current order without starting tracking (for auto-activation)
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

// Export the class so it can be instantiated
export default LocationService;