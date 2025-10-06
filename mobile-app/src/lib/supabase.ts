// Supabase client configuration for mobile app
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://liagltqpeilbswuqcahp.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
