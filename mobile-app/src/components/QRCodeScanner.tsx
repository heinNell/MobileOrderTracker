// src/components/QRCodeScanner.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, Camera, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Order } from '../../../shared/types';

// Constants
const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

type ScanMode = 'auto' | 'simple' | 'complex';

interface QRCodeScannerProps {
  onScanSuccess: (order: Order) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  driverId?: string;
}

interface ValidateQRResponse {
  success: boolean;
  order?: Order;
  error?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  driverId,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('auto');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [lastScanAttempt, setLastScanAttempt] = useState<string>('');
  const cameraRef = useRef<CameraView>(null);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Handle barcode scan
  const handleBarCodeScanned = useCallback(
    async ({ type, data }: BarcodeScanningResult) => {
      if (scanned || loading || data === lastScanAttempt) return;

      setLastScanAttempt(data);
      setScanned(true);
      setLoading(true);

      try {
        const { data: response, error } = await supabase.functions.invoke<ValidateQRResponse>(
          'validate-qr-code',
          {
            body: {
              qrData: data,
              driverId,
              scanMode,
            },
          }
        );

        if (error) throw new Error(error.message);
        if (!response?.success || !response.order) {
          throw new Error(response?.error || 'Failed to validate QR code');
        }

        onScanSuccess(response.order);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during scanning.';

        if (message.includes('expired')) {
          Alert.alert(
            'QR Code Expired',
            'This QR code has expired. Please request a new one.',
            [{ text: 'OK', onPress: () => setScanned(false) }]
          );
        } else {
          if (onScanError) onScanError(message);
          else {
            Alert.alert('Scan Error', message, [
              { text: 'Try Again', onPress: () => setScanned(false) },
            ]);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [scanned, loading, lastScanAttempt, driverId, scanMode, onScanSuccess, onScanError]
  );

  const toggleFlash = () => setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  const resetScanner = () => {
    setScanned(false);
    setLastScanAttempt('');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#ff0000" />
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashMode}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.topSection}>
            <Text style={styles.headerText}>Scan QR Code</Text>
            <View style={styles.modeSelector}>
              {(['auto', 'simple', 'complex'] as ScanMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeButton, scanMode === mode && styles.modeButtonActive]}
                  onPress={() => setScanMode(mode)}
                >
                  <Text
                    style={[styles.modeButtonText, scanMode === mode && styles.modeButtonTextActive]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.instructionText}>
              {scanMode === 'auto'
                ? 'Automatically detects QR code type'
                : scanMode === 'simple'
                ? 'Simple mode for basic QR codes'
                : 'Complex mode for secure QR codes'}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
                <Ionicons
                  name={flashMode === 'on' ? 'flash' : 'flash-off'}
                  size={28}
                  color="#ffffff"
                />
                <Text style={styles.iconButtonText}>
                  {flashMode === 'on' ? 'Flash On' : 'Flash Off'}
                </Text>
              </TouchableOpacity>

              {scanned && (
                <TouchableOpacity style={styles.iconButton} onPress={resetScanner}>
                  <Ionicons name="refresh" size={28} color="#ffffff" />
                  <Text style={styles.iconButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                <Ionicons name="close-circle" size={28} color="#ffffff" />
                <Text style={styles.iconButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'space-between',
  },
  topSection: {
    padding: 16,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: '#ffffff33',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  modeButtonTextActive: {
    fontWeight: '600',
  },
  scanArea: {
    alignSelf: 'center',
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 2,
    borderColor: '#ffffffcc',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000b3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  bottomSection: {
    padding: 16,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 8,
  },
  iconButton: {
    alignItems: 'center',
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});