import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusIndicatorProps {
  status: 'checking' | 'success' | 'error' | 'warning';
  size?: 'small' | 'medium' | 'large';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'medium' 
}) => {
  const getIcon = () => {
    switch (status) {
      case 'checking':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'checking':
        return '#007AFF';
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getColor() + '20' }]}>
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
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = '#007AFF', 
  height = 8 
}) => {
  return (
    <View style={[styles.progressContainer, { height }]}>
      <View 
        style={[
          styles.progressFill, 
          { 
            width: `${Math.max(0, Math.min(100, progress))}%`, 
            backgroundColor: color,
            height 
          }
        ]} 
      />
    </View>
  );
};

interface StatusBadgeProps {
  status: 'checking' | 'success' | 'error' | 'warning';
  text: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const getColor = () => {
    switch (status) {
      case 'checking':
        return '#007AFF';
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.badgeText}>{text}</Text>
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
  progressContainer: {
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 4,
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