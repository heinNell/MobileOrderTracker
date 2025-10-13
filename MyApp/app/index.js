import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    console.log('📍 Index.js useEffect triggered', { loading, isAuthenticated });
    
    if (!loading) {
      if (isAuthenticated) {
        console.log('✅ User authenticated, redirecting to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('❌ User not authenticated, redirecting to login');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  console.log('📍 Index.js rendering...', { loading, isAuthenticated });

  // Always show loading while determining auth state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
