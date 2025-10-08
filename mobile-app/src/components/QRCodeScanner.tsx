// components/QRCodeScanner.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

type ScanMode = "auto" | "simple" | "complex";

interface QRCodeScannerProps {
  onScanSuccess: (order: any) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  driverId?: string;
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
  const [scanMode, setScanMode] = useState<ScanMode>("auto");
  const [torchOn, setTorchOn] = useState(false);
  const [lastScanAttempt, setLastScanAttempt] = useState("");
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    // Prevent duplicate scans
    if (scanned || loading || data === lastScanAttempt) return;

    setLastScanAttempt(data);
    setScanned(true);
    setLoading(true);

    try {
      // Call the edge function to validate the QR code
      const { data: response, error } = await supabase.functions.invoke(
        "validate-qr-code",
        {
          body: {
            qrData: data,
            driverId,
            scanMode,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!response.success) {
        throw new Error(response.error || "Failed to validate QR code");
      }

      // Call the success callback with the order data
      onScanSuccess(response.order);
    } catch (error: any) {
      // Handle expired QR codes specially
      if (error.message.includes("expired")) {
        Alert.alert(
          "QR Code Expired",
          "This QR code has expired. Please request a new one.",
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
      } else {
        // Handle other errors
        const errorMessage = error.message || "Failed to scan QR code";
        if (onScanError) {
          onScanError(errorMessage);
        } else {
          Alert.alert("Scan Error", errorMessage, [
            { text: "Try Again", onPress: () => setScanned(false) },
          ]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTorch = () => {
    setTorchOn(!torchOn);
  };

  const resetScanner = () => {
    setScanned(false);
    setLastScanAttempt("");
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
        <Ionicons name="camera-off" size={64} color="#ff0000" />
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onClose && onClose()}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={
          torchOn
            ? Camera.Constants.FlashMode.torch
            : Camera.Constants.FlashMode.off
        }
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
        }}
      >
        <View style={styles.overlay}>
          {/* Top section */}
          <View style={styles.topSection}>
            <Text style={styles.headerText}>Scan QR Code</Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  scanMode === "auto" && styles.modeButtonActive,
                ]}
                onPress={() => setScanMode("auto")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    scanMode === "auto" && styles.modeButtonTextActive,
                  ]}
                >
                  Auto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  scanMode === "simple" && styles.modeButtonActive,
                ]}
                onPress={() => setScanMode("simple")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    scanMode === "simple" && styles.modeButtonTextActive,
                  ]}
                >
                  Simple
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  scanMode === "complex" && styles.modeButtonActive,
                ]}
                onPress={() => setScanMode("complex")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    scanMode === "complex" && styles.modeButtonTextActive,
                  ]}
                >
                  Complex
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scan area */}
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

          {/* Bottom section */}
          <View style={styles.bottomSection}>
            <Text style={styles.instructionText}>
              {scanMode === "auto"
                ? "Automatically detects QR code type"
                : scanMode === "simple"
                ? "Simple mode for basic QR codes"
                : "Complex mode for secure QR codes"}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleTorch}>
                <Ionicons
                  name={torchOn ? "flash" : "flash-off"}
                  size={28}
                  color="#ffffff"
                />
                <Text style={styles.iconButtonText}>
                  {torchOn ? "Flash On" : "Flash Off"}
                </Text>
              </TouchableOpacity>

              {scanned && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={resetScanner}
                >
                  <Ionicons name="refresh" size={28} color="#ffffff" />
                  <Text style={styles.iconButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => onClose && onClose()}
              >
                <Ionicons name="close-circle" size={28} color="#ffffff" />
                <Text style={styles.iconButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "space-between",
  },
  topSection: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 5,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: "#2196F3",
  },
  modeButtonText: {
    color: "#ccc",
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2196F3",
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2196F3",
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2196F3",
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2196F3",
  },
  loadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  bottomSection: {
    padding: 20,
    alignItems: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    padding: 10,
  },
  iconButtonText: {
    color: "#fff",
    marginTop: 5,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
  },
});
