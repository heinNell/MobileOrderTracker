# 📱 LocationService Integration Guide

## 🔧 How to Apply the Live Map Fixes

Since the methods need to be integrated into your existing LocationService class, here's how to do it properly:

### **Option 1: Manual Integration (Recommended)**

1. **Open your existing `LocationService.js` file**
2. **Find the `sendImmediateLocationUpdate` method**
3. **Replace it entirely** with this updated version:

```javascript
async sendImmediateLocationUpdate(location, orderId = null) {
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
}
```

4. **Add these new methods** to your LocationService class:

```javascript
// Add this new method to your LocationService class
async startAutomaticTrackingOnLogin() {
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
}

// Add this method too
async shouldAutoStartTracking() {
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
}
```

### **Option 2: Quick Copy-Paste**

If you want to be extra safe:

1. **Make a backup** of your current `LocationService.js`
2. **Copy the entire content** from the backup
3. **Replace the methods** mentioned above
4. **Test the app** to ensure everything still works

---

## 🚀 **Next: Update Your Login Handler**

Add this to your authentication success handler:

```javascript
// In your auth context or login screen, after successful login:
import { LocationService } from "../services/LocationService";

const handleLoginSuccess = async () => {
  // Your existing login code...

  // NEW: Start automatic tracking if driver has active orders
  try {
    const locationService = new LocationService();
    const trackingStarted =
      await locationService.startAutomaticTrackingOnLogin();

    if (trackingStarted) {
      console.log("🚀 Automatic tracking started for active order");
    }
  } catch (error) {
    console.warn("Auto-tracking failed (non-critical):", error);
  }
};
```

---

## ✅ **After Making These Changes:**

1. **Run the database script** (`live-map-system-complete.sql`)
2. **Test your mobile app** - location tracking should now work
3. **Check the dashboard Live Map** - driver locations should appear
4. **Verify order auto-activation** when assigning drivers

The syntax errors should be resolved and your Live Map will be functional!
