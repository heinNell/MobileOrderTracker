// Web MapComponent using Leaflet (FREE - No API Key Needed)
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import CenteredView from './CenteredView';

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

// Define constants
const MAP_CONTAINER_STYLE = {
  height: 400,
  width: '100%',
};

const DEFAULT_ZOOM = 12;

const styles = StyleSheet.create({
  errorText: {
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 8,
  overflow: 'hidden',
};

export default function MapComponent({ 
  latitude, 
  longitude, 
  title, 
  zoom = DEFAULT_ZOOM,
  showMarker = true 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Validate and memoize the center coordinates
  const center = useMemo(() => {
    // Handle undefined or null values
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      console.warn('MapComponent: Coordinates are undefined/null, using default location');
      return { lat: -25.7479, lng: 28.2293 }; // Default to Pretoria, SA
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Validate coordinates before using them
    if (Number.isFinite(lat) && Number.isFinite(lng) && 
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
    
    // Return default coordinates if invalid
    console.warn('MapComponent: Invalid coordinates provided:', { latitude, longitude });
    return { lat: -25.7479, lng: 28.2293 };
  }, [latitude, longitude]);

  // Validate coordinates
  const isValidCoordinates = useMemo(() => {
    // Return false if undefined or null
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return false;
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }, [latitude, longitude]);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      try {
        // Initialize map
        const map = L.map(mapRef.current, {
          center: [center.lat, center.lng],
          zoom: zoom,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        // Add OpenStreetMap tiles (FREE)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsLoaded(true);
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoadError(error);
        setIsLoaded(true);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center.lat, center.lng, zoom]);

  // Update map center and marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;

    // Update map center
    mapInstanceRef.current.setView([center.lat, center.lng], zoom);

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if needed
    if (showMarker) {
      markerRef.current = L.marker([center.lat, center.lng])
        .addTo(mapInstanceRef.current);

      if (title) {
        markerRef.current.bindPopup(title);
      }
    }
  }, [center, zoom, showMarker, title]);

  // Error states
  if (!isValidCoordinates) {
    return (
      <CenteredView style={MAP_CONTAINER_STYLE}>
        <Text style={styles.errorText}>
          Invalid coordinates provided
        </Text>
        <Text style={styles.loadingText}>
          Please check the latitude and longitude values
        </Text>
      </CenteredView>
    );
  }

  if (loadError) {
    console.error('Leaflet load error:', loadError);
    return (
      <CenteredView style={MAP_CONTAINER_STYLE}>
        <Text style={styles.errorText}>
          Map unavailable
        </Text>
        <Text style={styles.loadingText}>
          Please check your internet connection and try again
        </Text>
      </CenteredView>
    );
  }

  if (!isLoaded) {
    return (
      <CenteredView style={MAP_CONTAINER_STYLE}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading map...
        </Text>
      </CenteredView>
    );
  }

  return (
    <View style={MAP_CONTAINER_STYLE}>
      <div
        ref={mapRef}
        style={mapContainerStyle}
      />
    </View>
  );
}
