// components/LoginScreen.js
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../context/AuthContext';

// Define colors constant to fix ESLint warnings
const colors = {
  primary: '#2563eb',
  white: '#fff',
  gray: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    500: '#6b7280',
  },
  slate: {
    900: '#111827',
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Navigate to Main tabs if already authenticated
  useEffect(() => {
    console.log('🔐 Auth state:', { isAuthenticated, authLoading, user: !!user });
    
    if (isAuthenticated && user && !authLoading) {
      console.log('✅ User authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Show loading only for initial auth check
  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    console.log('🔄 Attempting login...');
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      console.log('✅ Login successful, user:', result.user?.email);
      // Navigation will happen automatically via useEffect
    } else {
      console.log('❌ Login failed:', result.error);
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="local-shipping" size={64} color={colors.primary} />
          <Text style={styles.title}>Order Tracker</Text>
          <Text style={styles.subtitle}>Driver Login</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color={colors.gray[500]} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color={colors.gray[500]} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.gray[500]}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color={colors.white} style={styles.loginIcon} />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Forgot password? Contact your administrator
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[500],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.slate[900],
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.slate[900],
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
