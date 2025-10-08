// app/(tabs)/index.js
import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";

export default function HomeScreen() {
  const [orders, setOrders] = useState([]);
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
          {orders.slice(0, 3).map((order) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => router.push(`/order-details?orderId=${order.id}`)}
              style={styles.orderCard}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}
              >
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
});
