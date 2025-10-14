import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import
  {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';

// ✅ Import the hook with correct path
import { useAuth } from "../context/AuthContext";

// Define colors constant to fix ESLint warnings
const colors = {
  primary: '#2563eb',
  error: '#ef4444',
  white: '#fff',
  gray: {
    50: '#f3f4f6',
    100: '#e5e7eb',
    300: '#9ca3af',
    400: '#6b7280',
    900: '#111827',
  },
  blue: {
    50: '#eff6ff',
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will stop all location tracking.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Profile: Starting sign out...');
              const result = await signOut();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to sign out');
              } else {
                console.log('✅ Profile: Sign out successful, auth state should handle redirect');
                // Don't manually navigate - let the auth state change handle the redirect
                // The AuthContext will trigger a re-render of index.js which will redirect to login
              }
            } catch (error) {
              console.error('❌ Sign out error in profile:', error);
              Alert.alert('Error', 'Failed to sign out properly');
            }
          },
        },
      ]
    );
  };

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
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Order Tracker v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.gray[50] 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: colors.gray[50] 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: colors.gray[400] 
  },
  errorText: { 
    fontSize: 18, 
    color: colors.error, 
    marginTop: 16, 
    marginBottom: 20 
  },
  button: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  buttonText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: '600' 
  },
  header: { 
    backgroundColor: colors.white, 
    alignItems: 'center', 
    padding: 32, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.gray[100] 
  },
  avatarContainer: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    backgroundColor: colors.blue[50], 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  name: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: colors.gray[900], 
    marginBottom: 4 
  },
  role: { 
    fontSize: 16, 
    color: colors.gray[400] 
  },
  section: { 
    padding: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.gray[900], 
    marginBottom: 12 
  },
  infoCard: { 
    backgroundColor: colors.white, 
    borderRadius: 12, 
    padding: 16 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.gray[50] 
  },
  infoContent: { 
    flex: 1, 
    marginLeft: 12 
  },
  infoLabel: { 
    fontSize: 12, 
    color: colors.gray[400], 
    marginBottom: 4 
  },
  infoValue: { 
    fontSize: 14, 
    color: colors.gray[900] 
  },
  signOutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.white, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.error 
  },
  signOutButtonText: { 
    color: colors.error, 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 8 
  },
  footer: { 
    padding: 20, 
    alignItems: 'center' 
  },
  footerText: { 
    fontSize: 12, 
    color: colors.gray[300] 
  },
});