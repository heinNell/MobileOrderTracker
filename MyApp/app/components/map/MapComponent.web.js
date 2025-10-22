// Web MapComponent using Google Maps
import React from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import CenteredView from './CenteredView';

const centerMapContainerStyle = {
  height: 400,
  width: '100%',
};

const styles = StyleSheet.create({
  errorText: {
    fontWeight: '600',
  },
});

export default function MapComponent({ latitude, longitude, title }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  if (!latitude || !longitude) {
    return (
      <CenteredView style={centerMapContainerStyle}>
        <Text style={styles.errorText}>Invalid coordinates</Text>
      </CenteredView>
    );
  }

  if (loadError) {
    return (
      <CenteredView style={centerMapContainerStyle}>
        <Text style={styles.errorText}>Map unavailable</Text>
      </CenteredView>
    );
  }

  if (!isLoaded) {
    return (
      <CenteredView style={centerMapContainerStyle}>
        <ActivityIndicator size="large" />
      </CenteredView>
    );
  }

  return (
    <CenteredView style={centerMapContainerStyle}>
      <GoogleMap
        mapContainerStyle={centerMapContainerStyle}
        center={{ lat: latitude, lng: longitude }}
        zoom={12}
      >
        <Marker position={{ lat: latitude, lng: longitude }} title={title} />
      </GoogleMap>
    </CenteredView>
  );
}