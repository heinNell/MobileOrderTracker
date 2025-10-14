// Debug test to verify app functionality
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './app/lib/supabase';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { useEffect } from 'react';

// Separate component for Auth testing to properly use hooks
function AuthTester() {
  const auth = useAuth();
  
  useEffect(() => {
    console.log('✅ Auth context test: PASSED', auth);
  }, [auth]);

  return null;
}

// Main debug component
export default function DebugTest() {
  useEffect(() => {
    async function runTests() {
      console.log('🔍 Debug Test Running...');
      
      // Platform Test
      console.log('Platform.OS:', Platform.OS);
      
      // Environment Variables Test
      console.log('Environment variables:');
      console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

      // AsyncStorage Test
      try {
        await AsyncStorage.setItem('debug_test', 'working');
        const value = await AsyncStorage.getItem('debug_test');
        console.log('✅ AsyncStorage test:', value === 'working' ? 'PASSED' : 'FAILED');
        await AsyncStorage.removeItem('debug_test');
      } catch (error) {
        console.error('❌ AsyncStorage test failed:', error);
      }

      // Supabase Test
      try {
        const { error } = await supabase.auth.getSession();
        console.log('✅ Supabase connection test:', error ? 'FAILED' : 'PASSED');
        if (error) console.error('Supabase error:', error.message);
      } catch (error) {
        console.error('❌ Supabase test failed:', error);
      }
    }

    runTests();
  }, []);

  return (
    <AuthProvider>
      <AuthTester />
    </AuthProvider>
  );
}
