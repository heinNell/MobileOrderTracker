import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

interface LoadActivationScreenProps {
  route: {
    params: {
      orderId: string;
      orderNumber: string;
    };
  };
  navigation: any;
}

export default function LoadActivationScreen({
  route,
  navigation,
}: LoadActivationScreenProps) {
  const { orderId, orderNumber } = route.params;
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    loadOrderDetails();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrderDetails(order);
    } catch (error: any) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateLoad = async () => {
    try {
      // Check if location is available
      if (!location && locationPermission) {
        Alert.alert(
          'Location Required',
          'Please wait while we get your current location...'
        );
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
      }

      // Confirm activation
      Alert.alert(
        'Activate Load',
        `Are you sure you want to activate load for order ${orderNumber}?\n\nThis will:\n• Mark the order as activated\n• Enable QR code scanning\n• Start tracking your location`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Activate',
            style: 'default',
            onPress: async () => {
              await activateLoad();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error preparing activation:', error);
      Alert.alert('Error', 'Failed to prepare load activation');
    }
  };

  const activateLoad = async () => {
    try {
      setLoading(true);

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Prepare activation data
      const activationData: any = {
        order_id: orderId,
      };

      // Add location if available
      if (location) {
        activationData.location = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Try to reverse geocode
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            activationData.location_address = [
              addr.street,
              addr.city,
              addr.region,
              addr.country,
            ]
              .filter(Boolean)
              .join(', ');
          }
        } catch (geoError) {
          console.warn('Reverse geocoding failed:', geoError);
        }
      }

      // Add device info
      activationData.device_info = {
        platform: Platform.OS,
        app_version: '1.0.0',
        os_version: Platform.Version,
      };

      // Call activate-load Edge Function
      const { data, error } = await supabase.functions.invoke('activate-load', {
        body: activationData,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to activate load');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to activate load');
      }

      console.log('Load activated successfully:', data);

      // Show success message
      Alert.alert(
        'Load Activated!',
        `Order ${orderNumber} has been activated successfully.\n\nYou can now scan QR codes for pickup and delivery.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to order details or scanner
              navigation.goBack();
            },
          },
          {
            text: 'Scan QR Code',
            onPress: () => {
              navigation.navigate('QRScanner', {
                orderId,
                orderNumber,
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error activating load:', error);
      let message = 'Failed to activate load';
      
      if (error.message.includes('not assigned')) {
        message = 'You are not assigned to this order';
      } else if (error.message.includes('already activated')) {
        message = 'This load has already been activated';
      } else if (error.message.includes('status')) {
        message = 'Order is not in a valid status for activation';
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert('Activation Failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !orderDetails) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="local-shipping" size={64} color="#2563eb" />
          <Text style={styles.title}>Activate Load</Text>
          <Text style={styles.subtitle}>Order {orderNumber}</Text>
        </View>

        {/* Order Information */}
        {orderDetails && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[styles.statusBadge, getStatusStyle(orderDetails.status)]}>
                <Text style={styles.statusText}>
                  {orderDetails.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loading Point:</Text>
              <Text style={styles.infoValue}>
                {orderDetails.loading_point_name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Delivery Point:</Text>
              <Text style={styles.infoValue}>
                {orderDetails.unloading_point_name}
              </Text>
            </View>

            {orderDetails.estimated_distance_km && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance:</Text>
                <Text style={styles.infoValue}>
                  {orderDetails.estimated_distance_km} km
                </Text>
              </View>
            )}

            {orderDetails.load_activated_at && (
              <View style={styles.alertBox}>
                <MaterialIcons name="check-circle" size={20} color="#10b981" />
                <Text style={styles.alertText}>
                  This load was already activated on{' '}
                  {new Date(orderDetails.load_activated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Location Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Services</Text>

          {locationPermission ? (
            <View style={styles.locationStatus}>
              <MaterialIcons name="location-on" size={24} color="#10b981" />
              <Text style={styles.locationText}>
                Location services enabled
                {location && (
                  <>
                    {'\n'}
                    Lat: {location.coords.latitude.toFixed(6)}, Lon:{' '}
                    {location.coords.longitude.toFixed(6)}
                  </>
                )}
              </Text>
            </View>
          ) : (
            <View style={styles.locationStatus}>
              <MaterialIcons name="location-off" size={24} color="#ef4444" />
              <Text style={styles.locationText}>
                Location permission required
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>
                  Enable Location
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Activation Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Before You Activate</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <MaterialIcons name="check-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.instructionText}>
                Ensure you are at the loading point
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons name="check-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.instructionText}>
                Verify the vehicle is ready for loading
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons name="check-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.instructionText}>
                Location services must be enabled
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialIcons name="check-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.instructionText}>
                After activation, you can scan QR codes
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.activateButton,
              (loading || !locationPermission || orderDetails?.load_activated_at) &&
                styles.disabledButton,
            ]}
            onPress={handleActivateLoad}
            disabled={loading || !locationPermission || orderDetails?.load_activated_at}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="play-circle-filled" size={24} color="#ffffff" />
                <Text style={styles.activateButtonText}>
                  {orderDetails?.load_activated_at
                    ? 'Already Activated'
                    : 'Activate Load'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const getStatusStyle = (status: string) => {
  const styles: any = {
    pending: { backgroundColor: '#9ca3af' },
    assigned: { backgroundColor: '#3b82f6' },
    activated: { backgroundColor: '#10b981' },
    in_transit: { backgroundColor: '#8b5cf6' },
    delivered: { backgroundColor: '#059669' },
    completed: { backgroundColor: '#10b981' },
  };
  return styles[status] || { backgroundColor: '#6b7280' };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#065f46',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  activateButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  activateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
