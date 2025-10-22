// Web MapView using MapLibre GL JS
import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from '../../constants';
import CenteredView from './CenteredView';

// Define color constants
const Colors = {
  background: 'rgba(255, 255, 255, 0.8)',
  loadingIndicator: '#0000ff',
};

export default function WebMapView({ initialCoords, title }) {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mapRef.current) {
      setLoading(false); // Map has loaded
    }
  }, [mapRef]);

  if (!initialCoords || !title) {
    return <Text>Error: Missing coordinates or title.</Text>;
  }

  return (
    <CenteredView style={styles.container}>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.loadingIndicator} />
        </View>
      )}
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: initialCoords.latitude,
          longitude: initialCoords.longitude,
          zoom: 12,
        }}
        style={styles.map}
        mapStyle={MAPTILER_STYLE_URL.replace('MAPTILER_API_KEY', MAPTILER_API_KEY)}
        mapLib={import('maplibre-gl')}
      >
        <Marker
          longitude={initialCoords.longitude}
          latitude={initialCoords.latitude}
          anchor={{ x: 0.5, y: 1 }}
        >
          <Text>{title}</Text>
        </Marker>
      </Map>
    </CenteredView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background, // Using the constant here
  },
});
