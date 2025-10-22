// components/StatusIndicators.js
import { StyleSheet, Text, View } from "react-native";

// Color constants for consistency
const STATUS_COLORS = {
  checking: "#007AFF",
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  default: "#8E8E93",
};

// UI color constants
const UI_COLORS = {
  lightGray: "#E5E5E5",
  darkGray: "#666",
  white: "#FFFFFF",
  defaultBlue: "#007AFF",
};

const SIZE_VALUES = {
  small: 16,
  medium: 20,
  large: 24,
};

export const StatusIndicator = ({ status, size = "medium", style, testID }) => {
  const getColor = () => STATUS_COLORS[status] || STATUS_COLORS.default;
  const getSize = () => SIZE_VALUES[size];

  return (
    <View
      style={[styles.container, { backgroundColor: `${getColor()}20` }, style]}
      testID={testID}
      accessibilityLabel={`Status: ${status}`}
      accessibilityRole="text"
    >
      <Text style={[styles.statusText, { fontSize: getSize(), color: getColor() }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
};

export const ProgressBar = ({
  progress,
  color = UI_COLORS.defaultBlue,
  height = 8,
  backgroundColor = UI_COLORS.lightGray,
  style,
  testID,
  showPercentage = false,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.progressWrapper, style]}>
      <View
        style={[styles.progressContainer, { height, backgroundColor }]}
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
              height,
            },
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

export const StatusBadge = ({ status, text, style, textStyle, testID }) => {
  const getColor = () => STATUS_COLORS[status] || STATUS_COLORS.default;

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
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 32,
  },
  statusText: {
    fontWeight: "bold",
  },
  progressWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressContainer: {
    backgroundColor: UI_COLORS.lightGray,
    borderRadius: 4,
    overflow: "hidden",
    flex: 1,
  },
  progressFill: {
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: UI_COLORS.darkGray,
    marginLeft: 8,
    minWidth: 35,
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: UI_COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
});

// Optional: Export utility functions for external use
export const getStatusColor = (status) =>
  STATUS_COLORS[status] || STATUS_COLORS.default;

// Default export for expo-router compatibility (this should not be used as a route)
export default function NotARoute() {
  return null; // This prevents the component from being used as a route
}
