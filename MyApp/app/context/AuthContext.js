import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authListenerRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    // Check active sessions
    checkUser();

    // Listen for auth changes with debouncing
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event, 'Session exists:', !!session);
        
        // Prevent unnecessary updates during initialization
        if (event === 'INITIAL_SESSION') {
          console.log('🔍 Initial session detected, handled by checkUser()');
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
          console.log('✅ User authenticated via listener:', session.user.email);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          await AsyncStorage.removeItem('supabase.auth.token');
          console.log('❌ User signed out via listener');
        }
        setLoading(false);
      }
    );

    authListenerRef.current = authListener;

    return () => {
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
    };
  }, []);

  async function checkUser() {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        throw error;
      }
      
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        console.log('✅ User authenticated on app start:', session.user.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('❌ No active session on app start');
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
      console.log('🔄 Signing in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      console.log('✅ Sign in successful:', data.user.email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async function signOut() {
    try {
      console.log('🔄 Starting centralized sign out process...');
      
      // Prevent multiple simultaneous sign-outs
      if (loading) {
        console.log('⚠️ Sign out already in progress, skipping...');
        return { success: true };
      }

      setLoading(true);
      
      // Clean up location services before signing out
      try {
        const LocationServiceModule = await import('../services/LocationService');
        const LocationService = LocationServiceModule.default;
        const locationService = new LocationService();
        await locationService.cleanup();
        console.log('✅ Location service cleanup completed');
      } catch (locationError) {
        console.warn('⚠️ Location cleanup error:', locationError);
      }

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        throw error;
      }

      // Clear local storage
      await AsyncStorage.multiRemove([
        'supabase.auth.token',
        'trackingOrderId',
        'orderStartingPoint',
        'lastKnownLocation',
        'activeOrderId'
      ]);

      // Clear local state (auth listener will handle the rest)
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Sign out successful with full cleanup');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Ensure state is cleared even on error
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
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

export default function AuthContextComponent() {
  return null;
}