import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useFinancialStore } from '../store/useFinancialStore';
import { GuruAvatar } from '../components/GuruAvatar';

const CURRENCIES = ['USD', 'CRC', 'EUR', 'MXN', 'COP', 'BRL'];
const COUNTRIES = ['Costa Rica', 'México', 'Colombia', 'Argentina', 'España', 'USA', 'Otro'];
const RISK_LEVELS = [
  { key: 'low', label: 'Conservador', desc: 'Prefiero proteger mi capital', icon: '🛡️' },
  { key: 'medium', label: 'Moderado', desc: 'Balance entre riesgo y retorno', icon: '⚖️' },
  { key: 'high', label: 'Agresivo', desc: 'Busco máximo rendimiento', icon: '🚀' },
] as const;

const INVESTMENT_GOALS_OPTIONS = [
  'Jubilación', 'Comprar casa', 'Educación', 'Viajes', 'Independencia financiera',
  'Emergencias', 'Negocio propio', 'Automóvil',
];

export function ProfileScreen() {
  const { profile, setProfile } = useFinancialStore();

  const [name, setName] = useState(profile.name);
  const [monthlyIncome, setMonthlyIncome] = useState(String(profile.monthlyIncome));
  const [currency, setCurrency] = useState(profile.currency);
  const [country, setCountry] = useState(profile.country);
  const [age, setAge] = useState(String(profile.age));
  const [riskTolerance, setRiskTolerance] =
    useState<typeof profile.riskTolerance>(profile.riskTolerance);
  const [goals, setGoals] = useState<string[]>(profile.investmentGoals);
  const [saved, setSaved] = useState(false);

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return;
    }
    setProfile({
      name: name.trim(),
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      currency,
      country,
      age: parseInt(age) || 30,
      riskTolerance,
      investmentGoals: goals,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert('✅ Guardado', 'Tu perfil financiero ha sido actualizado');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <GuruAvatar mood={name ? 'happy' : 'neutral'} isTalking={false} size={100} />
        <Text style={styles.headerTitle}>Tu Perfil Financiero</Text>
        <Text style={styles.headerSubtitle}>
          {name ? `¡Hola, ${name}! 👋` : 'El Gurú necesita conocerte para ayudarte mejor'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Información Personal</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="¿Cómo te llamas?"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Tu edad"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>País</Text>
            <View style={styles.chipRow}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, country === c && styles.chipActive]}
                  onPress={() => setCountry(c)}
                >
                  <Text style={[styles.chipText, country === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Financial Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Datos Financieros</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Ingreso Mensual</Text>
            <TextInput
              style={styles.input}
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Moneda Principal</Text>
            <View style={styles.chipRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Risk Tolerance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Perfil de Riesgo</Text>
          <Text style={styles.sectionDesc}>
            ¿Cómo describes tu actitud hacia el riesgo en las inversiones?
          </Text>
          {RISK_LEVELS.map(({ key, label, desc, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.riskCard, riskTolerance === key && styles.riskCardActive]}
              onPress={() => setRiskTolerance(key)}
            >
              <Text style={styles.riskIcon}>{icon}</Text>
              <View style={styles.riskInfo}>
                <Text style={[styles.riskLabel, riskTolerance === key && styles.riskLabelActive]}>
                  {label}
                </Text>
                <Text style={styles.riskDesc}>{desc}</Text>
              </View>
              <View style={[styles.radioOuter, riskTolerance === key && styles.radioOuterActive]}>
                {riskTolerance === key && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Investment Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Metas de Inversión</Text>
          <Text style={styles.sectionDesc}>Selecciona todas las que apliquen</Text>
          <View style={styles.goalsGrid}>
            {INVESTMENT_GOALS_OPTIONS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[styles.goalChip, goals.includes(goal) && styles.goalChipActive]}
                onPress={() => toggleGoal(goal)}
              >
                <Text style={[styles.goalText, goals.includes(goal) && styles.goalTextActive]}>
                  {goals.includes(goal) ? '✓ ' : ''}{goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient colors={saved ? colors.gradientSecondary : colors.gradientPrimary} style={styles.saveGradient}>
            <Text style={styles.saveButtonText}>
              {saved ? '✅ ¡Guardado!' : '💾 Guardar Perfil'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Todos tus datos se guardan localmente en tu dispositivo. Nunca se comparten con terceros.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  content: { padding: 16, gap: 16 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
  },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  riskCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  riskIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  riskInfo: { flex: 1 },
  riskLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  riskLabelActive: { color: colors.primary },
  riskDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalChipActive: { backgroundColor: colors.secondary + '20', borderColor: colors.secondary },
  goalText: { fontSize: 13, color: colors.textSecondary },
  goalTextActive: { color: colors.secondary, fontWeight: '600' },
  saveButton: { borderRadius: 14, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  privacyIcon: { fontSize: 20 },
  privacyText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
});
