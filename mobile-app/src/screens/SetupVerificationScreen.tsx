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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import {
  StatusIndicator,
  ProgressBar,
  StatusBadge,
} from "../components/StatusIndicators";

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
  const [verificationItems, setVerificationItems] = useState<
    VerificationItem[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<
    "checking" | "success" | "error" | "warning"
  >("checking");
  const [progress, setProgress] = useState(0);

  const runVerification = async () => {
    setIsRefreshing(true);
    const items: VerificationItem[] = [
      {
        id: "env-vars",
        name: "Environment Variables",
        status: "checking",
        message: "Checking configuration...",
      },
      {
        id: "supabase-connection",
        name: "Supabase Connection",
        status: "checking",
        message: "Testing database connection...",
      },
      {
        id: "authentication",
        name: "Authentication System",
        status: "checking",
        message: "Verifying auth configuration...",
      },
      {
        id: "database-access",
        name: "Database Access",
        status: "checking",
        message: "Testing table access...",
      },
      {
        id: "location-services",
        name: "Location Services",
        status: "checking",
        message: "Checking GPS permissions...",
      },
      {
        id: "qr-scanner",
        name: "QR Code Scanner",
        status: "checking",
        message: "Testing camera permissions...",
      },
      {
        id: "push-notifications",
        name: "Push Notifications",
        status: "checking",
        message: "Checking notification setup...",
      },
    ];

    setVerificationItems([...items]);

    // Run verification checks
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
      } catch (error) {
        items[i].status = "error";
        items[i].message = `Error: ${error.message}`;
        items[i].details = error.stack;
      }

      setVerificationItems([...items]);
      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Determine overall status
    const hasErrors = items.some((item) => item.status === "error");
    const hasWarnings = items.some((item) => item.status === "warning");

    if (hasErrors) {
      setOverallStatus("error");
    } else if (hasWarnings) {
      setOverallStatus("warning");
    } else {
      setOverallStatus("success");
    }

    setIsRefreshing(false);
  };

  const checkEnvironmentVariables = async (
    items: VerificationItem[],
    index: number
  ) => {
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

  const checkSupabaseConnection = async (
    items: VerificationItem[],
    index: number
  ) => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("count")
        .limit(1);

      if (error) {
        items[index].status = "error";
        items[index].message = "Connection failed";
        items[index].details = error.message;
      } else {
        items[index].status = "success";
        items[index].message = "Connected successfully";
        items[index].details = "Database responding normally";
      }
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Network error";
      items[index].details = error.message;
    }
  };

  const checkAuthentication = async (
    items: VerificationItem[],
    index: number
  ) => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        items[index].status = "warning";
        items[index].message = "Auth system available (not logged in)";
        items[index].details = "Ready for user authentication";
      } else if (session) {
        items[index].status = "success";
        items[index].message = "User authenticated";
        items[index].details = `Logged in as: ${session.user.email}`;
      } else {
        items[index].status = "warning";
        items[index].message = "Auth system available (not logged in)";
        items[index].details = "Ready for user authentication";
      }
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Auth system error";
      items[index].details = error.message;
    }
  };

  const checkDatabaseAccess = async (
    items: VerificationItem[],
    index: number
  ) => {
    try {
      const tables = ["orders", "users", "tenants"];
      const results = await Promise.allSettled(
        tables.map((table) => supabase.from(table).select("count").limit(1))
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;

      if (successful === tables.length) {
        items[index].status = "success";
        items[index].message = "All tables accessible";
        items[
          index
        ].details = `✓ ${successful}/${tables.length} tables verified`;
      } else if (successful > 0) {
        items[index].status = "warning";
        items[index].message = "Partial database access";
        items[
          index
        ].details = `✓ ${successful}/${tables.length} tables accessible`;
      } else {
        items[index].status = "error";
        items[index].message = "Database access denied";
        items[index].details = "Check permissions and RLS policies";
      }
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Database query failed";
      items[index].details = error.message;
    }
  };

  const checkLocationServices = async (
    items: VerificationItem[],
    index: number
  ) => {
    try {
      // Mock location services check - in real app, use expo-location
      items[index].status = "warning";
      items[index].message = "Location permissions not requested";
      items[index].details = "Permissions will be requested when needed";
      items[index].action = () => {
        Alert.alert(
          "Location Services",
          "Location permissions will be requested when you use location-based features like GPS tracking."
        );
      };
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Location services unavailable";
      items[index].details = error.message;
    }
  };

  const checkQRScanner = async (items: VerificationItem[], index: number) => {
    try {
      // Mock QR scanner check - in real app, use expo-camera
      items[index].status = "warning";
      items[index].message = "Camera permissions not requested";
      items[index].details =
        "Permissions will be requested when scanning QR codes";
      items[index].action = () => {
        Alert.alert(
          "QR Code Scanner",
          "Camera permissions will be requested when you scan QR codes for order verification."
        );
      };
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Camera unavailable";
      items[index].details = error.message;
    }
  };

  const checkPushNotifications = async (
    items: VerificationItem[],
    index: number
  ) => {
    try {
      // Mock push notifications check - in real app, use expo-notifications
      items[index].status = "warning";
      items[index].message = "Push notifications not configured";
      items[index].details = "Will be set up during onboarding";
      items[index].action = () => {
        Alert.alert(
          "Push Notifications",
          "Push notifications help you stay updated with order status changes and important alerts."
        );
      };
    } catch (error) {
      items[index].status = "error";
      items[index].message = "Notifications unavailable";
      items[index].details = error.message;
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "checking":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checking":
        return "#007AFF";
      case "success":
        return "#34C759";
      case "error":
        return "#FF3B30";
      case "warning":
        return "#FF9500";
      default:
        return "#8E8E93";
    }
  };

  const getOverallMessage = () => {
    switch (overallStatus) {
      case "checking":
        return "Running verification checks...";
      case "success":
        return "🎉 All systems are working correctly!";
      case "error":
        return "⚠️ Some issues need attention";
      case "warning":
        return "✋ Setup is mostly complete with minor warnings";
      default:
        return "Checking system status...";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={runVerification} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Setup Verification</Text>
        <Text
          style={[
            styles.overallStatus,
            { color: getStatusColor(overallStatus) },
          ]}
        >
          {getOverallMessage()}
        </Text>
        {isRefreshing && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color={getStatusColor(overallStatus)}
            />
            <Text style={styles.progressText}>
              {Math.round(progress)}% Complete
            </Text>
          </View>
        )}
      </View>

      <View style={styles.verificationList}>
        {verificationItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.verificationItem,
              { borderLeftColor: getStatusColor(item.status) },
            ]}
            onPress={item.action}
            disabled={!item.action}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemIcon}>{getStatusIcon(item.status)}</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text
                  style={[
                    styles.itemMessage,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.message}
                </Text>
                {item.details && (
                  <Text style={styles.itemDetails}>{item.details}</Text>
                )}
              </View>
              {item.status === "checking" && (
                <ActivityIndicator
                  size="small"
                  color={getStatusColor(item.status)}
                />
              )}
            </View>
            {item.action && (
              <Text style={styles.tapHint}>Tap for more info</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={runVerification}
        >
          <Text style={styles.refreshButtonText}>Run Verification Again</Text>
        </TouchableOpacity>

        {overallStatus === "success" && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate("QRScanner" as never)}
          >
            <Text style={styles.continueButtonText}>Continue to App</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This verification ensures all components are properly configured for
          optimal app performance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  overallStatus: {
    fontSize: 16,
    fontWeight: "500",
  },
  verificationList: {
    padding: 16,
  },
  verificationItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    boxShadow: "0px 2px 3.84px rgba(0, 0, 0, 0.1)",
    elevation: 5,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  itemMessage: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
  },
  tapHint: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 8,
    fontStyle: "italic",
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
});
