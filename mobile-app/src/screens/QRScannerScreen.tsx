// src/screens/QRScannerScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera, CameraType } from 'expo-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { Order } from '../shared/types';

// Define navigation param list from App.tsx
type RootStackParamList = {
  SetupVerification: undefined;
  TabNavigator: undefined;
  OrderDetails: { orderId?: string; order?: Order };
  QRScanner: undefined;
  ReportIncident: { orderId: string };
  Messages: { orderId: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'QRScanner'>;

// QR Code payload structure
interface QRPayload {
  orderId: string;
  orderNumber?: string;
  timestamp: number;
  mobileUrl: string;
  webUrl: string;
  tenantId: string;
  signature?: string;
}

// Constants
const TENANT_ID = Constants.expoConfig?.extra?.tenantId || 'default-tenant';
const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-qr-code`;
const QR_CODE_EXPIRATION_HOURS = 24;

// Utility functions
function decodeBase64Json<T>(data: string): T | null {
  try {
    const decoded = atob(data);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.log('Base64 decode failed, trying as plain JSON...');
    try {
      return JSON.parse(data) as T;
    } catch (jsonError) {
      console.log('Plain JSON parse failed, treating as UUID...');
      return null;
    }
  }
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
};

async function verifySignature(payload: QRPayload): Promise<boolean> {
  // In a real implementation, you would verify the signature here
  // For now, we'll just check if the payload structure is valid
  return !!(payload.orderId && payload.tenantId);
}

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scanningRef = useRef(false);

  // Request camera permissions
  useEffect(() => {
    requestCameraPermission();
  }, []);

  // Reset scanner when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      scanningRef.current = false;
      return () => {
        scanningRef.current = false;
      };
    }, [])
  );

  const requestCameraPermission = async () => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  async function processStructuredQRCode(payload: QRPayload, session: any): Promise<boolean> {
    try {
      // Check expiration
      const expirationTime = payload.timestamp + (QR_CODE_EXPIRATION_HOURS * 60 * 60 * 1000);
      if (Date.now() > expirationTime) {
        Alert.alert('QR Code Expired', 'This QR code has expired. Please request a new one.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return false;
      }

      // Check tenant
      if (payload.tenantId !== TENANT_ID) {
        Alert.alert('Invalid Tenant', 'This QR code belongs to a different organization.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return false;
      }

      // Verify signature
      const signatureValid = await verifySignature(payload);
      if (!signatureValid) {
        Alert.alert('Invalid Code', 'Security verification failed for this QR code.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return false;
      }

      // Use edge function if available
      if (EDGE_FUNCTION_URL && process.env.EXPO_PUBLIC_SUPABASE_URL) {
        try {
          const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qrCodeData: payload }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            Alert.alert(
              'QR Code Scanned Successfully',
              `Order: ${payload.orderNumber || payload.orderId}`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
                {
                  text: 'View Order',
                  onPress: () => navigation.navigate('OrderDetails', { order: result.order }),
                },
              ]
            );
            return true;
          }
        } catch (edgeError) {
          console.warn('Edge function failed, falling back to direct DB query:', edgeError);
        }
      }

      // Fallback to direct database query
      return await processDirectOrderQuery(payload.orderId);
    } catch (error) {
      console.error('Error processing structured QR code:', error);
      return false;
    }
  }

  async function processDirectOrderQuery(orderId: string): Promise<boolean> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, assigned_driver:assigned_driver_id(id, full_name)')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        Alert.alert('Order Not Found', 'Order not found or access denied', [
          { text: 'Try Again', onPress: () => setScanned(false) },
        ]);
        return false;
      }

      Alert.alert(
        'Order Found',
        `Order #${order.order_number || orderId}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'View Order',
            onPress: () => navigation.navigate('OrderDetails', { orderId, order: order as Order }),
          },
        ]
      );
      return true;
    } catch (error) {
      console.error('Error querying order directly:', error);
      return false;
    }
  }

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (scanningRef.current || scanned) return;
      
      scanningRef.current = true;
      setScanned(true);
      setLoading(true);

      try {
        console.log('[QRScanner] Processing QR code data:', data.substring(0, 100));

        // Check authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Authentication Required', 'You must be logged in to scan QR codes', [
            { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
            { text: 'Login', onPress: () => navigation.navigate('Login') },
          ]);
          return;
        }

        // Try structured QR code (base64 JSON)
        const decoded = decodeBase64Json<QRPayload>(data);
        if (decoded?.orderId) {
          console.log('[QRScanner] Processing structured QR code');
          const success = await processStructuredQRCode(decoded, session);
          if (success) return;
        }

        // Try as plain UUID
        const trimmedData = data.trim();
        if (isValidUUID(trimmedData)) {
          console.log('[QRScanner] Processing as UUID');
          const success = await processDirectOrderQuery(trimmedData);
          if (success) return;
        }

        // If we reach here, QR code format is not recognized
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not recognized as a valid order code. Please ensure you are scanning a valid order QR code.',
          [
            { text: 'Try Again', onPress: () => setScanned(false) },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
      } catch (error: any) {
        console.error('[QRScanner] Error processing QR code:', error);
        Alert.alert(
          'Error',
          'Failed to process QR code. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => setScanned(false) },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          scanningRef.current = false;
        }, 500);
      }
    },
    [navigation, scanned]
  );

  // Render loading state
  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Render permission denied state
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorSubtitle}>
          Camera permission is needed to scan QR codes. Please enable camera access in your device settings.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestCameraPermission}>
          <Text style={styles.primaryButtonText}>Request Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render camera scanner
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
        onCameraReady={() => setCameraReady(true)}
      />
      
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan Order QR Code</Text>
          <Text style={styles.subtitle}>Position the QR code within the frame to scan</Text>
        </View>

        {/* Scan Area */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Validating QR code...</Text>
          </View>
        )}

        {/* Rescan Button */}
        {scanned && !loading && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => {
              setScanned(false);
              scanningRef.current = false;
            }}
          >
            <Text style={styles.rescanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {cameraReady
              ? 'Ensure good lighting and hold steady for best results'
              : 'Initializing camera...'}
          </Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  rescanButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  helpText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScannerScreen;