// app/index.js
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from './context/AuthContext';
import { Redirect } from 'expo-router';

const colors = {
  background: '#ffffff',
  primary: '#2563eb',
  text: '#6b7280',
};

export default function HomeScreen() {
  const { user, loading, isAuthenticated } = useAuth();

  console.log('HomeScreen - User:', !!user, 'Loading:', loading, 'Authenticated:', isAuthenticated);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect based on authentication status
  if (isAuthenticated && user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/LoginScreen" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
});
