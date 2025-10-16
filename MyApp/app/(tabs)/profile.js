import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import
  {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';

// ✅ Import the hook with correct path
import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../context/AuthContext";

// Modern mobile-first color palette
const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',
  
  // Primary colors
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  
  // Status colors
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  
  // Gray scale with improved contrast
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Background colors
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
  },
  
  // Shadow and border
  shadow: '#0f172a',
  border: '#e2e8f0',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="person-off" size={64} color={colors.error} />
        <Text style={styles.errorText}>Not logged in</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={48} color={colors.primary} />
        </View>
        <Text style={styles.name}>{user.email}</Text>
        <Text style={styles.role}>Driver</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={20} color={colors.gray[400]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color={colors.gray[400]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{user.id}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={20} color={colors.gray[400]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Sign In</Text>
              <Text style={styles.infoValue}>
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <LogoutButton 
          variant="primary"
          size="large"
          style={styles.signOutButton}
          textStyle={styles.signOutButtonText}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Order Tracker v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Container styles with modern background
  container: { 
    flex: 1, 
    backgroundColor: colors.gray[50] 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: colors.gray[50] 
  },
  
  // Enhanced text styles
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.gray[600],
    fontWeight: '500'
  },
  errorText: { 
    fontSize: 18, 
    color: colors.error, 
    marginTop: 16, 
    marginBottom: 20,
    fontWeight: '600',
    textAlign: 'center'
  },
  
  // Modern button styling
  button: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: '700' 
  },
  
  // Enhanced header design
  header: { 
    backgroundColor: colors.white, 
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingVertical: 40, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarContainer: { 
    width: 104, 
    height: 104, 
    borderRadius: 52, 
    backgroundColor: colors.blue[100], 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.white,
  },
  name: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: colors.gray[900], 
    marginBottom: 6,
    letterSpacing: -0.5
  },
  role: { 
    fontSize: 16, 
    color: colors.gray[500],
    fontWeight: '600'
  },
  // Section and card styling
  section: { 
    padding: 20 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.gray[900], 
    marginBottom: 16,
    letterSpacing: -0.3
  },
  infoCard: { 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.gray[100]
  },
  infoContent: { 
    flex: 1, 
    marginLeft: 16 
  },
  infoLabel: { 
    fontSize: 13, 
    color: colors.gray[500], 
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  infoValue: { 
    fontSize: 15, 
    color: colors.gray[900],
    fontWeight: '500',
    lineHeight: 20
  },
  
  // Enhanced logout button
  signOutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.white, 
    paddingVertical: 18, 
    paddingHorizontal: 24,
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: colors.error,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutButtonText: { 
    color: colors.error, 
    fontSize: 16, 
    fontWeight: '700', 
    marginLeft: 8 
  },
  
  // Footer styling
  footer: { 
    padding: 24, 
    alignItems: 'center' 
  },
  footerText: { 
    fontSize: 13, 
    color: colors.gray[400],
    fontWeight: '500'
  },
});