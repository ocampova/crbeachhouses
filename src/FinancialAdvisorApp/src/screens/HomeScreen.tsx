import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GuruAvatar } from '../components/GuruAvatar';
import { ChatBubble } from '../components/ChatBubble';
import { LoadingDots } from '../components/LoadingDots';
import { HealthScoreBadge } from '../components/HealthScoreBadge';
import { InsightCard } from '../components/InsightCard';
import { colors } from '../theme/colors';
import { useFinancialStore } from '../store/useFinancialStore';
import { sendMessageToAdvisor } from '../services/financialAdvisor';
import { getMemoryMeta } from '../services/memoryService';

const QUICK_PROMPTS = [
  '¿Cómo están mis finanzas?',
  '¿Dónde puedo invertir?',
  '¿Cómo reducir mis gastos?',
  '¿Cuál es mi tasa de ahorro?',
];

export function HomeScreen() {
  const {
    chatHistory,
    isAdvisorThinking,
    avatarMood,
    profile,
    transactions,
    memoryVersion,
    pendingInsights,
    addChatMessage,
    updateLastMessage,
    setAdvisorThinking,
    setAvatarMood,
    bumpMemoryVersion,
    dismissInsight,
    getFinancialSummary,
    getHealthScore,
    loadFromStorage,
    saveToStorage,
  } = useFinancialStore();

  const [inputText, setInputText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [memoryFileCount, setMemoryFileCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const memoryPulse = useRef(new Animated.Value(1)).current;

  // Reload memory count whenever consolidation runs
  useEffect(() => {
    getMemoryMeta().then((m) => setMemoryFileCount(m.fileCount));
  }, [memoryVersion]);

  // Pulse animation when consolidation finishes (memoryVersion bumps)
  useEffect(() => {
    if (memoryVersion > 0) {
      Animated.sequence([
        Animated.timing(memoryPulse, { toValue: 1.6, duration: 250, useNativeDriver: true }),
        Animated.timing(memoryPulse, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [memoryVersion, memoryPulse]);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0 && profile.name) {
      addChatMessage({
        role: 'assistant',
        content: `¡Hola, ${profile.name}! 👋 Soy tu **Gurú Financiero Personal**. Estoy aquí para ayudarte a tomar las mejores decisiones con tu dinero.\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date().toISOString(),
      });
    } else if (chatHistory.length === 0) {
      addChatMessage({
        role: 'assistant',
        content: `¡Bienvenido! 👋 Soy tu **Gurú Financiero Personal**.\n\nPara empezar, te recomiendo ir a la sección de **Perfil** y configurar tus datos financieros. Así podré darte recomendaciones personalizadas. 📊\n\n¿Tienes alguna pregunta sobre finanzas o inversiones?`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [profile.name]);

  const handleSend = async (text?: string) => {
    const messageText = (text ?? inputText).trim();
    if (!messageText || isAdvisorThinking) return;

    setInputText('');

    addChatMessage({
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    });

    setAdvisorThinking(true);
    setIsTalking(false);

    addChatMessage({
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    });

    const summary = getFinancialSummary();
    const history = chatHistory
      .filter((m) => m.content)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    let streamedText = '';

    await sendMessageToAdvisor(
      messageText,
      history,
      profile,
      summary,
      transactions,
      {
        onToken: (token) => {
          streamedText += token;
          updateLastMessage(streamedText, true);
          setIsTalking(true);
          flatListRef.current?.scrollToEnd({ animated: false });
        },
        onComplete: (fullText) => {
          updateLastMessage(fullText, false);
          setAdvisorThinking(false);
          setIsTalking(false);
          saveToStorage();
          setTimeout(() => setAvatarMood('neutral'), 3000);
          setTimeout(() => bumpMemoryVersion(), 4000);
        },
        onError: (error) => {
          updateLastMessage(
            `Lo siento, tuve un problema al procesar tu consulta. Por favor intenta de nuevo. (${error.message})`,
            false
          );
          setAdvisorThinking(false);
          setIsTalking(false);
          setAvatarMood('concerned');
        },
        onMoodChange: setAvatarMood,
      }
    );
  };

  const handleInsightTap = (insight: ReturnType<typeof useFinancialStore.getState>['pendingInsights'][0]) => {
    dismissInsight(insight.id);
    handleSend(`💡 ${insight.title}: ${insight.body}`);
  };

  const handleAskAboutScore = () => {
    const hs = getHealthScore();
    handleSend(
      `¿Por qué mi puntaje de salud financiera es ${hs.score}/100 (${hs.label})? ` +
      `Desglose: ahorro ${hs.breakdown.savings}/30, presupuestos ${hs.breakdown.budgets}/25, ` +
      `inversiones ${hs.breakdown.investments}/20, fondo emergencia ${hs.breakdown.emergency}/15, ` +
      `perfil ${hs.breakdown.profile}/10. ¿Cómo puedo mejorarlo?`
    );
  };

  const handleClearChat = () => {
    Alert.alert(
      'Limpiar conversación',
      '¿Deseas limpiar el historial de chat?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => useFinancialStore.getState().clearChat(),
        },
      ]
    );
  };

  const healthScore = getHealthScore();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header with Avatar */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.avatarSection}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>Tu Gurú Financiero</Text>
            <Text style={styles.statusText}>
              {isAdvisorThinking ? '🤔 Pensando...' : '🟢 Disponible'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Health Score Badge */}
            <HealthScoreBadge
              healthScore={healthScore}
              size={64}
              onPress={handleAskAboutScore}
            />
            {/* Memory badge */}
            <Animated.View
              style={[styles.memoryBadge, { transform: [{ scale: memoryPulse }] }]}
            >
              <Text style={styles.memoryBadgeIcon}>🧠</Text>
              {memoryFileCount > 0 && (
                <View style={styles.memoryCount}>
                  <Text style={styles.memoryCountText}>{memoryFileCount}</Text>
                </View>
              )}
            </Animated.View>
            <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <GuruAvatar mood={avatarMood} isTalking={isTalking} size={130} />

        {/* Proactive Insight Cards */}
        {pendingInsights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsLabel}>💡 El Gurú tiene algo para decirte</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsList}
            >
              {pendingInsights.slice(0, 5).map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={dismissInsight}
                  onTap={handleInsightTap}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick prompts */}
        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              style={({ pressed }) => [styles.quickPrompt, pressed && styles.quickPromptPressed]}
              onPress={() => setInputText(prompt)}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Chat area */}
      <View style={styles.chatArea}>
        <FlatList
          ref={flatListRef}
          data={chatHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.chatList}
          ListFooterComponent={
            isAdvisorThinking && chatHistory[chatHistory.length - 1]?.content === ''
              ? <LoadingDots />
              : null
          }
        />
      </View>

      {/* Input area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escríbele al Gurú..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isAdvisorThinking) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isAdvisorThinking}
        >
          <LinearGradient
            colors={colors.gradientPrimary}
            style={styles.sendButtonGradient}
          >
            <Text style={styles.sendButtonText}>
              {isAdvisorThinking ? '⏳' : '➤'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memoryBadge: {
    padding: 6,
    position: 'relative',
  },
  memoryBadgeIcon: {
    fontSize: 22,
  },
  memoryCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  memoryCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
  },
  insightsSection: {
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  insightsLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 2,
  },
  insightsList: {
    gap: 8,
    paddingRight: 12,
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  quickPrompt: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPromptPressed: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  quickPromptText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatArea: {
    flex: 1,
  },
  chatList: {
    paddingVertical: 12,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    color: colors.background,
    fontWeight: '700',
  },
});
