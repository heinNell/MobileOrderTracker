import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('❌ Error checking auth state:', error);
      } else if (session?.user) {
        // Get user profile with role from database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.log('❌ Error fetching user profile:', profileError);
        } else {
          setUser(profile);
          setIsAuthenticated(true);
          console.log('✅ Found existing session for:', profile.email, 'Role:', profile.role);
        }
      }
    } catch (error) {
      console.log('❌ Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Supabase authentication with role checking
  const login = async ({ email, password }) => {
    try {
      setLoading(true);
      
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log('❌ Login error:', authError.message);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'No user data returned' };
      }

      // Get user profile with role from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log('❌ Error fetching user profile:', profileError);
        return { success: false, error: 'Failed to fetch user profile' };
      }

      // Store user data
      await AsyncStorage.setItem('userData', JSON.stringify(profile));
      
      setUser(profile);
      setIsAuthenticated(true);
      
      console.log('✅ Login successful:', profile.email, 'Role:', profile.role);
      return { success: true, user: profile };
      
    } catch (error) {
      console.log('❌ Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.log('❌ Sign out error:', error);
      }
      
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
      console.log('🚪 User signed out.');
    } catch (error) {
      console.log('❌ Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ login, signOut, user, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
