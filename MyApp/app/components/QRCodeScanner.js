import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera"; // ✅ Fixed import
import { useEffect, useMemo, useState } from "react";
import
  {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
import { supabase } from "../lib/supabase";
import { useResponsive } from "../utils/responsive";

// Color palette
const colors = {
  white: "#fff",
  primary: "#2563eb",
  gray600: "#6b7280",
  gray700: "#374151",
  transparent: "transparent",
  overlay: "rgba(0,0,0,0.7)",
};

export function QRCodeScanner({ onScanSuccess, onScanError, onClose }) {
  const [permission, requestPermission] = useCameraPermissions(); // ✅ Now properly imported
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Responsive utilities - dynamically updates on orientation change
  const { width, height, isTablet } = useResponsive();

  // Calculate scan area size - updates when screen dimensions change
  const scanAreaSize = useMemo(() => {
    const maxSize = isTablet ? 500 : 350;
    const smallerDimension = Math.min(width, height);
    const calculatedSize = Math.min(smallerDimension * 0.65, maxSize);
    return calculatedSize;
  }, [width, height, isTablet]);

  useEffect(() => {
    console.log('📷 Camera permission status:', permission);
    if (!permission) {
      console.log('📷 Requesting camera permission...');
      requestPermission();
    } else if (permission.granted) {
      console.log('✅ Camera permission granted');
    } else {
      console.log('❌ Camera permission denied');
    }
  }, [permission, requestPermission]);

  const validateQRCode = async (qrData) => {
    // Try to parse as JSON first (for complex QR codes)
    let orderId;
    let timestamp;

    try {
      const parsed = JSON.parse(atob(qrData));
      orderId = parsed.orderId || parsed.order_id || parsed.id;
      timestamp = parsed.timestamp;

      // Check expiration if timestamp exists
      if (timestamp) {
        const expirationTime = timestamp + 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() > expirationTime) {
          throw new Error("QR code has expired");
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, assume it's a simple orderId
      orderId = qrData;
    }

    if (!orderId) {
      throw new Error("Invalid QR code format");
    }

    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(orderId)) {
      throw new Error(`Invalid order ID format: ${orderId}. Expected UUID format.`);
    }

    // Fetch order from database
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) throw error;

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      console.log("📷 QR Code scanned:", data);

      // Validate and fetch order
      const order = await validateQRCode(data);

      console.log("✅ Order found:", order.order_number);

      // Success!
      onScanSuccess(order);
    } catch (error) {
      console.error("❌ QR scan error:", error);

      const errorMessage = error.message || "Failed to process QR code";

      Alert.alert("Scan Error", errorMessage, [
        {
          text: "Try Again",
          onPress: () => {
            setScanned(false);
            setLoading(false);
          },
        },
        {
          text: "Cancel",
          onPress: () => {
            setScanned(false);
            setLoading(false);
            if (onClose) onClose();
          },
          style: "cancel",
        },
      ]);

      if (onScanError) {
        onScanError(error);
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
    setLoading(false);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="camera-alt" size={64} color="#9ca3af" />
        <Text style={styles.permissionText}>
          Camera permission is required to scan QR codes
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('🎥 Rendering CameraView with permission:', permission?.granted);
  
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onCameraReady={() => console.log('📷 Camera is ready!')}
        onMountError={(error) => console.error('❌ Camera mount error:', error)}
      >
        <View style={styles.overlay}>
          {/* Top Section */}
          <View style={styles.topOverlay}>
            <View style={styles.topControls}>
              <Text style={styles.title}>Scan QR Code</Text>
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={onClose}
              >
                <MaterialIcons name="close" size={32} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Middle Section - Scan Area */}
          <View style={styles.middleOverlay}>
            <View style={[styles.scanArea, { width: scanAreaSize, height: scanAreaSize }]}>
              {/* Corner Markers */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Loading Indicator */}
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.white} />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomOverlay}>
            <Text style={styles.instructionText}>
              {loading
                ? "Validating QR code..."
                : scanned
                ? "QR code scanned!"
                : "Align QR code within the frame"}
            </Text>

            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleTorch}
              >
                <MaterialIcons
                  name={torchOn ? "flash-on" : "flash-off"}
                  size={28}
                  color={colors.white}
                />
                <Text style={styles.controlButtonText}>
                  {torchOn ? "Flash On" : "Flash Off"}
                </Text>
              </TouchableOpacity>

              {scanned && !loading && (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={resetScanner}
                >
                  <MaterialIcons name="refresh" size={28} color={colors.white} />
                  <Text style={styles.controlButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// ... rest of your styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
  },
  permissionText: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: colors.gray600,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  closeIconButton: {
    padding: 8,
  },
  middleOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    // width and height set dynamically via inline styles
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: colors.primary,
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
  loadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  instructionText: {
    color: colors.white,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "500",
  },
  controlButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 300,
  },
  controlButton: {
    alignItems: "center",
    padding: 10,
  },
  controlButtonText: {
    color: colors.white,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
});

// Default export for expo-router compatibility (this should not be used as a route)
export default function NotARoute() {
  return null; // This prevents the component from being used as a route
}
