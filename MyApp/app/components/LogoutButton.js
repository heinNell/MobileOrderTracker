import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Centralized logout button component with consistent styling and behavior
export default function LogoutButton({ 
  variant = 'primary', 
  size = 'medium',
  showText = true,
  showConfirmation = true,
  style = {},
  textStyle = {},
  iconSize,
  onLogoutStart,
  onLogoutComplete 
}) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // Color configurations for different variants
  const variants = {
    primary: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#ef4444',
      iconColor: '#ef4444',
    },
    secondary: {
      backgroundColor: '#f3f4f6',
      borderColor: '#d1d5db',
      textColor: '#6b7280',
      iconColor: '#6b7280',
    },
    danger: {
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      textColor: '#ffffff',
      iconColor: '#ffffff',
    },
    minimal: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: '#ef4444',
      iconColor: '#ef4444',
    },
  };

  // Size configurations
  const sizes = {
    small: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      fontSize: 12,
      iconSize: 16,
      borderRadius: 6,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      iconSize: 20,
      borderRadius: 8,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      fontSize: 18,
      iconSize: 24,
      borderRadius: 12,
    },
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.medium;

  const handleLogout = async () => {
    if (showConfirmation) {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out? This will stop all location tracking and clear your active orders.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    } else {
      await performLogout();
    }
  };

  const performLogout = async () => {
    try {
      setLoading(true);
      
      // Call custom callback if provided
      if (onLogoutStart) {
        await onLogoutStart();
      }

      console.log('🔄 LogoutButton: Starting centralized logout...');
      
      const result = await signOut();
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to sign out');
        return;
      }

      console.log('✅ LogoutButton: Logout successful');
      
      // Call completion callback if provided
      if (onLogoutComplete) {
        await onLogoutComplete();
      }

      // The auth context will handle the navigation redirect
      
    } catch (error) {
      console.error('❌ LogoutButton error:', error);
      Alert.alert('Error', 'Failed to sign out properly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: currentVariant.backgroundColor,
      borderColor: currentVariant.borderColor,
      paddingVertical: currentSize.paddingVertical,
      paddingHorizontal: currentSize.paddingHorizontal,
      borderRadius: currentSize.borderRadius,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: currentVariant.textColor,
      fontSize: currentSize.fontSize,
      fontWeight: '600',
    },
    textStyle,
  ];

  const finalIconSize = iconSize || currentSize.iconSize;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handleLogout}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.iconColor} />
      ) : (
        <MaterialIcons 
          name="logout" 
          size={finalIconSize} 
          color={currentVariant.iconColor} 
        />
      )}
      {showText && !loading && (
        <Text style={textStyles}>
          {loading ? 'Signing Out...' : 'Sign Out'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    marginLeft: 8,
    fontWeight: '600',
  },
});