/**
 * GoalCard
 *
 * Displays a savings goal with an SVG circular progress ring,
 * remaining amount, deadline, and required monthly savings.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { SavingsGoal } from '../store/useFinancialStore';

interface GoalCardProps {
  goal: SavingsGoal;
  onDelete: (id: string) => void;
  onAskGuru: (goal: SavingsGoal) => void;
  onAddFunds: (id: string, amount: number) => void;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function monthsUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0.5,
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  );
}

export function GoalCard({ goal, onDelete, onAskGuru, onAddFunds }: GoalCardProps) {
  const percentage = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const months = monthsUntil(goal.deadline);
  const monthlyNeeded = remaining > 0 ? remaining / months : 0;
  const days = daysUntil(goal.deadline);
  const isAchieved = goal.currentAmount >= goal.targetAmount;

  // SVG ring
  const size = 72;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.card, { borderColor: goal.color + '40' }]}>
      <View style={styles.header}>
        {/* Progress ring */}
        <View style={styles.ringContainer}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={colors.surfaceLight} strokeWidth={6} fill="none"
            />
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={isAchieved ? '#10B981' : goal.color}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.ringInner}>
            <Text style={styles.ringEmoji}>{goal.icon}</Text>
            <Text style={[styles.ringPercent, { color: isAchieved ? '#10B981' : goal.color }]}>
              {percentage.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Goal info */}
        <View style={styles.info}>
          <View style={styles.infoHeader}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            <TouchableOpacity
              onPress={() => onDelete(goal.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.amountText}>
            {goal.currency} {goal.currentAmount.toLocaleString('es', { maximumFractionDigits: 0 })}
            {' / '}
            {goal.currency} {goal.targetAmount.toLocaleString('es', { maximumFractionDigits: 0 })}
          </Text>

          {!isAchieved ? (
            <>
              <Text style={styles.deadlineText}>
                📅 {days > 0 ? `${days} días restantes` : '¡Plazo vencido!'}
              </Text>
              <Text style={styles.monthlyText}>
                Necesitas {goal.currency} {monthlyNeeded.toLocaleString('es', { maximumFractionDigits: 0 })}/mes
              </Text>
            </>
          ) : (
            <Text style={styles.achievedText}>🎉 ¡Meta lograda!</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.guruBtn}
          onPress={() => onAskGuru(goal)}
        >
          <Text style={styles.guruBtnText}>🧠 Estrategia</Text>
        </TouchableOpacity>
        {!isAchieved && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: goal.color + '20', borderColor: goal.color + '60' }]}
            onPress={() => onAddFunds(goal.id, 0)}
          >
            <Text style={[styles.addBtnText, { color: goal.color }]}>+ Abonar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ringContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringEmoji: { fontSize: 18, lineHeight: 20 },
  ringPercent: { fontSize: 10, fontWeight: '800', lineHeight: 12 },
  info: { flex: 1, gap: 4 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  deleteBtn: { fontSize: 12, color: colors.textMuted, padding: 2 },
  amountText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  deadlineText: { fontSize: 11, color: colors.textMuted },
  monthlyText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  achievedText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  guruBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  guruBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  addBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontWeight: '700' },
});
