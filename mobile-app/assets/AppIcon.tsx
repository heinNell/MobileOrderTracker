import React from 'react';
import Svg, { Circle, Text } from 'react-native-svg'; 

export const AppIcon = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Circle cx="16" cy="16" r="16" fill="#007AFF" />
    <Text
      x="16"
      y="20"
      fontSize="18"
      fill="white"
      textAnchor="middle"
      fontWeight="bold"
    >
      📱
    </Text>
  </Svg>
);
