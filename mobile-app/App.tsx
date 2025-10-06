// /workspaces/MobileOrderTracker/mobile-app/App.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, Alert, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Screens
import OrderDetailsScreen from "./src/screens/OrderDetailsScreen";
import QRScannerScreen from "./src/screens/QRScannerScreen";
import SetupVerificationScreen from "./src/screens/SetupVerificationScreen";
import ReportIncidentScreen from "./src/screens/ReportIncident";
import MessagesScreen from "./src/screens/Messages";
import LoginScreen from "./src/screens/Login";

// Services
import { supabase } from "./src/lib/supabase";

// Configure notifications (no external redirects)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type RootStackParamList = {
  SetupVerification: undefined;
  TabNavigator: undefined;
  OrderDetails: { orderId?: string; order?: any } | undefined;
  QRScanner: undefined;
  ReportIncident: { orderId: string };
  Messages: { orderId: string };
  Login: undefined;
};

export type TabParamList = {
  Home: undefined;
  Scanner: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Home Screen with basic driver overview and actions
function HomeScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setLoading(false);
        return;
      }

      const { data: rows, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_driver_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders(rows || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Driver Dashboard
      </Text>
      <Text style={{ fontSize: 16, color: "#64748b", marginBottom: 20 }}>
        {orders.length} active orders assigned
      </Text>

      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 18, color: "#64748b", textAlign: "center" }}>
            No orders assigned yet.{"\n"}Check back later or scan a QR code.
          </Text>
        </View>
      ) : (
        <View>
          {orders.slice(0, 3).map((order: any) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
              style={styles.orderCard}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
                Order #{order.order_number}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>
                Status: {order.status}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748b" }}>
                Destination: {order.unloading_point_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Orders Screen placeholder
function OrdersScreen() {
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 18 }}>All Orders</Text>
      <Text style={{ color: "#64748b", marginTop: 8 }}>
        View and manage your delivery orders
      </Text>
    </View>
  );
}

// Profile Screen placeholder
function ProfileScreen({ navigation }: any) {
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>Driver Profile</Text>
      <Text style={{ color: "#64748b", marginBottom: 16 }}>
        Settings and account information
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.primaryButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerTitleAlign: "center",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          title: "Scan QR",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>("TabNavigator");

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Gate the app behind setup verification if desired
      const setupComplete = await AsyncStorage.getItem("setup_verification_complete");
      if (!setupComplete) {
        setInitialRoute("SetupVerification");
      }

      // Removed all deep linking handling to comply with "no redirect" requirement

      setIsReady(true);
    } catch (error) {
      console.error("App initialization error:", error);
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>
          Starting Mobile Order Tracker...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="SetupVerification"
          component={SetupVerificationScreen}
          options={{
            title: "Setup Verification",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TabNavigator"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetailsScreen as any}
          options={{
            title: "Order Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{
            title: "Scan QR Code",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="ReportIncident"
          component={ReportIncidentScreen}
          options={{ title: "Report Incident" }}
        />
        <Stack.Screen
          name="Messages"
          component={MessagesScreen}
          options={{ title: "Messages" }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Login" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  orderCard: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
});