// Debug test to verify app functionality
import { Platform } from 'react-native';

console.log('🔍 Debug Test Running...');
console.log('Platform.OS:', Platform.OS);
console.log('Environment variables:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Test AsyncStorage
try {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  console.log('✅ AsyncStorage loaded successfully');
} catch (error) {
  console.error('❌ AsyncStorage failed to load:', error);
}

// Test Supabase
try {
  const { supabase } = require('./app/lib/supabase');
  console.log('✅ Supabase loaded successfully');
} catch (error) {
  console.error('❌ Supabase failed to load:', error);
}

// Test AuthContext
try {
  const { AuthProvider, useAuth } = require('./app/context/AuthContext');
  console.log('✅ AuthContext loaded successfully');
} catch (error) {
  console.error('❌ AuthContext failed to load:', error);
}

export default function DebugTest() {
  return null;
}