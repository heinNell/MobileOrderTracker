import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout() {
  useEffect(() => {
    let originalWarn;
    const handleDoubleClick = (e) => e.preventDefault();

    if (Platform.OS === "web" && typeof document !== "undefined") {
      // Add double-click prevention
      document.addEventListener("dblclick", handleDoubleClick);
      
      // Suppress development warnings
      if (__DEV__) {
        originalWarn = console.warn;
        console.warn = (message, ...args) => {
          if (typeof message === "string") {
            const suppressedWarnings = [
              "Cannot record touch end without a touch start",
              "pointerEvents is deprecated",
              "VirtualizedLists should never be nested",
            ];
            if (suppressedWarnings.some(warning => message.includes(warning))) {
              return; // Suppress these warnings
            }
          }
          originalWarn(message, ...args);
        };
      }
    }

    // Cleanup function
    return () => {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("dblclick", handleDoubleClick);
        
        // Restore original console.warn if it was modified
        if (originalWarn && __DEV__) {
          console.warn = originalWarn;
        }
      }
    };
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
