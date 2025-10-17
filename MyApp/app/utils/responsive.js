/**
 * Responsive Utilities for Mobile-First Design
 * 
 * Provides hooks and utilities for creating responsive layouts that adapt
 * seamlessly to different screen sizes and orientations.
 * 
 * Usage:
 * ```javascript
 * import { useResponsive, responsive } from '../utils/responsive';
 * 
 * function MyComponent() {
 *   const { spacing, scale, isSmallScreen } = useResponsive();
 *   
 *   return (
 *     <View style={{ padding: spacing.md }}>
 *       <Text style={{ fontSize: scale(16) }}>Responsive Text</Text>
 *     </View>
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

// Base breakpoints (in pixels)
export const BREAKPOINTS = {
  xs: 320,  // iPhone SE (smallest iOS device)
  sm: 375,  // Standard iPhone size
  md: 390,  // iPhone 14/15
  lg: 428,  // iPhone 14 Pro Max
  xl: 768,  // iPad mini
  xxl: 1024, // iPad
};

// Screen size categories
export const SCREEN_SIZES = {
  EXTRA_SMALL: 'xs',  // < 375px (iPhone SE)
  SMALL: 'sm',        // 375-389px (Standard iPhone)
  MEDIUM: 'md',       // 390-427px (Modern iPhone)
  LARGE: 'lg',        // 428-767px (Large iPhone)
  TABLET: 'xl',       // 768-1023px (iPad mini)
  DESKTOP: 'xxl',     // >= 1024px (iPad, Desktop)
};

// Minimum touch target sizes (accessibility)
export const TOUCH_TARGETS = {
  MIN_IOS: 44,      // iOS Human Interface Guidelines
  MIN_ANDROID: 48,  // Material Design Guidelines
  RECOMMENDED: 48,  // Recommended for both platforms
};

/**
 * Get current screen size category
 */
export const getScreenSize = (width) => {
  if (width < BREAKPOINTS.sm) return SCREEN_SIZES.EXTRA_SMALL;
  if (width < BREAKPOINTS.md) return SCREEN_SIZES.SMALL;
  if (width < BREAKPOINTS.lg) return SCREEN_SIZES.MEDIUM;
  if (width < BREAKPOINTS.xl) return SCREEN_SIZES.LARGE;
  if (width < BREAKPOINTS.xxl) return SCREEN_SIZES.TABLET;
  return SCREEN_SIZES.DESKTOP;
};

/**
 * Scale value based on screen width
 * Base size is iPhone 14 (390px)
 */
export const scaleSize = (size, width) => {
  const baseWidth = BREAKPOINTS.md; // iPhone 14
  const scale = width / baseWidth;
  
  // Don't scale too small on tiny devices or too large on tablets
  const clampedScale = Math.max(0.85, Math.min(scale, 1.3));
  
  return Math.round(size * clampedScale);
};

/**
 * Get responsive spacing based on screen size
 */
export const getSpacing = (width) => {
  const screenSize = getScreenSize(width);
  
  // Base spacing for medium screens
  const baseSpacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };
  
  // Reduce spacing on extra small screens
  if (screenSize === SCREEN_SIZES.EXTRA_SMALL) {
    return {
      xs: 2,
      sm: 6,
      md: 12,
      lg: 18,
      xl: 24,
      xxl: 32,
    };
  }
  
  // Slightly reduce on small screens
  if (screenSize === SCREEN_SIZES.SMALL) {
    return {
      xs: 3,
      sm: 7,
      md: 14,
      lg: 21,
      xl: 28,
      xxl: 40,
    };
  }
  
  // Increase spacing on tablets/desktop
  if (screenSize === SCREEN_SIZES.TABLET || screenSize === SCREEN_SIZES.DESKTOP) {
    return {
      xs: 6,
      sm: 12,
      md: 20,
      lg: 32,
      xl: 48,
      xxl: 64,
    };
  }
  
  return baseSpacing;
};

/**
 * Get responsive font sizes
 */
export const getFontSizes = (width) => {
  const screenSize = getScreenSize(width);
  
  const baseSizes = {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  };
  
  // Reduce font sizes on extra small screens for better readability
  if (screenSize === SCREEN_SIZES.EXTRA_SMALL) {
    return {
      xs: 9,
      sm: 11,
      base: 13,
      md: 15,
      lg: 17,
      xl: 19,
      '2xl': 22,
      '3xl': 28,
      '4xl': 32,
      '5xl': 42,
    };
  }
  
  // Increase on tablets
  if (screenSize === SCREEN_SIZES.TABLET || screenSize === SCREEN_SIZES.DESKTOP) {
    return {
      xs: 12,
      sm: 14,
      base: 16,
      md: 18,
      lg: 20,
      xl: 24,
      '2xl': 28,
      '3xl': 36,
      '4xl': 42,
      '5xl': 56,
    };
  }
  
  return baseSizes;
};

