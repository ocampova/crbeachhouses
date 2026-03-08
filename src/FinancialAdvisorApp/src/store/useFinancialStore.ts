import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  source: 'manual' | 'pdf' | 'email';
  rawText?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'stocks' | 'crypto' | 'real_estate' | 'bonds' | 'funds' | 'other';
  currentValue: number;
  purchaseValue: number;
  currency: string;
  date: string;
  notes?: string;
}

export interface FinancialProfile {
  name: string;
  monthlyIncome: number;
  currency: string;
  riskTolerance: 'low' | 'medium' | 'high';
  investmentGoals: string[];
  age: number;
  country: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  topExpenseCategories: { category: string; amount: number; percentage: number }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
}

interface FinancialState {
  profile: FinancialProfile;
  transactions: Transaction[];
  investments: Investment[];
  chatHistory: ChatMessage[];
  isAdvisorThinking: boolean;
  avatarMood: 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited';

  // Actions
  setProfile: (profile: Partial<FinancialProfile>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  removeTransaction: (id: string) => void;
  addInvestment: (investment: Omit<Investment, 'id'>) => void;
  removeInvestment: (id: string) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void;
  updateLastMessage: (content: string, isStreaming: boolean) => void;
  setAdvisorThinking: (thinking: boolean) => void;
  setAvatarMood: (mood: FinancialState['avatarMood']) => void;
  getFinancialSummary: () => FinancialSummary;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  clearChat: () => void;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useFinancialStore = create<FinancialState>((set, get) => ({
  profile: {
    name: '',
    monthlyIncome: 0,
    currency: 'USD',
    riskTolerance: 'medium',
    investmentGoals: [],
    age: 30,
    country: 'Costa Rica',
  },
  transactions: [],
  investments: [],
  chatHistory: [],
  isAdvisorThinking: false,
  avatarMood: 'neutral',

  setProfile: (profileUpdate) =>
    set((state) => {
      const newState = { ...state, profile: { ...state.profile, ...profileUpdate } };
      get().saveToStorage();
      return newState;
    }),

  addTransaction: (transaction) =>
    set((state) => {
      const newState = {
        ...state,
        transactions: [
          { ...transaction, id: generateId() },
          ...state.transactions,
        ],
      };
      get().saveToStorage();
      return newState;
    }),

  addTransactions: (transactions) =>
    set((state) => {
      const newTransactions = transactions.map((t) => ({ ...t, id: generateId() }));
      const newState = {
        ...state,
        transactions: [...newTransactions, ...state.transactions],
      };
      get().saveToStorage();
      return newState;
    }),

  removeTransaction: (id) =>
    set((state) => {
      const newState = {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== id),
      };
      get().saveToStorage();
      return newState;
    }),

  addInvestment: (investment) =>
    set((state) => {
      const newState = {
        ...state,
        investments: [{ ...investment, id: generateId() }, ...state.investments],
      };
      get().saveToStorage();
      return newState;
    }),

  removeInvestment: (id) =>
    set((state) => {
      const newState = {
        ...state,
        investments: state.investments.filter((i) => i.id !== id),
      };
      get().saveToStorage();
      return newState;
    }),

  addChatMessage: (message) =>
    set((state) => ({
      ...state,
      chatHistory: [...state.chatHistory, { ...message, id: generateId() }],
    })),

  updateLastMessage: (content, isStreaming) =>
    set((state) => {
      const messages = [...state.chatHistory];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
          isStreaming,
        };
      }
      return { ...state, chatHistory: messages };
    }),

  setAdvisorThinking: (thinking) => set({ isAdvisorThinking: thinking }),
  setAvatarMood: (mood) => set({ avatarMood: mood }),

  clearChat: () => set({ chatHistory: [] }),

  getFinancialSummary: (): FinancialSummary => {
    const { transactions } = get();
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Top expense categories
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        expensesByCategory[t.category] =
          (expensesByCategory[t.category] || 0) + t.amount;
      });

    const topExpenseCategories = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }));

    // Monthly trend (last 6 months)
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach((t) => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
      if (t.type === 'income') monthlyData[month].income += t.amount;
      else monthlyData[month].expenses += t.amount;
    });

    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, ...data }));

    return { totalIncome, totalExpenses, netSavings, savingsRate, topExpenseCategories, monthlyTrend };
  },

  loadFromStorage: async () => {
    try {
      const [profile, transactions, investments, chatHistory] = await Promise.all([
        AsyncStorage.getItem('financial_profile'),
        AsyncStorage.getItem('financial_transactions'),
        AsyncStorage.getItem('financial_investments'),
        AsyncStorage.getItem('financial_chat'),
      ]);

      set({
        profile: profile ? JSON.parse(profile) : get().profile,
        transactions: transactions ? JSON.parse(transactions) : [],
        investments: investments ? JSON.parse(investments) : [],
        chatHistory: chatHistory ? JSON.parse(chatHistory) : [],
      });
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const { profile, transactions, investments, chatHistory } = get();
      await Promise.all([
        AsyncStorage.setItem('financial_profile', JSON.stringify(profile)),
        AsyncStorage.setItem('financial_transactions', JSON.stringify(transactions)),
        AsyncStorage.setItem('financial_investments', JSON.stringify(investments)),
        AsyncStorage.setItem('financial_chat', JSON.stringify(chatHistory.slice(-50))), // Keep last 50
      ]);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));
