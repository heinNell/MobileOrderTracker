import React from 'react';
import { StyleSheet, Text, View, StatusBar, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './src/lib/supabase';
import SetupVerificationScreen from './src/screens/SetupVerificationScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';

const Stack = createStackNavigator();

// Test Supabase connection on app start
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('orders').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      // Don't show alert here since SetupVerificationScreen will handle it
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('Network error:', error);
    // Don't show alert here since SetupVerificationScreen will handle it
  }
};

export default function App() {
  React.useEffect(() => {
    testSupabaseConnection();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator 
        initialRouteName="SetupVerification"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="SetupVerification" 
          component={SetupVerificationScreen} 
          options={{ title: 'System Verification' }}
        />
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen} 
          options={{ title: 'Order Tracker - Scan QR' }}
        />
        <Stack.Screen 
          name="OrderDetails" 
          component={OrderDetailsScreen} 
          options={{ title: 'Order Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});