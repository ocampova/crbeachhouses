import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { FinancialCard } from '../components/FinancialCard';
import { useFinancialStore, Transaction } from '../store/useFinancialStore';
import { analyzePDFDocument, analyzeEmailContent } from '../services/financialAdvisor';
import {
  authenticateWithGmail,
  fetchFinancialEmails,
  isGmailAuthenticated,
  signOutFromGmail,
  EmailMessage,
} from '../services/gmailService';

type Tab = 'overview' | 'add' | 'pdf' | 'email';

const EXPENSE_CATEGORIES = [
  'Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud',
  'Educación', 'Entretenimiento', 'Ropa', 'Tecnología', 'Otros',
];
const INCOME_CATEGORIES = [
  'Salario', 'Freelance', 'Inversiones', 'Alquiler', 'Negocio', 'Otros',
];

export function FinancesScreen() {
  const {
    transactions,
    getFinancialSummary,
    addTransaction,
    addTransactions,
    removeTransaction,
    profile,
  } = useFinancialStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [analysisModal, setAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState<Omit<Transaction, 'id'>[]>([]);

  const [gmailAuthenticated, setGmailAuthenticated] = useState(false);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [emailContent, setEmailContent] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

  const summary = getFinancialSummary();

  const handleAddTransaction = () => {
    if (!amount || !description || !category) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    addTransaction({
      type: transactionType,
      category,
      description,
      amount: numAmount,
      currency: profile.currency,
      date,
      source: 'manual',
    });
    setAmount('');
    setDescription('');
    setCategory('');
    Alert.alert('✅ Listo', 'Transacción agregada exitosamente');
  };

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsProcessing(true);
      setProcessingText('');
      setActiveTab('pdf');

      await analyzePDFDocument(file.uri, file.name, {
        onToken: (token) => {
          setProcessingText((prev) => prev + token);
        },
        onComplete: (fullText) => {
          setIsProcessing(false);
        },
        onError: (err) => {
          setIsProcessing(false);
          Alert.alert('Error', `No se pudo analizar el PDF: ${err.message}`);
        },
      }).then((result) => {
        setAnalysisResult(result.summary);
        setPendingTransactions(result.transactions);
        if (result.transactions.length > 0) {
          setAnalysisModal(true);
        }
      }).catch(() => {
        setIsProcessing(false);
      });
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Error', 'No se pudo abrir el documento');
    }
  };

  const handleConfirmImport = () => {
    addTransactions(pendingTransactions);
    setAnalysisModal(false);
    setPendingTransactions([]);
    Alert.alert('✅ Importado', `Se importaron ${pendingTransactions.length} transacciones del PDF`);
  };

  const handleGmailAuth = async () => {
    const tokens = await authenticateWithGmail();
    if (tokens) {
      setGmailAuthenticated(true);
      handleFetchEmails();
    } else {
      Alert.alert('Error', 'No se pudo conectar con Gmail');
    }
  };

  const handleFetchEmails = async () => {
    setIsProcessing(true);
    try {
      const fetchedEmails = await fetchFinancialEmails(15);
      setEmails(fetchedEmails);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron obtener los correos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
    setIsProcessing(true);
    setProcessingText('');

    const content = `De: ${email.from}\nFecha: ${email.date}\nAsunto: ${email.subject}\n\n${email.body || email.snippet}`;

    await analyzeEmailContent(content, {
      onToken: (token) => {
        setProcessingText((prev) => prev + token);
      },
      onComplete: () => {
        setIsProcessing(false);
      },
      onError: (err) => {
        setIsProcessing(false);
        Alert.alert('Error', err.message);
      },
    }).then((result) => {
      setAnalysisResult(result.summary);
      setPendingTransactions(result.transactions);
      if (result.transactions.length > 0) {
        setAnalysisModal(true);
      }
    }).catch(() => setIsProcessing(false));
  };

  const handleManualEmailAnalysis = async () => {
    if (!emailContent.trim()) {
      Alert.alert('Error', 'Pega el contenido del correo primero');
      return;
    }
    setIsProcessing(true);
    setProcessingText('');

    await analyzeEmailContent(emailContent, {
      onToken: (token) => setProcessingText((prev) => prev + token),
      onComplete: () => setIsProcessing(false),
      onError: (err) => {
        setIsProcessing(false);
        Alert.alert('Error', err.message);
      },
    }).then((result) => {
      setAnalysisResult(result.summary);
      setPendingTransactions(result.transactions);
      if (result.transactions.length > 0) setAnalysisModal(true);
    }).catch(() => setIsProcessing(false));
  };

  const formatCurrency = (amount: number) =>
    `${profile.currency} ${amount.toLocaleString('es', { minimumFractionDigits: 2 })}`;

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['overview', 'add', 'pdf', 'email'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'overview' ? '📊' : tab === 'add' ? '➕' : tab === 'pdf' ? '📄' : '📧'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabText]}>
              {tab === 'overview' ? 'Resumen' : tab === 'add' ? 'Agregar' : tab === 'pdf' ? 'PDF' : 'Correos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <View style={styles.cardsGrid}>
              <FinancialCard
                title="Ingresos Totales"
                value={formatCurrency(summary.totalIncome)}
                icon="📈"
                gradientColors={['#065F46', '#047857']}
                style={styles.gridCard}
              />
              <FinancialCard
                title="Gastos Totales"
                value={formatCurrency(summary.totalExpenses)}
                icon="📉"
                gradientColors={['#7F1D1D', '#991B1B']}
                style={styles.gridCard}
              />
            </View>

            <FinancialCard
              title="Ahorro Neto"
              value={formatCurrency(summary.netSavings)}
              subtitle={`Tasa de ahorro: ${summary.savingsRate.toFixed(1)}%`}
              icon={summary.netSavings >= 0 ? '💰' : '⚠️'}
              gradientColors={summary.netSavings >= 0
                ? ['#1E3A5F', '#1E40AF']
                : ['#7F1D1D', '#991B1B']}
              style={{ marginBottom: 12 }}
            />

            {/* Top expense categories */}
            {summary.topExpenseCategories.length > 0 && (
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>📊 Top Gastos por Categoría</Text>
                {summary.topExpenseCategories.map((cat) => (
                  <View key={cat.category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{cat.category}</Text>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryFill,
                          { width: `${cat.percentage}%` as `${number}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent transactions */}
            <Text style={styles.sectionTitle}>🕐 Transacciones Recientes</Text>
            {transactions.slice(0, 10).map((t) => (
              <View key={t.id} style={styles.transactionRow}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: t.type === 'income' ? colors.secondary + '20' : colors.danger + '20' }
                ]}>
                  <Text>{t.type === 'income' ? '📈' : '📉'}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{t.description}</Text>
                  <Text style={styles.transactionMeta}>
                    {t.category} • {t.date} • {t.source === 'pdf' ? '📄' : t.source === 'email' ? '📧' : '✏️'}
                  </Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: t.type === 'income' ? colors.secondary : colors.danger }
                  ]}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => removeTransaction(t.id)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ADD TRANSACTION TAB */}
        {activeTab === 'add' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nueva Transacción</Text>

            {/* Type selector */}
            <View style={styles.typeSelector}>
              {(['income', 'expense'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, transactionType === type && styles.typeButtonActive]}
                  onPress={() => setTransactionType(type)}
                >
                  <Text style={[styles.typeButtonText, transactionType === type && styles.typeButtonTextActive]}>
                    {type === 'income' ? '📈 Ingreso' : '📉 Gasto'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Monto"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Descripción"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Fecha (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
            />

            {/* Categories */}
            <Text style={styles.fieldLabel}>Categoría</Text>
            <View style={styles.categoriesGrid}>
              {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleAddTransaction}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.buttonGradient}>
                <Text style={styles.primaryButtonText}>Agregar Transacción</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* PDF TAB */}
        {activeTab === 'pdf' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 Analizar PDF</Text>
            <Text style={styles.description}>
              Sube un estado de cuenta, factura o recibo en PDF y el Gurú extraerá automáticamente todas las transacciones.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.disabledButton]}
              onPress={handlePickPDF}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={isProcessing ? ['#334155', '#334155'] : colors.gradientPrimary}
                style={styles.buttonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>📤 Seleccionar PDF</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {processingText ? (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisTitle}>🔍 Análisis del Gurú:</Text>
                <ScrollView style={styles.analysisScroll}>
                  <Text style={styles.analysisText}>{processingText}</Text>
                </ScrollView>
              </View>
            ) : null}
          </View>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📧 Analizar Correos</Text>

            {/* Gmail connect button */}
            <View style={styles.gmailSection}>
              <Text style={styles.fieldLabel}>Opción 1: Conectar Gmail</Text>
              <TouchableOpacity
                style={[styles.primaryButton, isProcessing && styles.disabledButton]}
                onPress={handleGmailAuth}
                disabled={isProcessing}
              >
                <LinearGradient colors={['#EA4335', '#C5221F']} style={styles.buttonGradient}>
                  <Text style={styles.primaryButtonText}>
                    {gmailAuthenticated ? '🔄 Actualizar correos' : '🔗 Conectar con Gmail'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {emails.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Correos financieros encontrados ({emails.length})</Text>
                  {emails.map((email) => (
                    <TouchableOpacity
                      key={email.id}
                      style={styles.emailCard}
                      onPress={() => handleAnalyzeEmail(email)}
                    >
                      <Text style={styles.emailSubject}>{email.subject}</Text>
                      <Text style={styles.emailFrom}>{email.from}</Text>
                      <Text style={styles.emailSnippet} numberOfLines={2}>{email.snippet}</Text>
                      <Text style={styles.emailDate}>{email.date}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            <View style={styles.divider} />

            {/* Manual email paste */}
            <Text style={styles.fieldLabel}>Opción 2: Pegar contenido de correo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Pega aquí el contenido del correo con la factura o recibo..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={8}
              value={emailContent}
              onChangeText={setEmailContent}
            />
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.disabledButton]}
              onPress={handleManualEmailAnalysis}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={isProcessing ? ['#334155', '#334155'] : colors.gradientSecondary}
                style={styles.buttonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>🔍 Analizar Correo</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {processingText ? (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisTitle}>🔍 Análisis del Gurú:</Text>
                <ScrollView style={styles.analysisScroll}>
                  <Text style={styles.analysisText}>{processingText}</Text>
                </ScrollView>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Import confirmation modal */}
      <Modal visible={analysisModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Transacciones Detectadas</Text>
            <Text style={styles.modalSubtitle}>
              Se encontraron {pendingTransactions.length} transacciones. ¿Deseas importarlas?
            </Text>
            <ScrollView style={styles.modalList}>
              {pendingTransactions.map((t, i) => (
                <View key={i} style={styles.modalTransaction}>
                  <Text style={styles.modalTransactionText}>
                    {t.type === 'income' ? '📈' : '📉'} {t.description}
                  </Text>
                  <Text style={[
                    styles.modalTransactionAmount,
                    { color: t.type === 'income' ? colors.secondary : colors.danger }
                  ]}>
                    {t.type === 'income' ? '+' : '-'}{t.currency} {t.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setAnalysisModal(false); setPendingTransactions([]); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleConfirmImport}>
                <LinearGradient colors={colors.gradientPrimary} style={styles.buttonGradient}>
                  <Text style={styles.primaryButtonText}>Importar Todo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: { fontSize: 18 },
  tabLabel: { fontSize: 10, color: colors.textMuted },
  activeTabText: { color: colors.primary },
  content: { flex: 1 },
  section: { padding: 16, gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  cardsGrid: { flexDirection: 'row', gap: 10 },
  gridCard: { flex: 1 },
  categoriesSection: { gap: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryName: { width: 90, fontSize: 12, color: colors.textSecondary },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  categoryAmount: { fontSize: 11, color: colors.textMuted, minWidth: 70, textAlign: 'right' },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  transactionMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  transactionRight: { alignItems: 'flex-end', gap: 4 },
  transactionAmount: { fontSize: 14, fontWeight: '700' },
  deleteBtn: { fontSize: 12, color: colors.textMuted, padding: 2 },
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  typeButtonText: { color: colors.textSecondary, fontWeight: '600' },
  typeButtonTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { height: 140, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  categoryChipText: { fontSize: 13, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.primary, fontWeight: '600' },
  primaryButton: { borderRadius: 14, overflow: 'hidden' },
  disabledButton: { opacity: 0.6 },
  buttonGradient: { padding: 15, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  analysisBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  analysisScroll: { maxHeight: 200 },
  analysisText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  gmailSection: { gap: 10 },
  emailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  emailSubject: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  emailFrom: { fontSize: 12, color: colors.primary },
  emailSnippet: { fontSize: 12, color: colors.textSecondary },
  emailDate: { fontSize: 11, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginVertical: 8 },
  modalList: { maxHeight: 250, marginBottom: 12 },
  modalTransaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTransactionText: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  modalTransactionAmount: { fontSize: 13, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  cancelButton: {
    backgroundColor: colors.surfaceLight,
    padding: 15,
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelButtonText: { color: colors.textSecondary, fontWeight: '600' },
});
