// Web implementation using Leaflet (FREE - No API Key Needed)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Leaflet is loaded dynamically to avoid SSR issues
let L = null;
if (typeof window !== 'undefined') {
  try {
    L = require('leaflet');
    require('leaflet/dist/leaflet.css');
    
    // Fix Leaflet default marker icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  } catch (error) {
    console.error('Error loading Leaflet:', error);
  }
}


const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Color constants
const COLORS = {
  error: '#d32f2f',
  textSecondary: '#666',
};

// Wrapper to match react-native-maps API with Leaflet
export function MapView({ 
  style, 
  initialRegion, 
  children, 
  onRegionChange,
  onRegionChangeComplete,
  mapType: _mapType = 'standard',
  ..._props 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  // Store callbacks in ref to avoid re-renders
  const callbacksRef = useRef({ onRegionChange, onRegionChangeComplete });
  useEffect(() => {
    callbacksRef.current = { onRegionChange, onRegionChangeComplete };
  });

  // Calculate center and zoom from initialRegion (memoized)
  const center = useMemo(() => 
    initialRegion
      ? [initialRegion.latitude, initialRegion.longitude]
      : [-25.7479, 28.2293], // Default to Pretoria, SA
    [initialRegion]
  );

  const zoom = useMemo(() =>
    initialRegion
      ? Math.max(1, Math.min(20, Math.round(Math.log2(360 / initialRegion.longitudeDelta))))
      : 10,
    [initialRegion]
  );

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add OpenStreetMap tiles (FREE)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Handle region change events
      map.on('move', () => {
        if (callbacksRef.current.onRegionChange) {
          const center = map.getCenter();
          const bounds = map.getBounds();
          callbacksRef.current.onRegionChange({
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: bounds.getNorth() - bounds.getSouth(),
            longitudeDelta: bounds.getEast() - bounds.getWest(),
          });
        }
      });

      map.on('moveend', () => {
        if (callbacksRef.current.onRegionChangeComplete) {
          const center = map.getCenter();
          const bounds = map.getBounds();
          callbacksRef.current.onRegionChangeComplete({
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: bounds.getNorth() - bounds.getSouth(),
            longitudeDelta: bounds.getEast() - bounds.getWest(),
          });
        }
      });

      mapInstanceRef.current = map;
      // Delay state update to avoid cascading renders
      setTimeout(() => setIsLoaded(true), 0);
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      // Delay error setState to avoid cascading renders
      setTimeout(() => {
        setLoadError(error);
        setIsLoaded(true);
      }, 0);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]);

  // Render markers and polylines from children
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.remove());
    polylinesRef.current.forEach(polyline => polyline.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    // Process children to extract markers and polylines
    React.Children.forEach(children, (child) => {
      if (!child) return;

      // Handle Marker components
      if (child.type?.name === 'MarkerWrapper' || child.type === MarkerWrapper) {
        const { coordinate, title, description } = child.props;
        if (coordinate) {
          const marker = L.marker([coordinate.latitude, coordinate.longitude])
            .addTo(map);
          
          if (title || description) {
            const popupContent = title && description ? `${title}<br/>${description}` : (title || description);
            marker.bindPopup(popupContent);
          }
          
          markersRef.current.push(marker);
        }
      }

      // Handle Polyline components
      if (child.type?.name === 'PolylineWrapper' || child.type === PolylineWrapper) {
        const { coordinates, strokeColor = '#2563eb', strokeWidth = 3 } = child.props;
        if (coordinates && coordinates.length > 0) {
          const latLngs = coordinates.map(coord => [coord.latitude, coord.longitude]);
          const polyline = L.polyline(latLngs, {
            color: strokeColor,
            weight: strokeWidth,
          }).addTo(map);
          
          polylinesRef.current.push(polyline);
        }
      }
    });

    // Fit bounds if we have markers or polylines
    const allLatLngs = [
      ...markersRef.current.map(m => m.getLatLng()),
      ...polylinesRef.current.flatMap(p => p.getLatLngs())
    ];
    
    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [children]);

  if (loadError) {
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>Map loading error</Text>
        <Text style={styles.errorSubText}>Please check your internet connection</Text>
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

  return (
    <View style={style}>
      <div ref={mapRef} style={mapContainerStyle} />
    </View>
  );
}

// Marker wrapper - Leaflet markers managed by parent
export function MarkerWrapper({ coordinate: _coordinate, title: _title, description: _description, onPress: _onPress, ..._props }) {
  // In Leaflet, markers must be added directly to the map instance
  // For now, return null - markers should be managed by parent component
  return null;
}

// Re-export Marker with wrapper
export { MarkerWrapper as Marker };

// Polyline wrapper - Leaflet polylines managed by parent
export function PolylineWrapper({ 
  coordinates: _coordinates, 
  strokeColor: _strokeColor = '#000', 
  strokeWidth: _strokeWidth = 2,
  strokeOpacity: _strokeOpacity = 1.0,
  lineDashPattern: _lineDashPattern,
  ..._props 
}) {
  // In Leaflet, polylines must be added directly to the map instance
  // For now, return null - polylines should be managed by parent component
  return null;
}

// Re-export with alias for compatibility
export const Polyline = PolylineWrapper;

// Circle component wrapper - Leaflet circles managed by parent
export function Circle({ 
  center: _center, 
  radius: _radius, 
  fillColor: _fillColor = COLORS.textSecondary, 
  strokeColor: _strokeColor = COLORS.error, 
  strokeWidth: _strokeWidth = 1, 
  ..._props 
}) {
  // In Leaflet, circles must be added directly to the map instance
  // For now, return null - circles should be managed by parent component
  return null;
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
