# Location Tracking Fixes for Mobile App

## Issues Identified

1. **Web Geolocation Timeout** - Default 3 second timeout is too short
2. **Invalid LatLng Coordinates** - Non-number values being passed to Google Maps
3. **Missing Coordinate Validation** - No checks before setting map center
4. **Directions API Errors** - Network/CORS issues with Google Directions

## Fixes Applied

### 1. Fix LocationService.js - Add Web Support with Better Error Handling

**File**: `MyApp/app/services/LocationService.js`

Update the `getCurrentLocation` method around line 278:

```javascript
// Get current location
async getCurrentLocation() {
  try {
    // Web platform - use browser geolocation API
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported by browser'));
          return;
        }

        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timeout (30s)'));
        }, 30000); // 30 second timeout for web

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date(position.timestamp).toISOString(),
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || null,
              heading: position.coords.heading || null,
            };

            // Validate coordinates
            if (!this.isValidCoordinate(location)) {
              reject(new Error('Invalid coordinates received'));
              return;
            }

            this.lastLocation = location;
            resolve(location);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('Web geolocation error:', error);
            let errorMessage = 'Location error';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable in browser settings.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location unavailable. Please check your connection.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timeout. Please try again.';
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // 30 seconds
            maximumAge: 5000, // Accept cached location up to 5 seconds old
          }
        );
      });
    }

    // Native platform - use expo-location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      distanceInterval: 1,
    });

    this.lastLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
    };

    // Validate coordinates
    if (!this.isValidCoordinate(this.lastLocation)) {
      throw new Error('Invalid coordinates received from location service');
    }

    return this.lastLocation;
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}

// Add coordinate validation method
isValidCoordinate(location) {
  if (!location) return false;

  const { latitude, longitude } = location;

  // Check if values exist and are numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.error('Coordinate validation failed: not numbers', { latitude, longitude });
    return false;
  }

  // Check if values are finite (not NaN, Infinity, etc.)
  if (!isFinite(latitude) || !isFinite(longitude)) {
    console.error('Coordinate validation failed: not finite', { latitude, longitude });
    return false;
  }

  // Check valid latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    console.error('Coordinate validation failed: invalid latitude', { latitude });
    return false;
  }

  // Check valid longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    console.error('Coordinate validation failed: invalid longitude', { longitude });
    return false;
  }

  return true;
}
```

### 2. Fix [orderId].js - Better Web Geolocation Handling

**File**: `MyApp/app/(tabs)/[orderId].js`

Replace the web geolocation watchPosition around line 306:

```javascript
// Track foreground user location
useEffect(() => {
  let subscription;
  let watchId;

  if (Platform.OS === "web" && navigator.geolocation) {
    // Web geolocation with better error handling
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Validate coordinates before setting state
        if (
          typeof coords.latitude === "number" &&
          typeof coords.longitude === "number" &&
          isFinite(coords.latitude) &&
          isFinite(coords.longitude) &&
          coords.latitude >= -90 &&
          coords.latitude <= 90 &&
          coords.longitude >= -180 &&
          coords.longitude <= 180
        ) {
          setUserLocation(coords);
          setLocationError(null);
          console.log("📍 Web location update:", coords);
        } else {
          console.error("Invalid coordinates received:", coords);
          setLocationError("Invalid location coordinates received");
        }
      },
      (err) => {
        console.error("Web location tracking error:", err);
        let errorMessage = "Failed to track location";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Enable in browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable. Check your connection.";
            break;
          case err.TIMEOUT:
            errorMessage = "Location timeout. Retrying...";
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Accept cached location up to 5 seconds old
        timeout: 30000, // Increased timeout to 30 seconds
      }
    );
  } else if (locationPermission === "granted") {
    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 1000,
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setLocationError(null);
          }
        );
      } catch (err) {
        console.error("Foreground location tracking error:", err);
        setLocationError("Failed to track location. Check device settings.");
      }
    })();
  }

  return () => {
    if (Platform.OS === "web" && watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
      console.log("Cleared web geolocation watch");
    } else if (subscription) {
      subscription.remove();
    }
  };
}, [locationPermission]);
```

### 3. Add Coordinate Validation Helper

**File**: `MyApp/app/utils/coordinateValidation.js` (NEW FILE)

```javascript
/**
 * Validate geographic coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export const isValidCoordinate = (latitude, longitude) => {
  // Check if values exist and are numbers
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }

  // Check if values are finite (not NaN, Infinity, etc.)
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return false;
  }

  // Check valid latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return false;
  }

  // Check valid longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return false;
  }

  return true;
};

/**
 * Safe coordinate parsing from any input
 * @param {*} lat
 * @param {*} lng
 * @returns {{latitude: number, longitude: number} | null}
 */
export const parseCoordinate = (lat, lng) => {
  const latitude = typeof lat === "string" ? parseFloat(lat) : lat;
  const longitude = typeof lng === "string" ? parseFloat(lng) : lng;

  if (isValidCoordinate(latitude, longitude)) {
    return { latitude, longitude };
  }

  return null;
};

/**
 * Get safe map center with fallback
 * @param {*} preferredLat
 * @param {*} preferredLng
 * @param {*} fallbackLat
 * @param {*} fallbackLng
 * @returns {{latitude: number, longitude: number}}
 */
export const getSafeMapCenter = (
  preferredLat,
  preferredLng,
  fallbackLat = -25.7479, // Pretoria, South Africa
  fallbackLng = 28.2293
) => {
  const preferred = parseCoordinate(preferredLat, preferredLng);
  if (preferred) return preferred;

  const fallback = parseCoordinate(fallbackLat, fallbackLng);
  if (fallback) return fallback;

  // Ultimate fallback
  return { latitude: 0, longitude: 0 };
};
```

## Implementation Steps

1. **Update LocationService.js**:

   - Add the improved `getCurrentLocation` method with web support
   - Add the `isValidCoordinate` validation method

2. **Update [orderId].js**:

   - Replace web geolocation watchPosition with improved error handling
   - Increase timeout from 10s to 30s
   - Add coordinate validation before setState

3. **Create coordinateValidation.js utility**:

   - Add helper functions for coordinate validation
   - Use in all components that handle coordinates

4. **Test on Web**:

   ```bash
   cd MyApp
   npx expo start --web
   ```

5. **Check Browser Console**:
   - Look for location permission prompts
   - Verify no "Invalid LatLng" errors
   - Check that coordinates are valid numbers

## Browser Location Permission

**Chrome/Edge**:

1. Click lock icon in address bar
2. Location → Allow
3. Refresh page

**Firefox**:

1. Click lock icon
2. Permissions → Location → Allow
3. Refresh page

**Safari**:

1. Safari → Settings for This Website
2. Location → Allow
3. Refresh page

## Expected Behavior After Fix

✅ Web geolocation timeout increased to 30 seconds  
✅ Invalid coordinates rejected before reaching map  
✅ Clear error messages for permission/timeout issues  
✅ Fallback to cached location (5 seconds old)  
✅ Proper coordinate validation throughout app  
✅ No "Not a valid LatLng" errors

## Debugging

If issues persist:

1. **Check browser console** for specific error codes
2. **Verify location permissions** in browser settings
3. **Test with HTTPS** - some browsers require secure context
4. **Check network** - ensure internet connectivity
5. **Try different browser** - some have better geolocation support
