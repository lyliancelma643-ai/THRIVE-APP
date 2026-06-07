import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  labelValue?: string | number;
  labelUnit?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 12,
  color = '#c5a059',
  trackColor = '#101624',
  labelValue,
  labelUnit
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center relative">
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {(labelValue !== undefined) && (
        <View className="absolute items-center justify-center">
          <Text className="text-white font-display text-3xl font-bold">{labelValue}</Text>
          {labelUnit && <Text className="text-text-muted text-xs uppercase tracking-wider">{labelUnit}</Text>}
        </View>
      )}
    </View>
  );
}
