// app/components/map/MapComponentLoader.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity,
  Alert 
} from 'react-native';

// Define color constants
const COLORS = {
  background: '#f8f9fa',
  primary: '#007AFF',
  secondary: '#6c757d',
  danger: '#dc3545',
  textPrimary: '#495057',
  textSecondary: '#6c757d',
  textLight: '#adb5bd',
  white: '#FFFFFF',
  transparent: 'transparent',
  shadow: '#000000',
};

const MapComponentLoader = (props) => {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Function to load the MapComponent dynamically
  const loadMapComponent = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    
    try {
      // Dynamic import for true lazy loading
      const { default: MapComponent } = await import('./MapComponent');
      
      // Validate that the component was loaded successfully
      if (!MapComponent) {
        throw new Error('MapComponent is null or undefined');
      }
      
      setComponent(() => MapComponent);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.warn('Failed to load map component:', error);
      setHasError(true);
      setErrorMessage(error.message || 'Failed to load map component');
      
      // Show alert for critical errors after multiple retries
      if (retryCount >= 2) {
        Alert.alert(
          'Map Loading Error',
          'Unable to load the map component. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  // Handle retry with count tracking
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadMapComponent();
  }, [loadMapComponent]);

  // Load component on mount
  useEffect(() => {
    loadMapComponent();
  }, [loadMapComponent]);

  // Loading state UI
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color={COLORS.primary} 
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>
          {retryCount > 0 ? 'Retrying...' : 'Loading map...'}
        </Text>
        {retryCount > 0 && (
          <Text style={styles.retryCountText}>
            Attempt {retryCount + 1}
          </Text>
        )}
      </View>
    );
  }

  // Error state UI
  if (hasError || !Component) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>⚠️</Text>
        </View>
        
        <Text style={styles.errorTitle}>Map Unavailable</Text>
        
        <Text style={styles.errorMessage}>
          {errorMessage || 'Unable to load the map component'}
        </Text>
        
        {retryCount > 0 && (
          <Text style={styles.retryInfo}>
            Failed attempts: {retryCount}
          </Text>
        )}
        
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={handleRetry}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>
            {retryCount > 0 ? 'Try Again' : 'Retry'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={() => {
            // Optional: Allow user to skip map loading
            console.log('User chose to skip map loading');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Continue without map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Successfully loaded component
  return (
    <View style={styles.mapContainer}>
      <Component {...props} />
    </View>
  );
};

// Comprehensive styles
const styles = StyleSheet.create({
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  spinner: {
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 5,
  },
  retryCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorIconText: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  retryInfo: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 25,
    fontStyle: 'italic',
  },

  // Button styles
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: COLORS.transparent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  skipButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    textAlign: 'center',
  },

  // Map container
  mapContainer: {
    flex: 1,
  },
});

export default MapComponentLoader;
