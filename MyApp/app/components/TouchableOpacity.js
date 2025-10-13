import { Platform, TouchableOpacity as RNTouchableOpacity } from 'react-native';

export function TouchableOpacity({ children, onPress, style, disabled, ...props }) {
  // For web platform, ensure proper click handling
  const webStyle = Platform.OS === 'web' ? {
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    outline: 'none',
    // Ensure the element can receive clicks
    pointerEvents: disabled ? 'none' : 'auto',
    // Add hover effects for better UX
    transition: 'opacity 0.2s ease',
  } : {};

  const combinedStyle = [style, webStyle];

  const handlePress = (event) => {
    if (disabled || !onPress) return;
    
    // For web, ensure the event is properly handled
    if (Platform.OS === 'web') {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🔘 TouchableOpacity pressed');
    onPress(event);
  };

  // For web, also handle mouse events
  const webProps = Platform.OS === 'web' ? {
    onMouseDown: (e) => {
      if (!disabled) {
        e.currentTarget.style.opacity = '0.7';
      }
    },
    onMouseUp: (e) => {
      if (!disabled) {
        e.currentTarget.style.opacity = '1';
      }
    },
    onMouseLeave: (e) => {
      if (!disabled) {
        e.currentTarget.style.opacity = '1';
      }
    },
  } : {};

  return (
    <RNTouchableOpacity
      style={combinedStyle}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      {...webProps}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
}

export default TouchableOpacity;