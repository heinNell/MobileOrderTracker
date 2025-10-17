import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ErrorBoundary from "../components/ErrorBoundary";
import LogoutButton from "../components/LogoutButton";
import { QRCodeScanner } from "../components/QRCodeScanner";

// Define colors constant to fix ESLint warnings
const colors = {
  primary: '#2563eb',
  white: '#fff',
  slate: {
    400: '#64748b',
    900: '#0f172a',
  },
};

const storage = Platform.OS === 'web' 
  ? {
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
    }
  : require('@react-native-async-storage/async-storage').default;

export default function ScannerScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  const handleScanSuccess = async (order) => {
    console.log("✅ Scan successful:", order);
    setScanning(false);
    try {
      // Store as active order
      await storage.setItem('activeOrderId', order.id);
      
      // Initialize LocationService and start tracking
      const LocationService = require("../services/LocationService").default;
      const locationService = new LocationService();
      
      // Initialize the service to detect current order
      await locationService.initialize();
      
      // Start tracking for this order
      await locationService.startTracking(order.id);
      
      console.log("📍 Location tracking started for order:", order.order_number);
      
      router.push(`/(tabs)/${order.id}`);
    } catch (error) {
      console.error("❌ Error setting active order:", error);
      Alert.alert("Error", "Failed to activate order. Please try again.");
    }
  };

  const handleScanError = (error) => {
    console.error("❌ Scan error:", error);
    setScanning(false);
  };

  const handleClose = () => setScanning(false);
  const startScanning = () => setScanning(true);

  return (
    <View style={styles.container}>
      {scanning ? (
        <ErrorBoundary 
          fallbackMessage="The camera component encountered an error. Please check camera permissions and try again."
          onError={handleClose}
        >
          <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            onClose={handleClose}
          />
        </ErrorBoundary>
      ) : (
        <View style={styles.centered}>
          <MaterialIcons name="qr-code-scanner" size={80} color={colors.primary} />
          <Text style={styles.title}>QR Scanner</Text>
          <Text style={styles.subtitle}>
            Scan the QR code from the dashboard to authenticate and activate your assigned order
          </Text>

          <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
            <MaterialIcons name="qr-code-scanner" size={24} color={colors.white} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Start Scanning</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <MaterialIcons name="info-outline" size={20} color={colors.slate[400]} />
              <Text style={styles.infoText}>Point camera at a valid order QR code</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="timer" size={20} color={colors.slate[400]} />
              <Text style={styles.infoText}>QR codes expire after 24 hours</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.slate[400]} />
              <Text style={styles.infoText}>Supports both simple and secure QR codes</Text>
            </View>
          </View>

          <View style={styles.logoutContainer}>
            <LogoutButton 
              variant="minimal"
              size="small"
              showText={true}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginTop: 20, 
    marginBottom: 12, 
    color: colors.slate[900] 
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.slate[400], 
    textAlign: "center", 
    marginBottom: 40, 
    paddingHorizontal: 20 
  },
  scanButton: {
    backgroundColor: colors.primary, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    paddingVertical: 18, 
    paddingHorizontal: 32, 
    minHeight: 56, // Larger touch target for primary action
    borderRadius: 12, 
    marginVertical: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: { 
    color: colors.white, 
    fontSize: 18, 
    fontWeight: "600" 
  },
  buttonIcon: { 
    marginRight: 10 
  },
  infoContainer: { 
    marginTop: 40, 
    width: "100%", 
    maxWidth: 350 
  },
  infoItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20, // Increased spacing for comfort
    paddingHorizontal: 10 
  },
  infoText: { 
    fontSize: 14, 
    color: colors.slate[400], 
    marginLeft: 12, 
    flex: 1 
  },
  logoutContainer: {
    marginTop: 40,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
