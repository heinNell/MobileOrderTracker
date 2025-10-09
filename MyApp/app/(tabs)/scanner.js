import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { QRCodeScanner } from "../components/QRCodeScanner";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function ScannerScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  const handleScanSuccess = (order) => {
    console.log("✅ Scan successful:", order);
    setScanning(false);
    router.push(`/order-details?orderId=${order.id}`);
  };

  const handleScanError = (error) => {
    console.error("❌ Scan error:", error);
    setScanning(false);
  };

  const handleClose = () => {
    setScanning(false);
  };

  const startScanning = () => {
    setScanning(true);
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <QRCodeScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={handleClose}
        />
      ) : (
        <View style={styles.centered}>
          <MaterialIcons name="qr-code-scanner" size={80} color="#2563eb" />
          <Text style={styles.title}>QR Scanner</Text>
          <Text style={styles.subtitle}>
            Scan QR codes to quickly access order details
          </Text>

          <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
            <MaterialIcons
              name="qr-code-scanner"
              size={24}
              color="#fff"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Start Scanning</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <MaterialIcons name="info-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>
                Point camera at a valid order QR code
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="timer" size={20} color="#64748b" />
              <Text style={styles.infoText}>
                QR codes expire after 24 hours
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="check-circle" size={20} color="#64748b" />
              <Text style={styles.infoText}>
                Supports both simple and secure QR codes
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 10,
  },
  infoContainer: {
    marginTop: 40,
    width: "100%",
    maxWidth: 350,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 12,
    flex: 1,
  },
});
