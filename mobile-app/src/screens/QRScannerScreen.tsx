// src/screens/QRScannerScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { decodeBase64Json, verifySignature } from '../utils/qrUtils';

interface QRPayload {
  orderId: string;
  orderNumber?: string;
  timestamp: number;
  mobileUrl: string;
  webUrl: string;
  tenantId: string;
  signature: string;
}

const TENANT_ID = Constants.expoConfig?.extra?.tenantId || 'default-tenant';
const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-qr-code`;

export const QRScannerScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const scanningRef = useRef(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanned(true);
    setLoading(true);

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Authentication Required', 'You must be logged in to scan QR codes', [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          { text: 'Login', onPress: () => navigation.navigate('Login' as never) }
        ]);
        return;
      }

      // Try base64 JSON path with local validation
      const decoded = decodeBase64Json<QRPayload>(data);
      if (decoded?.orderId) {
        // Local checks
        const expirationTime = decoded.timestamp + (24 * 60 * 60 * 1000);
        if (Date.now() > expirationTime) {
          Alert.alert('QR Code Expired', 'This QR code has expired. Please request a new one.', [
            { text: 'OK', onPress: () => setScanned(false) }
          ]);
          return;
        }

        if (decoded.tenantId !== TENANT_ID) {
          Alert.alert('Invalid Tenant', 'This QR code belongs to a different organization.', [
            { text: 'OK', onPress: () => setScanned(false) }
          ]);
          return;
        }

        const ok = await verifySignature(decoded);
        if (!ok) {
          Alert.alert('Invalid Code', 'Security verification failed for this QR code.', [
            { text: 'OK', onPress: () => setScanned(false) }
          ]);
          return;
        }

        // Local checks passed: Call Edge Function for full validation
        const response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ qrCodeData: data }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Show confirmation before navigation
          Alert.alert(
            'QR Code Scanned Successfully',
            `Order: ${decoded.orderNumber || decoded.orderId}`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
              { 
                text: 'View Order', 
                onPress: () => navigation.navigate('OrderDetails' as never, { order: result.order } as never)
              }
            ]
          );
          return;
        } else {
          Alert.alert('Validation Failed', result.error || 'Invalid QR code', [
            { text: 'Try Again', onPress: () => setScanned(false) }
          ]);
          return;
        }
      }

      // If not a valid structured QR code, show error
      Alert.alert('Invalid QR Code', 'This QR code is not recognized as a valid order code. Please ensure you are scanning a valid order QR code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('QR handling error:', err);
      Alert.alert('Error', 'Failed to process QR code. Please check your internet connection and try again.', [
        { text: 'Retry', onPress: () => setScanned(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => { scanningRef.current = false; }, 300);
    }
  }, [navigation]);

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.info}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Camera Access Required</Text>
        <Text style={styles.sub}>Camera permission is needed to scan QR codes. Please enable camera access in your device settings.</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Order QR Code</Text>
          <Text style={styles.subtitle}>Position the QR code within the frame to scan</Text>
        </View>
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Validating QR code...</Text>
          </View>
        )}
        {scanned && !loading && (
          <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
            <Text style={styles.rescanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Ensure good lighting and hold steady for best results
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  info: { color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  sub: { color: '#ccc', fontSize: 14, marginTop: 12, paddingHorizontal: 32, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'transparent', borderColor: '#ccc', borderWidth: 1, borderRadius: 8 },
  backButtonText: { color: '#ccc', fontSize: 16, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  header: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#fff', textAlign: 'center', opacity: 0.9 },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3B82F6', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  loadingContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12 },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 12, fontWeight: '500' },
  rescanButton: { position: 'absolute', bottom: 80, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 16, backgroundColor: '#10B981', borderRadius: 8 },
  rescanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  helpContainer: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingHorizontal: 20 },
  helpText: { color: '#ccc', fontSize: 12, textAlign: 'center', opacity: 0.8 }
});

export default QRScannerScreen;
