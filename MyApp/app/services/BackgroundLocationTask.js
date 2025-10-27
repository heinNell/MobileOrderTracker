// services/BackgroundLocationTask.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Background] Task error:', error);
    return;
  }

  if (!data || !data.locations || data.locations.length === 0) return;

  const location = data.locations[0];
  const { latitude, longitude, accuracy } = location.coords;

  // Get current order ID from AsyncStorage
  let orderId = null;
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    orderId = await AsyncStorage.default.getItem('trackingOrderId');
  } catch (e) {
    console.warn('Failed to read order ID from storage:', e);
  }

  if (!orderId) return;

  // Get user
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return;

  try {
    await supabase.from('driver_locations').insert({
      order_id: orderId,
      driver_id: authData.user.id,
      latitude,
      longitude,
      accuracy_meters: accuracy || 0,
      timestamp: new Date(location.timestamp).toISOString(),
      created_at: new Date().toISOString(),
    });
    console.log('[Background] Location saved:', { latitude, longitude });
  } catch (err) {
    console.error('[Background] Save failed:', err);
  }
});

export const startBackgroundLocation = async (orderId) => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Background location permission denied');
    return false;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000, // 10s
    distanceInterval: 10, // 10m
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Tracking Active',
      notificationBody: `Order #${orderId} is being tracked`,
      notificationColor: '#FF6B6B',
    },
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
  });

  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.default.setItem('trackingOrderId', orderId);
  await AsyncStorage.default.setItem('backgroundTracking', 'true');

  return true;
};

export const stopBackgroundLocation = async () => {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.default.removeItem('trackingOrderId');
  await AsyncStorage.default.removeItem('backgroundTracking');
};
