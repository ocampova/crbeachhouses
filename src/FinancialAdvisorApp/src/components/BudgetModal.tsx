/**
 * BudgetModal
 *
 * Bottom sheet modal for creating or editing a monthly budget limit
 * for a specific expense category.
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
import { Budget } from '../store/useFinancialStore';

const EXPENSE_CATEGORIES = [
  'Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud',
  'Educación', 'Entretenimiento', 'Ropa', 'Tecnología', 'Otros',
];

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (budget: Omit<Budget, 'id'>) => void;
  currency: string;
  existingBudget?: Budget | null;
}

export function BudgetModal({ visible, onClose, onSave, currency, existingBudget }: BudgetModalProps) {
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (existingBudget) {
      setCategory(existingBudget.category);
      setLimit(String(existingBudget.limit));
    } else {
      setCategory('');
      setLimit('');
    }
  }, [existingBudget, visible]);

  const handleSave = () => {
    if (!category) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      Alert.alert('Error', 'Ingresa un límite válido mayor a 0');
      return;
    }
    onSave({ category, limit: numLimit, currency, period: 'monthly' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {existingBudget ? 'Editar Presupuesto' : '➕ Nuevo Presupuesto'}
          </Text>
          <Text style={styles.subtitle}>
            Establece un límite mensual para una categoría de gasto
          </Text>

          <Text style={styles.fieldLabel}>Categoría</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Límite mensual ({currency})</Text>
          <TextInput
            style={styles.input}
            value={limit}
            onChangeText={setLimit}
            placeholder="Ej: 500"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.saveGradient}>
                <Text style={styles.saveText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
  categoriesScroll: { maxHeight: 50 },
  categoriesContent: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
