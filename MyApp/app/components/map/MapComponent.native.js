// Native MapComponent using react-native-maps
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import CenteredView from './CenteredView';

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});

export default function MapComponent({ latitude, longitude, title }) {
  if (!latitude || !longitude) {
    return <CenteredView><Text>Invalid coordinates</Text></CenteredView>;
  }

  const region = {
    latitude, longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <CenteredView style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description="Location marker"
        />
      </MapView>
    </CenteredView>
  );
}