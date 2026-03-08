import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface FinancialCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  gradientColors?: readonly [string, string, ...string[]];
  icon?: string;
  style?: ViewStyle;
}

export function FinancialCard({
  title,
  value,
  subtitle,
  trend,
  gradientColors = ['#1E293B', '#0F172A'],
  icon,
  style,
}: FinancialCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.card, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {trend && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendValue, isPositiveTrend ? styles.positive : styles.negative]}>
            {isPositiveTrend ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </Text>
          <Text style={styles.trendLabel}>{trend.label}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  positive: {
    color: colors.secondary,
  },
  negative: {
    color: colors.danger,
  },
});
