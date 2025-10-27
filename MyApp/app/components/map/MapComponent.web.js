// Web MapComponent using Google Maps
import React, { useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import CenteredView from './CenteredView';

// Define constants
const MAP_CONTAINER_STYLE = {
  height: 400,
  width: '100%',
};

const DEFAULT_ZOOM = 12;
const GOOGLE_MAPS_LIBRARIES = ['places']; // Add if you need places API

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

export default function MapComponent({ 
  latitude, 
  longitude, 
  title, 
  zoom = DEFAULT_ZOOM,
  showMarker = true 
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES, // Optional: if you need additional libraries
  });

  // Validate and memoize the center coordinates
  const center = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Validate coordinates before using them
    if (Number.isFinite(lat) && Number.isFinite(lng) && 
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
    
    // Return default coordinates (London, UK) if invalid
    console.warn('Invalid coordinates provided to MapComponent:', { latitude, longitude });
    return { lat: 51.5074, lng: -0.1278 };
  }, [latitude, longitude]);

  // Validate coordinates
  const isValidCoordinates = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }, [latitude, longitude]);

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
    console.error('Google Maps load error:', loadError);
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
    <CenteredView style={MAP_CONTAINER_STYLE}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={zoom}
        options={{
          // Optional: Customize map options
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {showMarker && (
          <Marker 
            position={center} 
            title={title}
            // Optional: Add custom marker options
            options={{
              animation: window.google?.maps?.Animation?.DROP,
            }}
          />
        )}
      </GoogleMap>
    </CenteredView>
  );
}
