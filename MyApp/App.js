// App.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-gesture-handler';

// Suppress development warnings
LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
  'shadow* style props are deprecated. Use "boxShadow".',
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  'Non-serializable values were found in the navigation state',
]);

// Import your screens from app directory only
import LoadActivationScreen from './app/(tabs)/LoadActivationScreen';
import OrderDetailsScreen from './app/(tabs)/order-details'; // Fixed import path
import OrdersScreen from './app/(tabs)/orders'; // Driver orders only
import ProfileScreen from './app/(tabs)/profile'; // Driver profile
import ScannerScreen from './app/(tabs)/scanner'; // QR Scanner
import ErrorBoundary from './app/components/ErrorBoundary';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import LoginScreen from './app/login';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator for Orders flow
function OrdersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="OrdersList" 
        component={OrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen 
        name="LoadActivation" 
        component={LoadActivationScreen}
        options={{ title: 'Activate Load' }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator for authenticated users
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Stack navigators will handle headers
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStack}
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
        }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          tabBarLabel: 'Scanner',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackMessage="The app encountered an unexpected error. Please restart the app.">
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}
