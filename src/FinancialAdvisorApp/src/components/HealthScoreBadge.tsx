/**
 * HealthScoreBadge
 *
 * Displays the user's financial health score as a circular gauge with
 * a color-coded ring, score number, and label. Animates when the score
 * changes.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { HealthScore } from '../store/useFinancialStore';

interface HealthScoreBadgeProps {
  healthScore: HealthScore;
  size?: number;
  onPress?: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HealthScoreBadge({ healthScore, size = 72, onPress }: HealthScoreBadgeProps) {
  const { score, label, color } = healthScore;

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const content = (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceLight}
          strokeWidth={6}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Score text */}
      <View style={styles.inner}>
        <Text style={[styles.scoreText, { color }]}>{score}</Text>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  labelText: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 10,
  },
});
