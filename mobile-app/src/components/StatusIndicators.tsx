import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Define types for better reusability
type StatusType = 'checking' | 'success' | 'error' | 'warning';
type SizeType = 'small' | 'medium' | 'large';

// Color constants for consistency
const STATUS_COLORS = {
  checking: '#007AFF',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  default: '#8E8E93',
} as const;

const STATUS_ICONS = {
  checking: '⏳',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  default: '❓',
} as const;

const SIZE_VALUES = {
  small: 16,
  medium: 20,
  large: 24,
} as const;

interface StatusIndicatorProps {
  status: StatusType;
  size?: SizeType;
  style?: ViewStyle;
  testID?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'medium',
  style,
  testID
}) => {
  const getIcon = (): string => STATUS_ICONS[status] || STATUS_ICONS.default;
  const getColor = (): string => STATUS_COLORS[status] || STATUS_COLORS.default;
  const getSize = (): number => SIZE_VALUES[size];

  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: `${getColor()}20` },
        style
      ]}
      testID={testID}
      accessibilityLabel={`Status: ${status}`}
      accessibilityRole="image"
    >
      <Text style={[styles.icon, { fontSize: getSize(), color: getColor() }]}>
        {getIcon()}
      </Text>
    </View>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  backgroundColor?: string;
  style?: ViewStyle;
  testID?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = '#007AFF', 
  height = 8,
  backgroundColor = '#E5E5E5',
  style,
  testID,
  showPercentage = false
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <View style={[styles.progressWrapper, style]}>
      <View 
        style={[
          styles.progressContainer, 
          { height, backgroundColor }
        ]}
        testID={testID}
        accessibilityLabel={`Progress: ${Math.round(clampedProgress)}%`}
        accessibilityRole="progressbar"
      >
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${clampedProgress}%`, 
              backgroundColor: color,
              height 
            }
          ]} 
        />
      </View>
      {showPercentage && (
        <Text style={styles.percentageText}>
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </View>
  );
};

interface StatusBadgeProps {
  status: StatusType;
  text: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  text, 
  style,
  textStyle,
  testID 
}) => {
  const getColor = (): string => STATUS_COLORS[status] || STATUS_COLORS.default;

  return (
    <View 
      style={[styles.badge, { backgroundColor: getColor() }, style]}
      testID={testID}
      accessibilityLabel={`${status} status: ${text}`}
      accessibilityRole="text"
    >
      <Text style={[styles.badgeText, textStyle]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  icon: {
    fontWeight: 'bold',
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  progressFill: {
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    minWidth: 35,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

// Optional: Export utility functions for external use
export const getStatusColor = (status: StatusType): string => 
  STATUS_COLORS[status] || STATUS_COLORS.default;

export const getStatusIcon = (status: StatusType): string => 
  STATUS_ICONS[status] || STATUS_ICONS.default;
