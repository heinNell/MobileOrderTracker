// src/screens/QRScannerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRScanner from '@/components/QRScanner';
import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/types/navigation';
import type { Order } from '../../../shared/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'QRScanner'>;
type RoutePropType = RouteProp<RootStackParamList, 'QRScanner'>;

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { orderId, orderNumber } = useRoute<RoutePropType>().params || {};
  const [driverId, setDriverId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Fetch driverId on mount
  useEffect(() => {
    const fetchDriverId = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setDriverId(user?.id);
      } catch (error) {
        console.error('Error fetching driverId:', error);
        Alert.alert('Error', 'Failed to authenticate user. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverId();
  }, [navigation]);

  const handleScanSuccess = (order: Order) => {
    try {
      Alert.alert(
        'Scan Successful',
        `QR code validated for order ${order.order_number || orderNumber || 'unknown'}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'View Order',
            onPress: () => navigation.navigate('OrderDetails', { orderId: order.id, order }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process scan result');
    }
  };

  const handleScanError = (error: string) => {
    Alert.alert('Scan Error', error, [
      { text: 'OK', onPress: () => {} },
      { text: 'Cancel', onPress: () => navigation.goBack() },
    ]);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <QRScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={handleClose}
        driverId={driverId}
      />
    </View>
  );
};

export default QRScannerScreen;
