import { supabase } from '../lib/supabase';

export class WebLocationService {
  constructor() {
    this.watchId = null;
    this.currentOrderId = null;
    this.isTracking = false;
    this.updateInterval = null;
    this.lastKnownPosition = null;
    this.consecutiveErrors = 0;
    this.maxRetries = 3;
    this.lastUpdateTime = null;
    this.minUpdateInterval = 30000; // 30 seconds minimum between updates
  }

  async checkSupport() {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported in this browser');
    }

    if (window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      throw new Error('Geolocation requires HTTPS. Current: ' + window.location.protocol);
    }

    return true;
  }

  async requestPermission() {
    try {
      await this.checkSupport();
      
      const result = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Permission request timeout'));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          () => {
            clearTimeout(timeoutId);
            resolve('granted');
          },
          (error) => {
            clearTimeout(timeoutId);
            if (error.code === error.PERMISSION_DENIED) {
              reject(new Error('Location permission denied by user'));
            } else if (error.code === error.TIMEOUT) {
              reject(new Error('Location request timed out - please ensure GPS is enabled'));
            } else {
              reject(new Error(`Location error: ${error.message}`));
            }
          },
          { 
            timeout: 8000,
            enableHighAccuracy: false,
            maximumAge: 60000
          }
        );
      });
      return result;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
    }
  }

  async startTracking(orderId, driverId) {
    if (this.isTracking) {
      console.log('⚠️ Already tracking, ignoring duplicate start request');
      return;
    }

    // Clear any existing intervals
    if (this.updateInterval) {
      console.log('🧹 Clearing existing update interval');
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    try {
      await this.checkSupport();
      this.currentOrderId = orderId;
      this.isTracking = true;
      this.consecutiveErrors = 0;
      this.lastUpdateTime = null;

      console.log('🌐 Starting web location tracking for order:', orderId);

      // Initial location update
      await this.updateLocationWithRetry(driverId);

      // Set up interval for continuous updates
      this.updateInterval = setInterval(() => {
        console.log('⏰ Scheduled location update (45s interval)');
        this.updateLocationWithRetry(driverId);
      }, 45000);

      console.log('✅ Web tracking started - next update in 45 seconds');
    } catch (error) {
      this.isTracking = false;
      console.error('❌ Failed to start tracking:', error);
      throw error;
    }
  }

  async updateLocationWithRetry(driverId, retryCount = 0) {
    // Prevent updates too close together
    const now = Date.now();
    if (this.lastUpdateTime && (now - this.lastUpdateTime) < this.minUpdateInterval) {
      const timeSinceLastUpdate = Math.round((now - this.lastUpdateTime) / 1000);
      console.log(`⏳ Skipping update, last update was ${timeSinceLastUpdate}s ago (minimum 30s required)`);
      return;
    }

    try {
      await this.updateLocation(driverId);
      this.consecutiveErrors = 0;
      this.lastUpdateTime = Date.now();
    } catch (error) {
      this.consecutiveErrors++;
      
      console.warn(`⚠️ Location update failed (attempt ${retryCount + 1}/${this.maxRetries}):`, error.message);

      if (this.lastKnownPosition && this.consecutiveErrors < 5) {
        console.log('📍 Using last known position as fallback');
        await this.saveLocationToDatabase(driverId, this.lastKnownPosition, true);
        this.lastUpdateTime = Date.now();
        return;
      }

      if (retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`🔄 Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.updateLocationWithRetry(driverId, retryCount + 1);
      }

      await this.logError(driverId, error);
    }
  }

  async updateLocation(driverId) {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            this.lastKnownPosition = position;
            await this.saveLocationToDatabase(driverId, position, false);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        async (error) => {
          console.error('🔴 Geolocation error:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });

          if (error.code === 3 && options.enableHighAccuracy) {
            console.log('⚡ Timeout with high accuracy, trying low accuracy...');
            
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  this.lastKnownPosition = position;
                  await this.saveLocationToDatabase(driverId, position, false);
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
              (lowAccError) => {
                reject(new Error(`Location timeout: ${lowAccError.message}`));
              },
              {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
              }
            );
          } else {
            reject(error);
          }
        },
        options
      );
    });
  }

  async saveLocationToDatabase(driverId, position, isFallback = false) {
    const timestamp = new Date(position.timestamp).toISOString();
    
    const locationData = {
      order_id: this.currentOrderId,
      driver_id: driverId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_meters: position.coords.accuracy || null,
      speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null,
      heading: position.coords.heading || null,
      timestamp: timestamp,
    };

    const { data, error } = await supabase
      .from('driver_locations')
      .insert(locationData)
      .select();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw new Error(`Failed to save location: ${error.message}`);
    }

    console.log('✅ Location saved:', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      accuracy: Math.round(locationData.accuracy_meters || 0) + 'm',
      isFallback
    });

    return data;
  }

  async logError(driverId, error) {
    try {
      const { data: latestLocation } = await supabase
        .from('driver_locations')
        .select('id')
        .eq('driver_id', driverId)
        .eq('order_id', this.currentOrderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const errorRecord = {
        driver_location_id: latestLocation?.id || null,
        driver_id: driverId,
        order_id: this.currentOrderId,
        error_message: error.message || 'Unknown error',
        error_details: {
          code: error.code,
          message: error.message,
          platform: 'web',
          consecutiveErrors: this.consecutiveErrors,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };

      await supabase.from('location_update_errors').insert(errorRecord);
      console.log('📝 Error logged to database');
    } catch (logErr) {
      console.error('❌ Failed to log error:', logErr.message);
    }
  }

  async stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.currentOrderId = null;
    this.lastKnownPosition = null;
    this.consecutiveErrors = 0;
    this.lastUpdateTime = null;
    
    console.log('🛑 Web tracking stopped');
  }

  isCurrentlyTracking() {
    return this.isTracking;
  }

  async forceUpdate(driverId) {
    if (!this.currentOrderId) {
      throw new Error('No active order');
    }
    console.log('🔄 Forcing manual location update...');
    this.lastUpdateTime = null; // Allow immediate update
    await this.updateLocationWithRetry(driverId);
  }

  async initialize() {
    console.log('🌐 Web LocationService initialized');
    return true;
  }
  
  async initializeFromStorage() {
    console.log('🌐 Web LocationService: Loading state from storage...');
    // Web platform doesn't need special initialization from storage
    // Location tracking state is managed by the LocationService wrapper
    return true;
  }
  
  async setCurrentOrder(orderId) {
    this.currentOrderId = orderId;
    console.log('📋 Current order set:', orderId);
  }
  
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, 30000); // 30 second timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            },
            timestamp: position.timestamp
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000
        }
      );
    });
  }
}

// Create a singleton instance
const webLocationServiceInstance = new WebLocationService();

// Export both the class and a default instance with static-like methods
export default webLocationServiceInstance;