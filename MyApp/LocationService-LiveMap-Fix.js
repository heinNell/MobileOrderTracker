// UPDATED LocationService.js - Fix for Live Map Integration
// These are methods to add/replace in your existing LocationService class

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Replace the sendImmediateLocationUpdate method in your LocationService class with this:
export const sendImmediateLocationUpdate = async function(location, orderId = null) {
  try {
    await this.ensureInitialized();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let validatedOrderId = orderId;
    
    // If no orderId provided, try to get current tracking order
    if (!validatedOrderId) {
      validatedOrderId = await this.getCurrentOrderId();
    }

    // Validate order exists if provided
    if (validatedOrderId) {
      const { data: orderExists, error: orderCheckError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', validatedOrderId)
        .single();

      if (orderCheckError || !orderExists) {
        console.warn('Order not found for immediate update:', validatedOrderId);
        validatedOrderId = null;
      }
    }

    const { latitude, longitude, timestamp } = location;

    // NEW: Insert into both tables for compatibility
    
    // 1. Insert into driver_locations (for dashboard Live Map)
    const { error: driverLocationError } = await supabase
      .from('driver_locations')
      .insert({
        driver_id: user.id,
        order_id: validatedOrderId,
        latitude,
        longitude,
        location_source: 'mobile_app',
        is_active: true,
        created_at: timestamp || new Date().toISOString(),
      });

    if (driverLocationError) {
      console.error('Error inserting into driver_locations:', driverLocationError);
    } else {
      console.log('✅ Driver location updated for Live Map');
    }

    // 2. Also insert into map_locations (for backward compatibility)
    const { error: mapLocationError } = await supabase
      .from('map_locations')
      .insert({
        order_id: validatedOrderId,
        user_id: user.id,
        latitude,
        longitude,
        name: null, // Now nullable
        created_at: timestamp || new Date().toISOString(),
      });

    if (mapLocationError) {
      console.warn('Map locations insert failed (non-critical):', mapLocationError);
    }

    console.log('📍 Immediate location update sent:', { 
      orderId: validatedOrderId, 
      latitude, 
      longitude,
      timestamp: timestamp || new Date().toISOString()
    });
    
    return { latitude, longitude };
  } catch (error) {
    console.error('Error sending immediate location update:', error);
    throw error;
  }
};

// Add this new method to your LocationService class:
export const startAutomaticTrackingOnLogin = async function() {
  try {
    await this.ensureInitialized();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found for automatic tracking');
      return false;
    }

    // Check for active assigned orders
    const { data: activeOrders, error } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('assigned_driver_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('Error checking for active orders:', error);
      return false;
    }

    if (activeOrders && activeOrders.length > 0) {
      const activeOrder = activeOrders[0];
      console.log('🚀 Found active order, starting automatic tracking:', activeOrder.order_number);
      
      // Store the active order ID
      await AsyncStorage.setItem('trackingOrderId', activeOrder.id);
      await AsyncStorage.setItem('activeOrderId', activeOrder.id);
      
      // Start location tracking immediately
      await this.startLocationTracking(activeOrder.id);
      
      // Send initial location update
      try {
        const location = await this.getCurrentLocation();
        if (location) {
          await this.sendImmediateLocationUpdate(location, activeOrder.id);
        }
      } catch (locationError) {
        console.warn('Initial location update failed:', locationError);
      }
      
      return true;
    } else {
      console.log('No active orders found for automatic tracking');
      return false;
    }
  } catch (error) {
    console.error('Error starting automatic tracking on login:', error);
    return false;
  }
};

// Add this new method to your LocationService class:
export const shouldAutoStartTracking = async function() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: activeOrders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('assigned_driver_id', user.id)
      .eq('status', 'active')
      .limit(1);

    return !error && activeOrders && activeOrders.length > 0;
  } catch {
    return false;
  }
};