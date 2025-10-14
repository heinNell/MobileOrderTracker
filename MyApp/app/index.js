// app/index.js
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from './context/AuthContext';

// Color palette
const colors = {
  primary: '#3b82f6',
  gray100: '#f3f4f6',
  gray500: '#6b7280',
};

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();

  console.log('🔍 Index.js - Auth state:', { 
    isAuthenticated, 
    loading, 
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('🔍 Index.js - Showing loading screen');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Redirect to appropriate screen based on auth state
  if (isAuthenticated && user) {
    console.log('🔍 Redirecting to tabs (authenticated user):', user.email);
    return <Redirect href="/(tabs)" />;
  } else {
    console.log('🔍 Redirecting to login (not authenticated)');
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray500,
  },
});