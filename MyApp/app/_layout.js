import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout() {
  useEffect(() => {
    // Prevent Safari double-click zoom & suppress noisy gesture warnings
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("dblclick", (e) => e.preventDefault());
      if (__DEV__) {
        const originalWarn = console.warn;
        console.warn = (message, ...args) => {
          if (
            typeof message === "string" &&
            message.includes("Cannot record touch end without a touch start")
          ) {
            return;
          }
          originalWarn(message, ...args);
        };
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
