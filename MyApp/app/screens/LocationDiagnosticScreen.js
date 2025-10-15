// Diagnostic screen for location tracking testing
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import
    {
        ActivityIndicator,
        Alert,
        ScrollView,
        StyleSheet,
        Text,
        TouchableOpacity,
        View,
    } from "react-native";
import { LocationDiagnostics } from "../services/LocationDiagnostics";

const colors = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  white: '#fff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export default function LocationDiagnosticScreen() {
  const [loading, setLoading] = useState(false);
  const [storedData, setStoredData] = useState({ activeOrderId: null, trackingOrderId: null });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setRefreshing(true);
    try {
      const stored = await LocationDiagnostics.checkStoredData();
      const orders = await LocationDiagnostics.getAvailableOrders();
      
      setStoredData(stored);
      setAvailableOrders(orders);
    } catch (error) {
      console.error('Error loading diagnostic data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSetTestOrder = (orderId) => {
    Alert.alert(
      'Set Test Order',
      'This will set this order as the active order for location tracking testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set Order', 
          onPress: async () => {
            setLoading(true);
            await LocationDiagnostics.setTestOrderId(orderId);
            await loadDiagnosticData();
            setLoading(false);
          }
        }
      ]
    );
  };

  const handleTestLocationUpdate = async () => {
    setLoading(true);
    await LocationDiagnostics.testLocationUpdate();
    setLoading(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all stored order and tracking data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await LocationDiagnostics.clearAllStoredData();
            await loadDiagnosticData();
            setLoading(false);
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="bug-report" size={32} color={colors.primary} />
        <Text style={styles.title}>Location Diagnostics</Text>
        <Text style={styles.subtitle}>Debug location tracking integration</Text>
      </View>

      {/* Current Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Status</Text>
        <View style={styles.statusRow}>
          <MaterialIcons 
            name="info" 
            size={20} 
            color={storedData.activeOrderId ? colors.success : colors.warning} 
          />
          <Text style={styles.statusLabel}>Active Order ID:</Text>
          <Text style={[
            styles.statusValue, 
            { color: storedData.activeOrderId ? colors.success : colors.warning }
          ]}>
            {storedData.activeOrderId || 'NULL'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <MaterialIcons 
            name="track-changes" 
            size={20} 
            color={storedData.trackingOrderId ? colors.success : colors.warning} 
          />
          <Text style={styles.statusLabel}>Tracking Order ID:</Text>
          <Text style={[
            styles.statusValue, 
            { color: storedData.trackingOrderId ? colors.success : colors.warning }
          ]}>
            {storedData.trackingOrderId || 'NULL'}
          </Text>
        </View>
      </View>

      {/* Available Orders */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Available Orders</Text>
          <TouchableOpacity onPress={loadDiagnosticData} disabled={refreshing}>
            <MaterialIcons 
              name="refresh" 
              size={24} 
              color={refreshing ? colors.gray500 : colors.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {availableOrders.length === 0 ? (
          <Text style={styles.noOrdersText}>
            No active orders found. Scan a QR code to activate an order.
          </Text>
        ) : (
          availableOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderRow}
              onPress={() => handleSetTestOrder(order.id)}
            >
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>{order.order_number}</Text>
                <Text style={styles.orderStatus}>Status: {order.status}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={colors.gray500} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Test Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleTestLocationUpdate}
          disabled={loading}
        >
          <MaterialIcons name="my-location" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Test Location Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={loadDiagnosticData}
          disabled={loading}
        >
          <MaterialIcons name="refresh" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Refresh Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={handleClearData}
          disabled={loading}
        >
          <MaterialIcons name="clear" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  header: {
    backgroundColor: colors.white,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray900,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  noOrdersText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  orderStatus: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 8,
  },
});