/**
 * Validate and enforce minimum touch target size
 */
export const ensureTouchTarget = (size) => {
  const minSize = Platform.OS === 'ios' 
    ? TOUCH_TARGETS.MIN_IOS 
    : TOUCH_TARGETS.MIN_ANDROID;
  
  return Math.max(size, minSize);
};

/**
 * React Hook: useResponsive
 * 
 * Provides reactive responsive utilities that update on screen size/orientation changes
 */
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    
    return () => subscription?.remove();
  }, []);
  
  const { width, height } = dimensions;
  const screenSize = getScreenSize(width);
  const spacing = getSpacing(width);
  const fontSizes = getFontSizes(width);
  
  return {
    // Screen dimensions
    width,
    height,
    screenSize,
    
    // Screen size queries
    isExtraSmallScreen: screenSize === SCREEN_SIZES.EXTRA_SMALL,
    isSmallScreen: screenSize === SCREEN_SIZES.SMALL,
    isMediumScreen: screenSize === SCREEN_SIZES.MEDIUM,
    isLargeScreen: screenSize === SCREEN_SIZES.LARGE,
    isTablet: screenSize === SCREEN_SIZES.TABLET,
    isDesktop: screenSize === SCREEN_SIZES.DESKTOP,
    
    // Orientation
    isPortrait: height > width,
    isLandscape: width > height,
    
    // Responsive sizing
    scale: (size) => scaleSize(size, width),
    spacing,
    fontSizes,
    
    // Touch target enforcement
    touchTarget: ensureTouchTarget,
    minTouchSize: Platform.OS === 'ios' ? TOUCH_TARGETS.MIN_IOS : TOUCH_TARGETS.MIN_ANDROID,
    
    // Platform helpers
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    
    // Breakpoints
    breakpoints: BREAKPOINTS,
  };
};

/**
 * Static responsive object (for use outside React components)
 */
export const responsive = {
  getScreenSize,
  scaleSize,
  getSpacing,
  getFontSizes,
  ensureTouchTarget,
  BREAKPOINTS,
  SCREEN_SIZES,
  TOUCH_TARGETS,
};

/**
 * Responsive style creator
 * Creates styles that adapt based on screen size
 * 
 * Usage:
 * ```javascript
 * const styles = createResponsiveStyles((r) => ({
 *   container: {
 *     padding: r.spacing.md,
 *     maxWidth: r.isTablet ? 600 : '100%',
 *   },
 *   text: {
 *     fontSize: r.fontSizes.md,
 *   },
 * }));
 * ```
 */
export const createResponsiveStyles = (styleFunc) => {
  const { width, height } = Dimensions.get('window');
  const screenSize = getScreenSize(width);
  const spacing = getSpacing(width);
  const fontSizes = getFontSizes(width);
  
  const responsiveContext = {
    width,
    height,
    screenSize,
    isExtraSmallScreen: screenSize === SCREEN_SIZES.EXTRA_SMALL,
    isSmallScreen: screenSize === SCREEN_SIZES.SMALL,
    isMediumScreen: screenSize === SCREEN_SIZES.MEDIUM,
    isLargeScreen: screenSize === SCREEN_SIZES.LARGE,
    isTablet: screenSize === SCREEN_SIZES.TABLET,
    isDesktop: screenSize === SCREEN_SIZES.DESKTOP,
    isPortrait: height > width,
    isLandscape: width > height,
    scale: (size) => scaleSize(size, width),
    spacing,
    fontSizes,
    touchTarget: ensureTouchTarget,
    minTouchSize: Platform.OS === 'ios' ? TOUCH_TARGETS.MIN_IOS : TOUCH_TARGETS.MIN_ANDROID,
  };
  
  return styleFunc(responsiveContext);
};

/**
 * Responsive padding helper
 */
export const responsivePadding = (size, width) => {
  const spacing = getSpacing(width);
  return spacing[size] || spacing.md;
};

/**
 * Responsive margin helper
 */
export const responsiveMargin = (size, width) => {
  const spacing = getSpacing(width);
  return spacing[size] || spacing.md;
};

/**
 * Get optimal column count for grid layouts
 */
export const getColumnCount = (width, minColumnWidth = 300) => {
  return Math.max(1, Math.floor(width / minColumnWidth));
};

/**
 * Check if device is considered "small" (needs compact layout)
 */
export const isSmallDevice = (width = Dimensions.get('window').width) => {
  return width < BREAKPOINTS.md;
};

/**
 * Check if device is considered "large" (can show expanded layout)
 */
export const isLargeDevice = (width = Dimensions.get('window').width) => {
  return width >= BREAKPOINTS.xl;
};

export default useResponsive;
