import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';

// Import your screens from the app directory
import OrdersScreen from './app/(tabs)/orders';
import ProfileScreen from './app/(tabs)/profile';
import ScannerScreen from './app/(tabs)/scanner';
import { AuthProvider } from './app/context/AuthContext';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
          }}
        >
          <Tab.Screen 
            name="Orders" 
            component={OrdersScreen}
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
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              title: 'Profile',
              tabBarLabel: 'Profile',
            }}
          />
        </Tab.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}