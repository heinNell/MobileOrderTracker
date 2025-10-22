import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';

// Get screen width for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;

// Define color palette for consistency
const colors = {
  primary: '#2563eb',
  inactive: '#6b7280',
  background: '#ffffff',
  border: '#e5e7eb',
  shadow: '#000000',
};

// Calculate dynamic sizes
const TAB_BAR_HEIGHT = IS_SMALL_DEVICE ? 60 : 68;
const ICON_SIZE = IS_SMALL_DEVICE ? 24 : 28;
const LABEL_FONT_SIZE = IS_SMALL_DEVICE ? 11 : 12;
const PADDING_BOTTOM = Platform.OS === 'ios' ? 8 : 12;

export default function TabLayout() {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.inactive,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: TAB_BAR_HEIGHT,
        paddingBottom: PADDING_BOTTOM,
        paddingTop: 12,
        paddingHorizontal: 8,
        ...Platform.select({
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          android: {
            elevation: 8,
          },
        }),
      },
      tabBarLabelStyle: {
        fontSize: LABEL_FONT_SIZE,
        fontWeight: '600',
        marginTop: 4,
      },
      tabBarIconStyle: {
        marginBottom: 2,
      },
      tabBarItemStyle: {
        paddingVertical: 6,
      },
      tabBarActiveBackgroundColor: `${colors.primary}10`,
    }),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="dashboard" size={ICON_SIZE} color={color} />
            ),
            tabBarAccessibilityLabel: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'My Orders',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="assignment" size={ICON_SIZE} color={color} />
            ),
            tabBarAccessibilityLabel: 'My Orders',
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: 'QR Scanner',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="qr-code-scanner" size={ICON_SIZE} color={color} />
            ),
            tabBarAccessibilityLabel: 'QR Scanner',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={ICON_SIZE} color={color} />
            ),
            tabBarAccessibilityLabel: 'Profile',
          }}
        />
        <Tabs.Screen
          name="[orderId]"
          options={{
            href: null,
            title: 'Order Details',
          }}
        />
        <Tabs.Screen
          name="DriverDashboard"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
