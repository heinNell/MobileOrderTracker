// components/QRCodeScanner.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  BackHandler,
} from "react-native";
import { CameraView, Camera, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

type ScanMode = "auto" | "simple" | "complex";
type FlashMode = "off" | "on" | "auto" | "torch";

interface QRCodeScannerProps {
  onScanSuccess: (order: any) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  driverId?: string;
}

interface ScanAttempt {
  data: string;
  timestamp: number;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  driverId,
}) => {
  // State management
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("auto");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [lastScanAttempt, setLastScanAttempt] = useState<ScanAttempt | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const SCAN_COOLDOWN = 2000; // 2 seconds cooldown between scans
  const SCAN_TIMEOUT = 30000; // 30 seconds timeout for processing

  // Request camera permissions
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      } catch (error) {
        console.error("Error requesting camera permissions:", error);
        setHasPermission(false);
      }
    };

    requestPermissions();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setIsActive(nextAppState === "active");
    };

    // Note: You might want to add AppState listener here if needed
    return () => {
      setIsActive(false);
    };
  }, []);

  // Optimized barcode scan handler
  const handleBarcodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      const { type, data } = scanningResult;

      // Prevent scanning if component is not active or already processing
      if (!isActive || scanned || loading) return;

      // Check for duplicate scans within cooldown period
      const now = Date.now();
      if (
        lastScanAttempt &&
        lastScanAttempt.data === data &&
        now - lastScanAttempt.timestamp < SCAN_COOLDOWN
      ) {
        return;
      }

      // Validate QR code data
      if (!data || data.trim().length === 0) {
        Alert.alert("Invalid QR Code", "The scanned QR code appears to be empty.");
        return;
      }

      // Update scan attempt tracking
      setLastScanAttempt({ data, timestamp: now });
      setScanned(true);
      setLoading(true);

      // Set timeout for scan processing
      scanTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setScanned(false);
        Alert.alert(
          "Scan Timeout",
          "The scan is taking too long. Please try again.",
          [{ text: "OK", onPress: resetScanner }]
        );
      }, SCAN_TIMEOUT);

      try {
        // Call the edge function to validate the QR code
        const { data: response, error } = await supabase.functions.invoke(
          "validate-qr-code",
          {
            body: {
              qrData: data,
              driverId,
              scanMode,
              scanType: type,
              timestamp: now,
            },
          }
        );

        // Clear timeout on successful response
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }

        if (error) {
          throw new Error(error.message || "Network error occurred");
        }

        if (!response || !response.success) {
          throw new Error(response?.error || "Failed to validate QR code");
        }

        // Success - call the callback with order data
        onScanSuccess(response.order);
      } catch (error: any) {
        console.error("QR Code scan error:", error);

        // Clear timeout on error
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }

        // Handle specific error types
        const errorMessage = error.message || "Unknown error occurred";

        if (errorMessage.toLowerCase().includes("expired")) {
          Alert.alert(
            "QR Code Expired",
            "This QR code has expired. Please request a new one from the customer.",
            [{ text: "OK", onPress: resetScanner }]
          );
        } else if (errorMessage.toLowerCase().includes("network")) {
          Alert.alert(
            "Network Error",
            "Unable to connect to the server. Please check your internet connection.",
            [
              { text: "Retry", onPress: resetScanner },
              { text: "Cancel", onPress: onClose },
            ]
          );
        } else if (errorMessage.toLowerCase().includes("invalid")) {
          Alert.alert(
            "Invalid QR Code",
            "This QR code is not valid for this application.",
            [{ text: "OK", onPress: resetScanner }]
          );
        } else {
          // Generic error handling
          if (onScanError) {
            onScanError(errorMessage);
          } else {
            Alert.alert(
              "Scan Error",
              errorMessage,
              [
                { text: "Try Again", onPress: resetScanner },
                { text: "Cancel", onPress: onClose },
              ]
            );
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [isActive, scanned, loading, lastScanAttempt, driverId, scanMode, onScanSuccess, onScanError, onClose]
  );

  // Toggle flash/torch
  const toggleFlash = useCallback(() => {
    setFlashMode((prev) => {
      switch (prev) {
        case "off":
          return "torch";
        case "torch":
          return "off";
        default:
          return "off";
      }
    });
  }, []);

  // Reset scanner state
  const resetScanner = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setScanned(false);
    setLoading(false);
    setLastScanAttempt(null);
  }, []);

  // Change scan mode
  const changeScanMode = useCallback((mode: ScanMode) => {
    setScanMode(mode);
    resetScanner(); // Reset when changing modes
  }, [resetScanner]);

  // Render permission loading state
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Render permission denied state
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Ionicons name="camera-outline" size={64} color="#ff0000" />
        <Text style={styles.text}>Camera access is required to scan QR codes</Text>
        <Text style={styles.subText}>
          Please enable camera permissions in your device settings
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashMode}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
          {/* Top section */}
          <View style={styles.topSection}>
            <Text style={styles.headerText}>Scan QR Code</Text>
            <View style={styles.modeSelector}>
              {(["auto", "simple", "complex"] as ScanMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    scanMode === mode && styles.modeButtonActive,
                  ]}
                  onPress={() => changeScanMode(mode)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      scanMode === mode && styles.modeButtonTextActive,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Scan area */}
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              
              {/* Scanning animation line */}
              {!scanned && !loading && (
                <View style={styles.scanLine} />
              )}
              
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>Processing QR Code...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom section */}
          <View style={styles.bottomSection}>
            <Text style={styles.instructionText}>
              {loading
                ? "Processing QR code..."
                : scanned
                ? "QR code detected"
                : scanMode === "auto"
                ? "Point camera at QR code - Auto detection enabled"
                : scanMode === "simple"
                ? "Simple mode - Basic QR codes only"
                : "Complex mode - Secure QR codes"}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.iconButton, loading && styles.iconButtonDisabled]}
                onPress={toggleFlash}
                disabled={loading}
              >
                <Ionicons
                  name={flashMode === "torch" ? "flash" : "flash-off"}
                  size={28}
                  color={loading ? "#666" : "#ffffff"}
                />
                <Text style={[styles.iconButtonText, loading && styles.iconButtonTextDisabled]}>
                  {flashMode === "torch" ? "Flash On" : "Flash Off"}
                </Text>
              </TouchableOpacity>

              {scanned && (
                <TouchableOpacity
                  style={[styles.iconButton, loading && styles.iconButtonDisabled]}
                  onPress={resetScanner}
                  disabled={loading}
                >
                  <Ionicons 
                    name="refresh" 
                    size={28} 
                    color={loading ? "#666" : "#ffffff"} 
                  />
                  <Text style={[styles.iconButtonText, loading && styles.iconButtonTextDisabled]}>
                    Scan Again
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.iconButton}
                onPress={onClose}
              >
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
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
  topSection: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#2196F3",
  },
  modeButtonText: {
    color: "#ccc",
    fontWeight: "600",
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2196F3",
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2196F3",
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2196F3",
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2196F3",
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    width: "80%",
    height: 2,
    backgroundColor: "#2196F3",
    opacity: 0.8,
  },
  loadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 12,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    alignItems: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 300,
  },
  iconButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  iconButtonText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  iconButtonTextDisabled: {
    color: "#666",
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    color: "#fff",
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  subText: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
