/**
 * InsightCard
 *
 * Proactive AI insight card shown on the HomeScreen. The Gurú uses these
 * to surface financial warnings, opportunities, and tips without waiting
 * for the user to ask.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Insight } from '../store/useFinancialStore';

const TYPE_META: Record<Insight['type'], { icon: string; color: string; bg: string }> = {
  warning:     { icon: '⚠️', color: '#EF4444', bg: '#EF444420' },
  opportunity: { icon: '💡', color: '#F59E0B', bg: '#F59E0B20' },
  info:        { icon: '📊', color: '#3B82F6', bg: '#3B82F620' },
};

interface InsightCardProps {
  insight: Insight;
  onDismiss: (id: string) => void;
  onTap: (insight: Insight) => void;
}

export function InsightCard({ insight, onDismiss, onTap }: InsightCardProps) {
  const meta = TYPE_META[insight.type];

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: meta.color + '50', backgroundColor: meta.bg }]}
      onPress={() => onTap(insight)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{meta.icon}</Text>
        <Text style={[styles.title, { color: meta.color }]} numberOfLines={1}>
          {insight.title}
        </Text>
        <TouchableOpacity
          onPress={() => onDismiss(insight.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.body} numberOfLines={2}>
        {insight.body}
      </Text>
      <Text style={styles.tapHint}>Toca para hablar con el Gurú →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: { fontSize: 16 },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: { padding: 2 },
  closeBtnText: { fontSize: 11, color: colors.textMuted },
  body: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  tapHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
