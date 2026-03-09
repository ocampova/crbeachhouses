/**
 * GoalModal
 *
 * Bottom sheet for creating a new savings goal, or adding funds
 * to an existing one.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { SavingsGoal } from '../store/useFinancialStore';

const GOAL_PRESETS = [
  { icon: '✈️', name: 'Viaje', color: '#6366F1' },
  { icon: '🏠', name: 'Casa', color: '#10B981' },
  { icon: '🚗', name: 'Auto', color: '#F59E0B' },
  { icon: '🛡️', name: 'Fondo de emergencia', color: '#EF4444' },
  { icon: '🎓', name: 'Educación', color: '#3B82F6' },
  { icon: '💒', name: 'Boda', color: '#EC4899' },
  { icon: '📱', name: 'Tecnología', color: '#8B5CF6' },
  { icon: '🎯', name: 'Meta propia', color: '#F97316' },
];

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Omit<SavingsGoal, 'id'>) => void;
  currency: string;
  /** If provided, the modal shows an "Add funds" form instead */
  addFundsToGoal?: SavingsGoal | null;
  onAddFunds?: (id: string, amount: number) => void;
}

export function GoalModal({ visible, onClose, onSave, currency, addFundsToGoal, onAddFunds }: GoalModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(GOAL_PRESETS[0]);
  const [customName, setCustomName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    if (visible && !addFundsToGoal) {
      setCustomName('');
      setTargetAmount('');
      setCurrentAmount('');
      // Default deadline: 1 year from now
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setDeadline(d.toISOString().split('T')[0]);
    }
    if (visible && addFundsToGoal) {
      setAddAmount('');
    }
  }, [visible, addFundsToGoal]);

  const handleSaveGoal = () => {
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Ingresa una meta válida mayor a 0');
      return;
    }
    if (!deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Error', 'Ingresa la fecha en formato YYYY-MM-DD');
      return;
    }
    onSave({
      name: customName || selectedPreset.name,
      icon: selectedPreset.icon,
      targetAmount: target,
      currentAmount: current,
      deadline,
      currency,
      color: selectedPreset.color,
    });
    onClose();
  };

  const handleAddFunds = () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    onAddFunds?.(addFundsToGoal!.id, amount);
    onClose();
  };

  // Add funds mode
  if (addFundsToGoal) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{addFundsToGoal.icon} Abonar a "{addFundsToGoal.name}"</Text>
            <Text style={styles.subtitle}>
              Progreso actual: {currency} {addFundsToGoal.currentAmount.toLocaleString('es')} / {addFundsToGoal.targetAmount.toLocaleString('es')}
            </Text>
            <Text style={styles.fieldLabel}>¿Cuánto deseas abonar? ({currency})</Text>
            <TextInput
              style={styles.input}
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddFunds}>
                <LinearGradient colors={colors.gradientSecondary} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Abonar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>🎯 Nueva Meta de Ahorro</Text>

            <Text style={styles.fieldLabel}>Tipo de meta</Text>
            <View style={styles.presetsGrid}>
              {GOAL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.preset, selectedPreset.name === preset.name && { borderColor: preset.color, backgroundColor: preset.color + '15' }]}
                  onPress={() => setSelectedPreset(preset)}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text style={[styles.presetName, selectedPreset.name === preset.name && { color: preset.color }]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Nombre personalizado (opcional)</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder={selectedPreset.name}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Meta total ({currency})</Text>
            <TextInput
              style={styles.input}
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="Ej: 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Ya tengo ahorrado ({currency}, opcional)</Text>
            <TextInput
              style={styles.input}
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Fecha límite (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="2026-12-31"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                <LinearGradient colors={colors.gradientPrimary} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Crear Meta</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  scrollContent: { justifyContent: 'flex-end', flexGrow: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetIcon: { fontSize: 14 },
  presetName: { fontSize: 12, color: colors.textSecondary },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
