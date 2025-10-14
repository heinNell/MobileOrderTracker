import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="[orderId]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="DriverDashboard"
        options={{
          href: null, // Hide from tab bar since index.js exports it
        }}
      />
      <Tabs.Screen
        name="LoadActivationScreen"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="order-details"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}