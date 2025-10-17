/**
 * Suppress React Native Web Deprecation Warnings
 * 
 * These warnings come from Expo Router and React Navigation internals,
 * not from our application code. They will be fixed in future library updates.
 * 
 * This utility is OPTIONAL and only suppresses console noise during development.
 * Remove this file once expo-router and react-navigation are updated.
 */

import { Platform } from 'react-native';

if (Platform.OS === 'web' && __DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;

  // List of warnings to suppress (from dependencies, not our code)
  const suppressedWarnings = [
    'pointerEvents is deprecated',
    'useNativeDriver', // Sometimes appears in web builds
  ];

  console.warn = (...args) => {
    const message = args[0];
    
    if (typeof message === 'string') {
      // Check if this warning should be suppressed
      const shouldSuppress = suppressedWarnings.some(warning => 
        message.includes(warning)
      );
      
      if (shouldSuppress) {
        // Optionally log suppressed warnings in verbose mode
        // console.log('[Suppressed Warning]:', message);
        return;
      }
    }
    
    // Pass through all other warnings
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    const message = args[0];
    
    if (typeof message === 'string') {
      // Don't suppress errors, only filter if absolutely necessary
      // Add specific error patterns here if needed
    }
    
    // Pass through all errors (don't suppress real errors!)
    originalError.apply(console, args);
  };

  console.log('🔇 Development warning filters enabled (web only)');
}

export default {};
