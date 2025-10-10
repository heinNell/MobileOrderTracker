import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-gesture-handler";
import { storage } from "./src/lib/storage";
import { supabase } from "./src/lib/supabase";
import { Order } from "./src/shared/types";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/Login";
import MessagesScreen from "./src/screens/Messages";
import OrderDetailsScreen from "./src/screens/OrderDetailsScreen";
import QRScannerScreen from "./src/screens/QRScannerScreen";
import ReportIncidentScreen from "./src/screens/ReportIncident";
import SetupVerificationScreen from "./src/screens/SetupVerificationScreen";
// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Define navigation param lists
export type RootStackParamList = {
  SetupVerification: undefined;
  TabNavigator: undefined;
  OrderDetails: { orderId?: string; order?: Order };
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
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#6B7280",
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

// Orders Screen (unchanged)
function OrdersScreen({ navigation }: { navigation: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (isMounted) {
            setLoading(false);
            setTenantId(null);
          }
          return;
        }

        const user = session.session.user;
        const tenantId = user.user_metadata?.tenant_id || "default-tenant";
        if (isMounted) {
          setTenantId(tenantId);
        }

        await loadOrders(tenantId);
      } catch (error) {
        console.error("Error initializing OrdersScreen:", error);
        if (isMounted) {
          Alert.alert("Error", "Failed to initialize orders list");
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadOrders = async (tenantId: string) => {
    try {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("orders")
        .select("*, assigned_driver:assigned_driver_id(id, full_name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders((rows as Order[]) || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`orders:tenant=${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          setOrders((current) => {
            const newOrder = payload.new as Order;
            if (current.some((order) => order.id === newOrder.id)) {
              return current;
            }
            const updated = [...current, newOrder].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return updated.slice(0, 20);
          });
          Alert.alert("New Order", "A new order has been added!");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          setOrders((current) =>
            current.map((order) =>
              order.id === (payload.new as Order).id ? (payload.new as Order) : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (!tenantId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Please log in to view orders.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>All Orders</Text>
      <Text style={styles.ordersCount}>{orders.length} orders found</Text>
      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No orders available. Check back later.</Text>
        </View>
      ) : (
        <View>
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
              style={styles.orderCard}
            >
              <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
              <Text style={styles.orderDetail}>
                Status: {order.status.replace("_", " ").toUpperCase()}
              </Text>
              <Text style={styles.orderDetail}>Destination: {order.unloading_point_name}</Text>
              <Text style={styles.orderDetail}>
                Driver: {order.assigned_driver?.full_name || "Unassigned"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Profile Screen (placeholder)
function ProfileScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.headerTitle}>Driver Profile</Text>
      <Text style={styles.emptyText}>Settings and account information</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.primaryButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("TabNavigator");

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const setupComplete = await storage.getItem("setup_verification_complete");
      if (!setupComplete) {
        setInitialRoute("SetupVerification");
      }
      setIsReady(true);
    } catch (error) {
      console.error("App initialization error:", error);
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Starting Mobile Order Tracker...</Text>
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
          component={OrderDetailsScreen}
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
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  ordersCount: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  orderDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
});