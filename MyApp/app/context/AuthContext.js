import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check active sessions
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
        } else {
          setUser(null);
          setIsAuthenticated(false);
          await AsyncStorage.removeItem('supabase.auth.token');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        console.log('✅ User authenticated:', session.user.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('❌ No active session');
      }
    } catch (error) {
      console.error('❌ Error checking user:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ Sign in successful:', data.user.email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async function signOut() {
    try {
      console.log('🔄 Starting sign out process...');
      
      // Clean up location services before signing out
      try {
        const LocationService = require('../services/LocationService').default;
        const locationService = new LocationService();
        await locationService.cleanup();
        console.log('✅ Location service cleanup completed');
      } catch (locationError) {
        console.warn('⚠️ Location cleanup error:', locationError);
      }

      // Clear local state first (to immediately update UI)
      setUser(null);
      setIsAuthenticated(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        // Continue with cleanup even if Supabase signOut fails
      }

      // Clear local storage
      await AsyncStorage.multiRemove([
        'supabase.auth.token',
        'trackingOrderId',
        'orderStartingPoint',
        'lastKnownLocation'
      ]);
      
      console.log('✅ Sign out successful with full cleanup');
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Ensure state is cleared even on error
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: error.message };
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    checkUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export for expo-router compatibility (this should not be used as a route)
export default function NotARoute() {
  return null; // This prevents the file from being used as a route
}