// app/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s";

// Create a safe storage implementation
const createSafeStorage = () => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // For server-side rendering, provide a memory storage
  if (!isBrowser && Platform.OS !== "ios" && Platform.OS !== "android") {
    const memoryStorage = {};
    return {
      getItem: async (key) => memoryStorage[key] || null,
      setItem: async (key, value) => {
        memoryStorage[key] = value;
      },
      removeItem: async (key) => {
        delete memoryStorage[key];
      },
    };
  }

  // For web
  if (Platform.OS === "web") {
    return {
      getItem: async (key) => window.localStorage.getItem(key),
      setItem: async (key, value) => window.localStorage.setItem(key, value),
      removeItem: async (key) => window.localStorage.removeItem(key),
    };
  }

  // For React Native
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    return AsyncStorage;
  } catch (error) {
    console.warn("AsyncStorage not available, using memory storage");
    const memoryStorage = {};
    return {
      getItem: async (key) => memoryStorage[key] || null,
      setItem: async (key, value) => {
        memoryStorage[key] = value;
      },
      removeItem: async (key) => {
        delete memoryStorage[key];
      },
    };
  }
};

// Create supabase client lazily
let supabaseInstance = null;

export const getSupabase = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const storage = createSafeStorage();

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
};

// Create a proxy for backward compatibility
export const supabase =
  typeof window !== "undefined"
    ? getSupabase()
    : new Proxy(
        {},
        {
          get: (target, prop) => {
            // Special case for Promise-like behavior
            if (prop === "then" || prop === "catch" || prop === "finally") {
              return undefined;
            }

            // Return a function that gets the supabase instance and calls the method
            return (...args) => {
              const client = getSupabase();
              const value = client[prop];

              if (typeof value === "function") {
                return value.apply(client, args);
              }

              return value;
            };
          },
        }
      );
