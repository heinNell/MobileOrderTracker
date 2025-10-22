// app/components/map/MapComponentLoader.js
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapComponent from './MapComponent'; // Bare import - Metro resolves to .web.js or .native.js

const MapComponentLoader = (props) => {
  const [component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadMapComponent = async () => {
      try {
        // Use bare import - no explicit .native; Metro handles platform resolution
        const module = MapComponent; // Already imported above
        setComponent(() => module);
      } catch (error) {
        console.warn('Failed to load map component:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadMapComponent();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  if (hasError || !component) {
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to load map component</Text>
      </View>
    );
  }

  return <component {...props} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapComponentLoader;