import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import * as Location from 'expo-location';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Notifications from 'expo-notifications';

// Create a fallback for expo-network
const NetworkFallback = {
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
  getIpAddressAsync: async () => '0.0.0.0',
};

// Conditionally import expo-network
let Network: any = NetworkFallback;
if (Platform.OS !== 'web') {
  try {
    // This will be properly imported during runtime on mobile
    const ExpoNetwork = require('expo-network');
    Network = ExpoNetwork;
  } catch (e) {
    console.warn('expo-network not available, using fallback');
  }
}

// Simple stub components (move to ../components/StatusIndicators.tsx if preferred)
const StatusIndicator: React.FC<{ status: "checking" | "success" | "error" | "warning"; size?: number }> = ({ status, size = 24 }) => {
  const icons = { checking: '⏳', success: '✅', error: '❌', warning: '⚠️' };
  return <Text style={{ fontSize: size }}>{icons[status]}</Text>;
};

const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
  <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
    <View style={{ width: `${progress}%`, height: '100%', backgroundColor: color }} />
  </View>
);

const StatusBadge: React.FC<{ status: string; message: string }> = ({ status, message }) => {
  const colors = { success: '#34C759', error: '#FF3B30', warning: '#FF9500', checking: '#007AFF' };
  return (
    <View style={{ backgroundColor: colors[status], padding: 8, borderRadius: 16 }}>
      <Text style={{ color: '#fff', fontSize: 12 }}>{message}</Text>
    </View>
  );
};

interface VerificationItem {
  id: string;
  name: string;
  status: "checking" | "success" | "error" | "warning";
  message: string;
  details?: string;
  action?: () => void;
}

