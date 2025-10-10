// src/screens/OrderDetailsScreen.web.tsx
// Web-specific version without map components
import React from 'react';
import
    {
        ScrollView,
        StyleSheet,
        Text,
        View
    } from 'react-native';

import type { RootStackParamList } from '@/types/navigation';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Location as AppLocation } from '../../../shared/types';

// Define navigation prop
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderDetails'>;

// Define route prop
type RoutePropType = RouteProp<RootStackParamList, 'OrderDetails'>;

interface OrderDetailsScreenProps {
  navigation: NavigationProp;
  route: RoutePropType;
}

// Web fallback component for map
const WebMapPlaceholder: React.FC<{ loadingPoint?: AppLocation; unloadingPoint?: AppLocation }> = ({ loadingPoint, unloadingPoint }) => (
  <View style={styles.webMapPlaceholder}>
    <Text style={styles.webMapText}>
      Map view is not available on web.
      {loadingPoint && unloadingPoint && (
        <Text style={styles.webMapText}>
          {'\n'}Loading: {loadingPoint.latitude.toFixed(4)}, {loadingPoint.longitude.toFixed(4)}
          {'\n'}Unloading: {unloadingPoint.latitude.toFixed(4)}, {unloadingPoint.longitude.toFixed(4)}
        </Text>
      )}
    </Text>
  </View>
);

const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({ navigation, route }) => {
  // ... (rest of the component logic would be the same as the original, but without map components)
  // For now, return a simple placeholder
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Order Details (Web Version)</Text>
      <WebMapPlaceholder />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  webMapPlaceholder: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webMapText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default OrderDetailsScreen;