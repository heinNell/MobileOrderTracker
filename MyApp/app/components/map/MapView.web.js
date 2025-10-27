// Web implementation using Google Maps API
import { GoogleMap, Circle as GoogleMapsCircle, Polyline as GoogleMapsPolyline, Marker, useJsApiLoader } from '@react-google-maps/api';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Static libraries array to prevent performance warning
const GOOGLE_MAPS_LIBRARIES = ['geometry'];

// Suppress Google Maps font loading timeout errors globally (only once)
let fontErrorSuppressed = false;
if (typeof window !== 'undefined' && !fontErrorSuppressed) {
  fontErrorSuppressed = true;
  const originalError = console.error;
  console.error = (...args) => {
    const errorMsg = args[0]?.toString() || '';
    // Suppress Google Maps font loading timeout errors (harmless)
    if (errorMsg.includes('timeout exceeded') || 
        errorMsg.includes('FontFaceObserver') ||
        errorMsg.includes('fontfaceobserver')) {
      return; // Suppress this error
    }
    originalError.apply(console, args);
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default map options for better UX
const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

// Color constants to avoid literals
const COLORS = {
  error: '#d32f2f',
  textSecondary: '#666',
};

// Wrapper to match react-native-maps API
export function MapView({ 
  style, 
  initialRegion, 
  children, 
  onRegionChange,
  onRegionChangeComplete,
  mapType = 'standard',
  ...props 
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES, // Static libraries array
  });

  if (loadError) {
    console.error('Google Maps loading error:', loadError);
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>Map loading error</Text>
        <Text style={styles.errorSubText}>Please check your API key</Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={[style, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.error} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const center = initialRegion
    ? { lat: initialRegion.latitude, lng: initialRegion.longitude }
    : { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco

  const zoom = initialRegion
    ? Math.max(1, Math.min(20, Math.round(Math.log2(360 / initialRegion.longitudeDelta))))
    : 10;

  // Convert mapType to Google Maps format
  const getGoogleMapType = (type) => {
    switch (type) {
      case 'satellite': return 'satellite';
      case 'hybrid': return 'hybrid';
      case 'terrain': return 'terrain';
      default: return 'roadmap';
    }
  };

  const handleBoundsChanged = () => {
    if (onRegionChange || onRegionChangeComplete) {
      // You can implement region change callbacks here if needed
      // This would require getting the current bounds from the map
    }
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      mapTypeId={getGoogleMapType(mapType)}
      options={defaultMapOptions}
      onBoundsChanged={handleBoundsChanged}
      {...props}
    >
      {children}
    </GoogleMap>
  );
}

// Enhanced Marker wrapper with more props support
export function MarkerWrapper({ coordinate, title, _description, onPress, ...props }) {
  const position = coordinate ? {
    lat: coordinate.latitude,
    lng: coordinate.longitude
  } : null;

  if (!position) return null;

  return (
    <Marker
      position={position}
      title={title}
      onClick={onPress}
      {...props}
    />
  );
}

// Re-export Marker with wrapper
export { MarkerWrapper as Marker };

// Enhanced Polyline wrapper with more styling options
export function PolylineWrapper({ 
  coordinates, 
  strokeColor = '#000', 
  strokeWidth = 2,
  strokeOpacity = 1.0,
  lineDashPattern,
  ...props 
}) {
  if (!coordinates || coordinates.length === 0) return null;

  const path = coordinates.map(coord => ({
    lat: coord.latitude,
    lng: coord.longitude,
  }));

  const options = {
    strokeColor,
    strokeWeight: strokeWidth,
    strokeOpacity,
    ...(lineDashPattern && { 
      strokeDashArray: lineDashPattern.join(' ') 
    }),
  };

  return (
    <GoogleMapsPolyline
      path={path}
      options={options}
      {...props}
    />
  );
}

// Re-export with alias for compatibility
export const Polyline = PolylineWrapper;

// Circle component wrapper (using Google Maps Circle)
export function Circle({ 
  center, 
  radius, 
  fillColor = COLORS.textSecondary, 
  strokeColor = COLORS.error, 
  strokeWidth = 1, 
  ...props 
}) {
  if (!center || !radius) return null;

  const circleCenter = {
    lat: center.latitude,
    lng: center.longitude,
  };

  const circleOptions = {
    center: circleCenter,
    radius: radius, // In meters
    fillColor,
    fillOpacity: 0.3,
    strokeColor,
    strokeOpacity: 0.8,
    strokeWeight: strokeWidth,
    ...props,
  };

  return <GoogleMapsCircle options={circleOptions} />;
}

// No PROVIDER_GOOGLE needed on web
export const PROVIDER_GOOGLE = null;

export default MapView;

const styles = StyleSheet.create({
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    padding: 20,
  },
  errorText: {
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