export default function SetupVerificationScreen() {
  const navigation = useNavigation();
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<"checking" | "success" | "error" | "warning">("checking");
  const [progress, setProgress] = useState(0);

  const runVerification = async () => {
    setIsRefreshing(true);
    setProgress(0);
    setOverallStatus("checking");

    const items: VerificationItem[] = [
      { id: "env-vars", name: "Environment Variables", status: "checking", message: "Checking configuration..." },
      { id: "supabase-connection", name: "Supabase Connection", status: "checking", message: "Testing database connection..." },
      { id: "authentication", name: "Authentication System", status: "checking", message: "Verifying auth configuration..." },
      { id: "database-access", name: "Database Access", status: "checking", message: "Testing table access..." },
      { id: "location-services", name: "Location Services", status: "checking", message: "Checking GPS permissions..." },
      { id: "qr-scanner", name: "QR Code Scanner", status: "checking", message: "Testing camera permissions..." },
      { id: "push-notifications", name: "Push Notifications", status: "checking", message: "Checking notification setup..." },
    ];

    setVerificationItems([...items]);

    for (let i = 0; i < items.length; i++) {
      const currentProgress = ((i + 1) / items.length) * 100;
      setProgress(currentProgress);

      try {
        switch (items[i].id) {
          case "env-vars":
            await checkEnvironmentVariables(items, i);
            break;
          case "supabase-connection":
            await checkSupabaseConnection(items, i);
            break;
          case "authentication":
            await checkAuthentication(items, i);
            break;
          case "database-access":
            await checkDatabaseAccess(items, i);
            break;
          case "location-services":
            await checkLocationServices(items, i);
            break;
          case "qr-scanner":
            await checkQRScanner(items, i);
            break;
          case "push-notifications":
            await checkPushNotifications(items, i);
            break;
        }
      } catch (error: any) {
        items[i].status = "error";
        items[i].message = `Error: ${error.message}`;
        items[i].details = error.stack || error.toString();
      }

      setVerificationItems([...items]);
      await new Promise((resolve) => setTimeout(resolve, 500)); // UX delay
    }

    const hasErrors = items.some((item) => item.status === "error");
    const hasWarnings = items.some((item) => item.status === "warning");
    setOverallStatus(hasErrors ? "error" : hasWarnings ? "warning" : "success");

    setIsRefreshing(false);
  };

  const checkEnvironmentVariables = async (items: VerificationItem[], index: number) => {
    const requiredVars = [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
    ];
    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length === 0) {
      items[index].status = "success";
      items[index].message = "All environment variables configured";
      items[index].details = `✓ ${requiredVars.length} variables found`;
    } else {
      items[index].status = "error";
      items[index].message = `Missing ${missing.length} environment variables`;
      items[index].details = `Missing: ${missing.join(", ")}`;
    }
  };

  const checkSupabaseConnection = async (items: VerificationItem[], index: number) => {
    try {
      let network;
      try {
        network = await Network.getNetworkStateAsync();
      } catch (error) {
        // If Network.getNetworkStateAsync fails, use fallback
        network = { isConnected: true, isInternetReachable: true };
      }
      
      if (!network.isConnected) {
        items[index].status = "warning";
        items[index].message = "No internet connection";
        items[index].details = "Please connect to the internet and try again";
        return;
      }

      const { data, error } = await supabase.from("tenants").select("count").limit(1);
      if (error) throw error;

      items[index].status = "success";
      items[index].message = "Connected successfully";
      items[index].details = "Database responding normally";
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Connection failed";
      items[index].details = error.message;
    }
  };

  const checkAuthentication = async (items: VerificationItem[], index: number) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        items[index].status = "success";
        items[index].message = "User authenticated";
        items[index].details = `Logged in as: ${session.user.email}`;
      } else {
        items[index].status = "warning";
        items[index].message = "Auth system available (not logged in)";
        items[index].details = "Ready for user authentication";
        items[index].action = () => Alert.alert("Authentication", "Please log in to access full features.");
      }
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Auth system error";
      items[index].details = error.message;
    }
  };

  const checkDatabaseAccess = async (items: VerificationItem[], index: number) => {
    try {
      const tables = ["orders", "users", "tenants"];
      const results = await Promise.allSettled(
        tables.map((table) => supabase.from(table).select("count").limit(1))
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;

      if (successful === tables.length) {
        items[index].status = "success";
        items[index].message = "All tables accessible";
        items[index].details = `✓ ${successful}/${tables.length} tables verified`;
      } else if (successful > 0) {
        items[index].status = "warning";
        items[index].message = "Partial database access";
        items[index].details = `✓ ${successful}/${tables.length} tables accessible`;
      } else {
        throw new Error("No tables accessible");
      }
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Database access denied";
      items[index].details = error.message || "Check permissions and RLS policies";
    }
  };

  const checkLocationServices = async (items: VerificationItem[], index: number) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        items[index].status = "success";
        items[index].message = "Location permissions granted";
        items[index].details = "GPS services ready";
      } else {
        items[index].status = "warning";
        items[index].message = "Location permissions not granted";
        items[index].details = "Permissions will be requested when needed";
        items[index].action = async () => {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          Alert.alert("Location Services", `Status: ${newStatus}`);
        };
      }
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Location services unavailable";
      items[index].details = error.message;
    }
  };

  const checkQRScanner = async (items: VerificationItem[], index: number) => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      if (status === "granted") {
        items[index].status = "success";
        items[index].message = "Camera permissions granted";
        items[index].details = "QR scanner ready";
      } else {
        items[index].status = "warning";
        items[index].message = "Camera permissions not granted";
        items[index].details = "Permissions will be requested when scanning";
        items[index].action = async () => {
          const { status: newStatus } = await BarCodeScanner.requestPermissionsAsync();
          Alert.alert("QR Scanner", `Camera permission status: ${newStatus}`);
        };
      }
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Camera unavailable";
      items[index].details = error.message;
    }
  };

  const checkPushNotifications = async (items: VerificationItem[], index: number) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        items[index].status = "success";
        items[index].message = "Push notifications enabled";
        items[index].details = "Ready for alerts";
      } else {
        items[index].status = "warning";
        items[index].message = "Push notifications not enabled";
        items[index].details = "Permissions will be requested during onboarding";
        items[index].action = async () => {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          Alert.alert("Push Notifications", `Permission status: ${newStatus}`);
        };
      }
    } catch (error: any) {
      items[index].status = "error";
      items[index].message = "Notifications unavailable";
      items[index].details = error.message;
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checking": return "#007AFF";
      case "success": return "#34C759";
      case "error": return "#FF3B30";
      case "warning": return "#FF9500";
      default: return "#8E8E93";
    }
  };

  const getOverallMessage = () => {
    switch (overallStatus) {
      case "checking": return "Running verification checks...";
      case "success": return "🎉 All systems are working correctly!";
      case "error": return "⚠️ Some issues need attention";
      case "warning": return "✋ Setup is mostly complete with minor warnings";
      default: return "Checking system status...";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={runVerification} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Setup Verification</Text>
        <Text style={[styles.overallStatus, { color: getStatusColor(overallStatus) }]}>
          {getOverallMessage()}
        </Text>
        {isRefreshing && (
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} color={getStatusColor(overallStatus)} />
            <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
          </View>
        )}
      </View>

      <View style={styles.verificationList}>
        {verificationItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.verificationItem, { borderLeftColor: getStatusColor(item.status) }]}
            onPress={item.action}
            disabled={!item.action}
          >
            <View style={styles.itemHeader}>
              <StatusIndicator status={item.status} size={20} />
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={[styles.itemMessage, { color: getStatusColor(item.status) }]}>{item.message}</Text>
                {item.details && <Text style={styles.itemDetails}>{item.details}</Text>}
              </View>
              {item.status === "checking" && <ActivityIndicator size="small" color={getStatusColor(item.status)} />}
            </View>
            {item.action && <Text style={styles.tapHint}>Tap for more info</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.refreshButton} onPress={runVerification}>
          <Text style={styles.refreshButtonText}>Run Verification Again</Text>
        </TouchableOpacity>

        {(overallStatus === "success" || overallStatus === "warning") && (
          <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate("QRScanner" as never)}>
            <Text style={styles.continueButtonText}>Continue to App</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This verification ensures all components are properly configured for optimal app performance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { padding: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  title: { fontSize: 28, fontWeight: "bold", color: "#1C1C1E", marginBottom: 8 },
  overallStatus: { fontSize: 16, fontWeight: "500" },
  progressContainer: { marginTop: 12 },
  progressText: { fontSize: 12, color: "#8E8E93", marginTop: 4, textAlign: "center" },
  verificationList: { padding: 16 },
  verificationItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  itemHeader: { flexDirection: "row", alignItems: "flex-start" },
  itemContent: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", marginBottom: 4 },
  itemMessage: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  itemDetails: { fontSize: 12, color: "#8E8E93", lineHeight: 16 },
  tapHint: { fontSize: 12, color: "#007AFF", marginTop: 8, fontStyle: "italic" },
  actions: { padding: 16, gap: 12 },
  refreshButton: { backgroundColor: "#007AFF", borderRadius: 8, padding: 16, alignItems: "center" },
  refreshButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  continueButton: { backgroundColor: "#34C759", borderRadius: 8, padding: 16, alignItems: "center" },
  continueButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  footer: { padding: 20, backgroundColor: "#FFFFFF", marginTop: 20 },
  footerText: { fontSize: 14, color: "#8E8E93", textAlign: "center", lineHeight: 20 },
});
