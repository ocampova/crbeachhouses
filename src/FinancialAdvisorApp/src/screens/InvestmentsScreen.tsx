import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { FinancialCard } from '../components/FinancialCard';
import { GoalCard } from '../components/GoalCard';
import { GoalModal } from '../components/GoalModal';
import { useFinancialStore, Investment, SavingsGoal } from '../store/useFinancialStore';
import { getInvestmentRecommendations, getGoalStrategy } from '../services/financialAdvisor';

type Tab = 'portfolio' | 'goals' | 'recommendations' | 'add';

const INVESTMENT_TYPES: { key: Investment['type']; label: string; icon: string }[] = [
  { key: 'stocks', label: 'Acciones', icon: '📈' },
  { key: 'crypto', label: 'Cripto', icon: '₿' },
  { key: 'real_estate', label: 'Bienes Raíces', icon: '🏠' },
  { key: 'bonds', label: 'Bonos', icon: '📜' },
  { key: 'funds', label: 'Fondos', icon: '🏦' },
  { key: 'other', label: 'Otros', icon: '💼' },
];

export function InvestmentsScreen() {
  const {
    investments, addInvestment, removeInvestment,
    goals, addGoal, updateGoal, removeGoal,
    profile, getFinancialSummary,
  } = useFinancialStore();

  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [recommendations, setRecommendations] = useState('');
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [streamingRec, setStreamingRec] = useState('');

  // Goals state
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null);
  const [goalStrategy, setGoalStrategy] = useState('');
  const [strategyGoal, setStrategyGoal] = useState<SavingsGoal | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [streamingStrategy, setStreamingStrategy] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<Investment['type']>('stocks');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseValue, setPurchaseValue] = useState('');
  const [investDate, setInvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const summary = getFinancialSummary();

  const handleAskGuruGoal = async (goal: SavingsGoal) => {
    setStrategyGoal(goal);
    setGoalStrategy('');
    setStreamingStrategy('');
    setIsLoadingStrategy(true);
    setActiveTab('recommendations');

    await getGoalStrategy(goal, profile, summary, {
      onToken: (token) => setStreamingStrategy((prev) => prev + token),
      onComplete: (fullText) => {
        setGoalStrategy(fullText);
        setStreamingStrategy('');
        setIsLoadingStrategy(false);
      },
      onError: (err) => {
        setIsLoadingStrategy(false);
        Alert.alert('Error', err.message);
      },
    });
  };

  const handleAddFunds = (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    setAddFundsGoal(goal);
    setGoalModalVisible(true);
  };

  const handleConfirmAddFunds = (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    updateGoal(id, { currentAmount: goal.currentAmount + amount });
    setAddFundsGoal(null);
  };

  // Calculate portfolio metrics
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalPurchaseValue = investments.reduce((sum, i) => sum + i.purchaseValue, 0);
  const totalReturn = totalCurrentValue - totalPurchaseValue;
  const returnPercentage = totalPurchaseValue > 0
    ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100
    : 0;

  const byType = INVESTMENT_TYPES.map(({ key, label, icon }) => {
    const typeInvestments = investments.filter((i) => i.type === key);
    const value = typeInvestments.reduce((sum, i) => sum + i.currentValue, 0);
    const percentage = totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0;
    return { key, label, icon, value, percentage, count: typeInvestments.length };
  }).filter((t) => t.count > 0);

  const handleGetRecommendations = async () => {
    setIsLoadingRec(true);
    setStreamingRec('');
    setRecommendations('');
    setActiveTab('recommendations');

    await getInvestmentRecommendations(profile, summary, {
      onToken: (token) => {
        setStreamingRec((prev) => prev + token);
      },
      onComplete: (fullText) => {
        setRecommendations(fullText);
        setStreamingRec('');
        setIsLoadingRec(false);
      },
      onError: (err) => {
        setIsLoadingRec(false);
        Alert.alert('Error', err.message);
      },
    });
  };

  const handleAddInvestment = () => {
    if (!name || !currentValue || !purchaseValue) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }
    const current = parseFloat(currentValue);
    const purchase = parseFloat(purchaseValue);
    if (isNaN(current) || isNaN(purchase)) {
      Alert.alert('Error', 'Ingresa valores numéricos válidos');
      return;
    }
    addInvestment({
      name,
      type,
      currentValue: current,
      purchaseValue: purchase,
      currency: profile.currency,
      date: investDate,
      notes,
    });
    setName('');
    setCurrentValue('');
    setPurchaseValue('');
    setNotes('');
    setActiveTab('portfolio');
    Alert.alert('✅ Listo', 'Inversión agregada al portafolio');
  };

  const formatCurrency = (amount: number) =>
    `${profile.currency} ${amount.toLocaleString('es', { minimumFractionDigits: 0 })}`;

  const TAB_LABELS: Record<Tab, string> = {
    portfolio: '💼 Portafolio',
    goals: '🎯 Metas',
    recommendations: '🧠 Consejos',
    add: '➕ Agregar',
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {(['portfolio', 'goals', 'recommendations', 'add'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        onClose={() => { setGoalModalVisible(false); setAddFundsGoal(null); }}
        onSave={(goal) => { addGoal(goal); setGoalModalVisible(false); }}
        currency={profile.currency}
        addFundsToGoal={addFundsGoal}
        onAddFunds={handleConfirmAddFunds}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <View style={styles.section}>
            {/* Summary cards */}
            <FinancialCard
              title="Valor Total del Portafolio"
              value={formatCurrency(totalCurrentValue)}
              subtitle={`Costo inicial: ${formatCurrency(totalPurchaseValue)}`}
              icon="💼"
              gradientColors={['#1E3A5F', '#1E40AF']}
            />

            <View style={styles.row}>
              <FinancialCard
                title="Retorno Total"
                value={formatCurrency(totalReturn)}
                icon={totalReturn >= 0 ? '📈' : '📉'}
                gradientColors={totalReturn >= 0
                  ? ['#065F46', '#047857']
                  : ['#7F1D1D', '#991B1B']}
                style={styles.halfCard}
              />
              <FinancialCard
                title="Rendimiento"
                value={`${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`}
                icon="📊"
                gradientColors={returnPercentage >= 0
                  ? ['#065F46', '#047857']
                  : ['#7F1D1D', '#991B1B']}
                style={styles.halfCard}
              />
            </View>

            {/* Allocation breakdown */}
            {byType.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Distribución del Portafolio</Text>
                {byType.map(({ key, label, icon, value, percentage }) => (
                  <View key={key} style={styles.allocationRow}>
                    <Text style={styles.allocationIcon}>{icon}</Text>
                    <View style={styles.allocationInfo}>
                      <View style={styles.allocationHeader}>
                        <Text style={styles.allocationLabel}>{label}</Text>
                        <Text style={styles.allocationValue}>{formatCurrency(value)}</Text>
                      </View>
                      <View style={styles.allocationBarBg}>
                        <LinearGradient
                          colors={colors.gradientPrimary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.allocationBar, { width: `${percentage}%` as `${number}%` }]}
                        />
                      </View>
                      <Text style={styles.allocationPercent}>{percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Individual investments */}
            <Text style={styles.sectionTitle}>Inversiones ({investments.length})</Text>
            {investments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No tienes inversiones registradas aún</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setActiveTab('add')}
                >
                  <Text style={styles.emptyButtonText}>Agregar Primera Inversión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              investments.map((inv) => {
                const ret = inv.currentValue - inv.purchaseValue;
                const retPct = inv.purchaseValue > 0
                  ? ((inv.currentValue - inv.purchaseValue) / inv.purchaseValue) * 100
                  : 0;
                return (
                  <View key={inv.id} style={styles.investmentCard}>
                    <View style={styles.investmentHeader}>
                      <View style={styles.investmentLeft}>
                        <Text style={styles.investmentIcon}>
                          {INVESTMENT_TYPES.find((t) => t.key === inv.type)?.icon}
                        </Text>
                        <View>
                          <Text style={styles.investmentName}>{inv.name}</Text>
                          <Text style={styles.investmentType}>
                            {INVESTMENT_TYPES.find((t) => t.key === inv.type)?.label} • {inv.date}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeInvestment(inv.id)}>
                        <Text style={styles.deleteBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.investmentValues}>
                      <View>
                        <Text style={styles.valueLabel}>Valor Actual</Text>
                        <Text style={styles.valueAmount}>{formatCurrency(inv.currentValue)}</Text>
                      </View>
                      <View style={styles.returnBadge}>
                        <Text style={[styles.returnText, { color: ret >= 0 ? colors.secondary : colors.danger }]}>
                          {ret >= 0 ? '▲' : '▼'} {retPct.toFixed(1)}%
                        </Text>
                        <Text style={[styles.returnAmount, { color: ret >= 0 ? colors.secondary : colors.danger }]}>
                          {ret >= 0 ? '+' : ''}{formatCurrency(ret)}
                        </Text>
                      </View>
                    </View>
                    {inv.notes ? <Text style={styles.investmentNotes}>{inv.notes}</Text> : null}
                  </View>
                );
              })
            )}

            {/* Get recommendations button */}
            <TouchableOpacity style={styles.recommendButton} onPress={handleGetRecommendations}>
              <LinearGradient colors={colors.gradientPurple} style={styles.recommendGradient}>
                <Text style={styles.recommendText}>🧠 Obtener Recomendaciones del Gurú</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <View style={styles.section}>
            {/* Total savings summary */}
            {goals.length > 0 && (
              <FinancialCard
                title="Total en Metas de Ahorro"
                value={`${profile.currency} ${goals.reduce((s, g) => s + g.currentAmount, 0).toLocaleString('es', { maximumFractionDigits: 0 })}`}
                subtitle={`Objetivo total: ${profile.currency} ${goals.reduce((s, g) => s + g.targetAmount, 0).toLocaleString('es', { maximumFractionDigits: 0 })}`}
                icon="🎯"
                gradientColors={['#4C1D95', '#6D28D9']}
              />
            )}

            {goals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyText}>
                  Aún no tienes metas de ahorro. ¡Crea tu primera meta y el Gurú te ayudará a alcanzarla!
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setGoalModalVisible(true)}
                >
                  <Text style={styles.emptyButtonText}>Crear Primera Meta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={removeGoal}
                    onAskGuru={handleAskGuruGoal}
                    onAddFunds={handleAddFunds}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addGoalButton}
                  onPress={() => setGoalModalVisible(true)}
                >
                  <Text style={styles.addGoalButtonText}>➕ Agregar Nueva Meta</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === 'recommendations' && (
          <View style={styles.section}>
            {/* Goal strategy header when coming from a goal */}
            {strategyGoal ? (
              <>
                <View style={styles.recommendHeader}>
                  <Text style={styles.sectionTitle}>
                    {strategyGoal.icon} Estrategia: {strategyGoal.name}
                  </Text>
                  <TouchableOpacity onPress={() => { setStrategyGoal(null); setGoalStrategy(''); }}>
                    <Text style={styles.refreshBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {isLoadingStrategy ? (
                  <View style={styles.loadingSection}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>El Gurú está diseñando tu estrategia...</Text>
                    {streamingStrategy ? (
                      <View style={styles.streamingBox}>
                        <Text style={styles.streamingText}>{streamingStrategy}▌</Text>
                      </View>
                    ) : null}
                  </View>
                ) : goalStrategy ? (
                  <View style={styles.recommendationsBox}>
                    <Text style={styles.recommendationsText}>{goalStrategy}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.recommendButton, { marginTop: 8 }]}
                  onPress={handleGetRecommendations}
                >
                  <LinearGradient colors={colors.gradientPurple} style={styles.recommendGradient}>
                    <Text style={styles.recommendText}>🧠 Ver Consejos de Inversión</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.recommendHeader}>
                  <Text style={styles.sectionTitle}>🧠 Consejos de Inversión Personalizados</Text>
                  <TouchableOpacity onPress={handleGetRecommendations} disabled={isLoadingRec}>
                    <Text style={styles.refreshBtn}>{isLoadingRec ? '⏳' : '🔄'}</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingRec ? (
                  <View style={styles.loadingSection}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>El Gurú está analizando tu situación...</Text>
                    {streamingRec ? (
                      <View style={styles.streamingBox}>
                        <Text style={styles.streamingText}>{streamingRec}▌</Text>
                      </View>
                    ) : null}
                  </View>
                ) : recommendations ? (
                  <View style={styles.recommendationsBox}>
                    <Text style={styles.recommendationsText}>{recommendations}</Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={styles.emptyText}>
                      Pulsa el botón de recomendaciones para que el Gurú analice tu perfil y sugiera las mejores inversiones para ti
                    </Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={handleGetRecommendations}>
                      <Text style={styles.emptyButtonText}>Obtener Recomendaciones</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ADD INVESTMENT TAB */}
        {activeTab === 'add' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nueva Inversión</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre (ej: Apple AAPL, Bitcoin, S&P 500 ETF)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Tipo de Inversión</Text>
            <View style={styles.typeGrid}>
              {INVESTMENT_TYPES.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeChip, type === key && styles.typeChipActive]}
                  onPress={() => setType(key)}
                >
                  <Text style={styles.typeChipIcon}>{icon}</Text>
                  <Text style={[styles.typeChipLabel, type === key && styles.typeChipLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Valor actual"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={currentValue}
              onChangeText={setCurrentValue}
            />
            <TextInput
              style={styles.input}
              placeholder="Valor de compra / costo inicial"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={purchaseValue}
              onChangeText={setPurchaseValue}
            />
            <TextInput
              style={styles.input}
              placeholder="Fecha de compra (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={investDate}
              onChangeText={setInvestDate}
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notas adicionales (opcional)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleAddInvestment}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.buttonGradient}>
                <Text style={styles.primaryButtonText}>💼 Agregar al Portafolio</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  addGoalButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addGoalButtonText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  content: { flex: 1 },
  section: { padding: 16, gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfCard: { flex: 1 },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allocationIcon: { fontSize: 24, width: 30, textAlign: 'center' },
  allocationInfo: { flex: 1, gap: 4 },
  allocationHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  allocationLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  allocationValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  allocationBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  allocationBar: { height: 6, borderRadius: 3 },
  allocationPercent: { fontSize: 11, color: colors.textMuted },
  investmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  investmentIcon: { fontSize: 24 },
  investmentName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  investmentType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { fontSize: 14, color: colors.textMuted, padding: 4 },
  investmentValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: { fontSize: 11, color: colors.textMuted },
  valueAmount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  returnBadge: { alignItems: 'flex-end' },
  returnText: { fontSize: 14, fontWeight: '700' },
  returnAmount: { fontSize: 12, fontWeight: '600' },
  investmentNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: { color: colors.background, fontWeight: '700', fontSize: 14 },
  recommendButton: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  recommendGradient: { padding: 15, alignItems: 'center' },
  recommendText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  recommendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { fontSize: 22 },
  loadingSection: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  streamingBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  streamingText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  recommendationsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationsText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: { height: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  typeChipIcon: { fontSize: 16 },
  typeChipLabel: { fontSize: 13, color: colors.textSecondary },
  typeChipLabelActive: { color: colors.primary, fontWeight: '600' },
  primaryButton: { borderRadius: 14, overflow: 'hidden' },
  buttonGradient: { padding: 15, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
