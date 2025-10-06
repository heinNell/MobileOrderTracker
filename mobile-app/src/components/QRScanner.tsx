import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

interface QRScannerProps {
  onQRScanned?: (data: string) => void;
}

interface QRPayload {
  orderId: string;
  orderNumber?: string;
  timestamp: number;
  mobileUrl: string;
  webUrl: string;
  tenantId: string;
  signature: string;
}

export default function QRScanner({ onQRScanned }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const navigateToOrder = (orderId: string, orderNumber?: string) => {
    try {
      Alert.alert(
        'Order Found!',
        `Opening order: ${orderNumber || orderId}`,
        [
          { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
          { 
            text: 'Open Order', 
            onPress: () => {
              navigation.navigate('OrderDetails' as never, { orderId } as never);
            }
          }
        ]
      );
    } catch (navError) {
      console.error('❌ Navigation error:', navError);
      Alert.alert('Error', 'Failed to open order details', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    console.log('📷 QR Code scanned:', data);

    try {
      // Parse QR code data
      const qrPayload: QRPayload = JSON.parse(atob(data));
      console.log('📋 QR Payload:', qrPayload);

      // Validate QR code
      if (!qrPayload.orderId) {
        throw new Error('Invalid QR code: No order ID found');
      }

      // Check expiration
      const expirationTime = qrPayload.timestamp + (24 * 60 * 60 * 1000); // 24 hours
      if (Date.now() > expirationTime) {
        Alert.alert(
          'QR Code Expired',
          'This QR code has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Show success and navigate
      navigateToOrder(qrPayload.orderId, qrPayload.orderNumber);
      if (onQRScanned) {
        onQRScanned(data);
      }
    } catch (parseError) {
      console.error('❌ QR Code parsing error:', parseError);
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not recognized as a valid order code.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>Please enable camera permissions in device settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        
        <Text style={styles.scanText}>
          {scanned ? 'QR Code Scanned!' : 'Point camera at QR code'}
        </Text>
        
        {scanned && (
          <Text 
            style={styles.tryAgainText}
            onPress={() => setScanned(false)}
          >
            Tap to scan again
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
  },
  subText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  tryAgainText: {
    fontSize: 14,
    color: '#00ff00',
    textAlign: 'center',
    marginTop: 15,
    textDecorationLine: 'underline',
  },
});
