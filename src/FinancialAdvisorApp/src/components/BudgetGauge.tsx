/**
 * BudgetGauge
 *
 * Displays a single budget category with a color-coded progress bar
 * showing how much of the monthly limit has been spent.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { BudgetStatus } from '../store/useFinancialStore';

interface BudgetGaugeProps {
  status: BudgetStatus;
  currency: string;
  onDelete?: (id: string) => void;
}

function getBarColor(status: BudgetStatus['status']): string {
  if (status === 'over') return '#EF4444';
  if (status === 'warning') return '#F59E0B';
  return '#10B981';
}

export function BudgetGauge({ status, currency, onDelete }: BudgetGaugeProps) {
  const { budget, spent, percentage, remaining } = status;
  const barColor = getBarColor(status.status);
  const fillWidth = Math.min(percentage, 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{budget.category}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.statusBadge, { color: barColor }]}>
            {status.status === 'over' ? '⚠️ Excedido' :
             status.status === 'warning' ? '⚡ Casi' : '✅ OK'}
          </Text>
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(budget.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${fillWidth}%` as `${number}%`, backgroundColor: barColor }]} />
      </View>

      {/* Amounts */}
      <View style={styles.amounts}>
        <Text style={styles.spentText}>
          Gastado: {currency} {spent.toLocaleString('es', { maximumFractionDigits: 0 })}
        </Text>
        <Text style={[styles.remainText, { color: remaining < 0 ? '#EF4444' : colors.textMuted }]}>
          {remaining >= 0
            ? `Queda: ${currency} ${remaining.toLocaleString('es', { maximumFractionDigits: 0 })}`
            : `Exceso: ${currency} ${Math.abs(remaining).toLocaleString('es', { maximumFractionDigits: 0 })}`}
        </Text>
      </View>

      <Text style={styles.limitText}>
        Límite mensual: {currency} {budget.limit.toLocaleString('es', { maximumFractionDigits: 0 })} ({percentage.toFixed(0)}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    fontSize: 12,
    color: colors.textMuted,
  },
  barBg: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  remainText: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
