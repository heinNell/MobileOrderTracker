// Web-compatible storage solution for mobile app
import { Platform } from "react-native";

// Web storage implementation
const createWebStorage = () => {
  // Check if we're in a browser environment
  const hasWindow = typeof window !== "undefined";

  return {
    async getItem(key) {
      if (hasWindow && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      // Fallback for server-side rendering or when localStorage isn't available
      return null;
    },

    async setItem(key, value) {
      if (hasWindow && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      // Fallback - do nothing if localStorage isn't available
    },

    async removeItem(key) {
      if (hasWindow && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      // Fallback - do nothing if localStorage isn't available
    },
  };
};

// React Native storage implementation
const createNativeStorage = () => {
  // Dynamically import AsyncStorage to avoid issues during web bundling
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;

  return {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
  };
};

// Export the appropriate storage based on platform
export const storage =
  Platform.OS === "web" ? createWebStorage() : createNativeStorage();

export default storage;
