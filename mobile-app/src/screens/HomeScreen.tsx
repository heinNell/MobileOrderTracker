// src/screens/HomeScreen.tsx
import { supabase } from '@/lib/supabase';
import { LocationService } from '@/services/locationService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import
  {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
import type { Order } from '../../../shared/types';

// Define navigation param list (combines stack and tab navigators)
type RootStackParamList = {
  Tabs: undefined; // Tab navigator
  Login: undefined;
  OrderDetails: { orderId: string };
  LoadActivation: undefined;
  SetupVerification: undefined;
  ReportIncident: undefined;
  QRScanner: undefined;
  Messages: undefined;
};

type TabParamList = {
  Home: undefined;
  Scanner: undefined;
  Orders: undefined;
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getStatusColor = (status: Order['status']): string => {
  const colors: Record<Order['status'], string> = {
    pending: '#6B7280',
    assigned: '#3B82F6',
    in_transit: '#8B5CF6',
    arrived: '#10B981',
    loading: '#F59E0B',
    loaded: '#10B981',
    unloading: '#F59E0B',
    completed: '#059669',
    cancelled: '#EF4444',
  };
  return colors[status] ?? '#6B7280';
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [locationTracking, setLocationTracking] = useState<'enabled' | 'disabled' | 'pending'>('pending');
  const isMounted = useRef<boolean>(true);

  // Initialize: Check auth and load orders
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (isMounted.current) {
            setLoading(false);
            setDriverId(null);
            setLocationTracking('disabled');
          }
          return;
        }

        const userId = session.session.user.id;
        if (isMounted.current) {
          setDriverId(userId);
        }

        // Check tracking status
        const currentOrderId = await LocationService.getCurrentOrderId();
        if (isMounted.current) {
          setLocationTracking(currentOrderId ? 'enabled' : 'disabled');
        }

        // Load orders
        await loadOrders(userId);
      } catch (error) {
        console.error('Error initializing HomeScreen:', error);
        if (isMounted.current) {
          Alert.alert('Error', 'Failed to initialize dashboard');
          setLoading(false);
          setLocationTracking('disabled');
        }
      }
    };

    initialize();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load orders for the driver
  const loadOrders = async (userId: string) => {
    try {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('orders')
        .select('*, assigned_driver:assigned_driver_id(id, full_name)')
        .eq('assigned_driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (isMounted.current) {
        setOrders((rows as Order[]) || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Real-time order updates
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`orders:driver=${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `assigned_driver_id=eq.${driverId}`,
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
            return updated.slice(0, 10);
          });
          Alert.alert('New Order', 'A new order has been assigned to you!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `assigned_driver_id=eq.${driverId}`,
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
  }, [driverId]);

  // Sync tracking status periodically
  useEffect(() => {
    const syncTracking = async () => {
      const currentOrderId = await LocationService.getCurrentOrderId();
      if (isMounted.current) {
        setLocationTracking(currentOrderId ? 'enabled' : 'disabled');
      }
    };

    syncTracking();
    const intervalId = setInterval(syncTracking, 60000); // Check every minute

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, []);

  // Stop tracking
  const stopTracking = async () => {
    try {
      await LocationService.stopTracking();
      setLocationTracking('disabled');
      Alert.alert('Success', 'Location tracking stopped');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setDriverId(null);
      setOrders([]);
      setLocationTracking('disabled');
      await LocationService.stopTracking();
      navigation.navigate('Login'); // Line 209
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  // Render order item
  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })} // Line 220
    >
      <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
      </View>
      <Text style={styles.orderDetail}>Destination: {item.unloading_point_name}</Text>
      <Text style={styles.orderDetail}>
        Driver: {item.assigned_driver?.full_name || 'Unassigned'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!driverId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Please log in to view your dashboard.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')} // Line 248
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.trackingStatus}>
        Location Tracking: {locationTracking === 'enabled' ? 'Active (Background)' : locationTracking === 'disabled' ? 'Disabled' : 'Pending'}
      </Text>
      {locationTracking === 'enabled' && (
        <TouchableOpacity style={styles.stopTrackingButton} onPress={stopTracking}>
          <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.ordersCount}>{orders.length} Active Orders</Text>
      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No orders assigned yet. Check back later or scan a QR code.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item: Order) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.orderList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  trackingStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  stopTrackingButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  stopTrackingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ordersCount: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  orderList: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default HomeScreen;
