// Diagnostic component to check and manage active orders
// Add this as a button in your driver dashboard for testing

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { supabase } from '../lib/supabase';

export class LocationDiagnostics {
  static async checkStoredData() {
    try {
      const activeOrderId = await AsyncStorage.getItem('activeOrderId');
      const trackingOrderId = await AsyncStorage.getItem('trackingOrderId');
      
      console.log('📊 DIAGNOSTIC DATA:');
      console.log('   Active Order ID:', activeOrderId || 'NULL');
      console.log('   Tracking Order ID:', trackingOrderId || 'NULL');
      
      return {
        activeOrderId,
        trackingOrderId
      };
    } catch (error) {
      console.error('Error checking stored data:', error);
      return { activeOrderId: null, trackingOrderId: null };
    }
  }
  
  static async getAvailableOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user');
        return [];
      }
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, status')
        .eq('assigned_driver_id', user.id)
        .in('status', ['assigned', 'activated', 'in_progress', 'in_transit'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
      
      console.log('📋 Available Orders for Driver:', orders.length);
      orders.forEach(order => {
        console.log(`   ${order.order_number}: ${order.status} (${order.id})`);
      });
      
      return orders || [];
    } catch (error) {
      console.error('Error getting available orders:', error);
      return [];
    }
  }
  
  static async setTestOrderId(orderId) {
    try {
      await AsyncStorage.setItem('activeOrderId', orderId);
      await AsyncStorage.setItem('trackingOrderId', orderId);
      
      console.log('✅ Test order ID set:', orderId);
      Alert.alert('Success', `Test order ID set to: ${orderId}`);
      
      return true;
    } catch (error) {
      console.error('Error setting test order ID:', error);
      Alert.alert('Error', 'Failed to set test order ID');
      return false;
    }
  }
  
  static async clearAllStoredData() {
    try {
      await AsyncStorage.multiRemove(['activeOrderId', 'trackingOrderId', 'orderStartingPoint']);
      console.log('✅ All stored data cleared');
      Alert.alert('Success', 'All stored order data cleared');
    } catch (error) {
      console.error('Error clearing stored data:', error);
      Alert.alert('Error', 'Failed to clear stored data');
    }
  }
  
  static async testLocationUpdate() {
    try {
      const LocationService = require('./LocationService').default;
      const locationService = new LocationService();
      
      // Initialize and check current order
      await locationService.initialize();
      const currentOrderId = await locationService.getCurrentOrderId();
      
      console.log('🧪 Testing location update...');
      console.log('   Current Order ID:', currentOrderId || 'NULL');
      
      // Send a test location update
      await locationService.sendImmediateLocationUpdate();
      
      Alert.alert(
        'Test Complete', 
        `Location update sent with order ID: ${currentOrderId || 'NULL'}\n\nCheck the database to verify the update was recorded.`
      );
      
      return { success: true, orderId: currentOrderId };
    } catch (error) {
      console.error('Error testing location update:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default LocationDiagnostics;