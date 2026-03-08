import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GuruAvatar } from '../components/GuruAvatar';
import { ChatBubble } from '../components/ChatBubble';
import { LoadingDots } from '../components/LoadingDots';
import { colors } from '../theme/colors';
import { useFinancialStore } from '../store/useFinancialStore';
import { sendMessageToAdvisor } from '../services/financialAdvisor';

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
    addChatMessage,
    updateLastMessage,
    setAdvisorThinking,
    setAvatarMood,
    getFinancialSummary,
    loadFromStorage,
    saveToStorage,
  } = useFinancialStore();

  const [inputText, setInputText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0 && profile.name) {
      // Welcome message
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

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isAdvisorThinking) return;

    setInputText('');

    // Add user message
    addChatMessage({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });

    setAdvisorThinking(true);
    setIsTalking(false);

    // Add empty assistant message for streaming
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
      text,
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

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
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
          <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <GuruAvatar mood={avatarMood} isTalking={isTalking} size={140} />

        {/* Quick prompts */}
        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              style={({ pressed }) => [styles.quickPrompt, pressed && styles.quickPromptPressed]}
              onPress={() => handleQuickPrompt(prompt)}
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
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isAdvisorThinking) && styles.sendButtonDisabled]}
          onPress={handleSend}
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
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
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
