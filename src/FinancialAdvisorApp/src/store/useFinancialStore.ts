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

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  category: string;
  limit: number;
  currency: string;
  period: 'monthly';
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'over';
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  currency: string;
  color: string;
}

// ─── Proactive Insights ───────────────────────────────────────────────────────

export interface Insight {
  id: string;
  title: string;
  body: string;
  type: 'warning' | 'opportunity' | 'info';
  createdAt: string;
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export interface HealthScore {
  score: number; // 0–100
  breakdown: {
    savings: number;     // 0–30
    budgets: number;     // 0–25
    investments: number; // 0–20
    emergency: number;   // 0–15
    profile: number;     // 0–10
  };
  label: string;
  color: string;
}

interface FinancialState {
  profile: FinancialProfile;
  transactions: Transaction[];
  investments: Investment[];
  chatHistory: ChatMessage[];
  isAdvisorThinking: boolean;
  avatarMood: 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited';
  /** Number of memory consolidations performed (used to refresh memory UI) */
  memoryVersion: number;

  budgets: Budget[];
  goals: SavingsGoal[];
  pendingInsights: Insight[];

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
  bumpMemoryVersion: () => void;

  // Budget actions
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id'>>) => void;
  removeBudget: (id: string) => void;
  getBudgetStatus: () => BudgetStatus[];

  // Goal actions
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id'>>) => void;
  removeGoal: (id: string) => void;

  // Insight actions
  addInsight: (insight: Omit<Insight, 'id'>) => void;
  addInsights: (insights: Omit<Insight, 'id'>[]) => void;
  dismissInsight: (id: string) => void;
  clearInsights: () => void;

  // Computed
  getFinancialSummary: () => FinancialSummary;
  getHealthScore: () => HealthScore;

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
  memoryVersion: 0,
  budgets: [],
  goals: [],
  pendingInsights: [],

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
  bumpMemoryVersion: () => set((s) => ({ memoryVersion: s.memoryVersion + 1 })),

  clearChat: () => set({ chatHistory: [] }),

  // ─── Budget actions ──────────────────────────────────────────────────────────

  addBudget: (budget) =>
    set((state) => {
      const newState = {
        ...state,
        budgets: [...state.budgets, { ...budget, id: generateId() }],
      };
      get().saveToStorage();
      return newState;
    }),

  updateBudget: (id, updates) =>
    set((state) => {
      const newState = {
        ...state,
        budgets: state.budgets.map((b) => b.id === id ? { ...b, ...updates } : b),
      };
      get().saveToStorage();
      return newState;
    }),

  removeBudget: (id) =>
    set((state) => {
      const newState = {
        ...state,
        budgets: state.budgets.filter((b) => b.id !== id),
      };
      get().saveToStorage();
      return newState;
    }),

  getBudgetStatus: (): BudgetStatus[] => {
    const { budgets, transactions } = get();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlyExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date.startsWith(currentMonth)
    );

    return budgets.map((budget) => {
      const spent = monthlyExpenses
        .filter((t) => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);
      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      const remaining = budget.limit - spent;
      const status: BudgetStatus['status'] =
        percentage >= 100 ? 'over' : percentage >= 85 ? 'warning' : 'safe';
      return { budget, spent, percentage, remaining, status };
    });
  },

  // ─── Goal actions ────────────────────────────────────────────────────────────

  addGoal: (goal) =>
    set((state) => {
      const newState = {
        ...state,
        goals: [...state.goals, { ...goal, id: generateId() }],
      };
      get().saveToStorage();
      return newState;
    }),

  updateGoal: (id, updates) =>
    set((state) => {
      const newState = {
        ...state,
        goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g),
      };
      get().saveToStorage();
      return newState;
    }),

  removeGoal: (id) =>
    set((state) => {
      const newState = {
        ...state,
        goals: state.goals.filter((g) => g.id !== id),
      };
      get().saveToStorage();
      return newState;
    }),

  // ─── Insight actions ─────────────────────────────────────────────────────────

  addInsight: (insight) =>
    set((state) => ({
      pendingInsights: [
        { ...insight, id: generateId() },
        ...state.pendingInsights,
      ],
    })),

  addInsights: (insights) =>
    set((state) => ({
      pendingInsights: [
        ...insights.map((i) => ({ ...i, id: generateId() })),
        ...state.pendingInsights,
      ],
    })),

  dismissInsight: (id) =>
    set((state) => ({
      pendingInsights: state.pendingInsights.filter((i) => i.id !== id),
    })),

  clearInsights: () => set({ pendingInsights: [] }),

  // ─── Health Score ────────────────────────────────────────────────────────────

  getHealthScore: (): HealthScore => {
    const { profile, transactions, investments, budgets } = get();
    const summary = get().getFinancialSummary();

    // 1. Savings score (0–30)
    let savingsScore = 0;
    if (summary.savingsRate >= 20) savingsScore = 30;
    else if (summary.savingsRate > 0) savingsScore = Math.round((summary.savingsRate / 20) * 30);

    // 2. Budget adherence (0–25): start at 25, deduct per over-budget category
    let budgetsScore = 25;
    if (budgets.length > 0) {
      const statuses = get().getBudgetStatus();
      const overCount = statuses.filter((s) => s.status === 'over').length;
      const warnCount = statuses.filter((s) => s.status === 'warning').length;
      budgetsScore = Math.max(0, 25 - overCount * 8 - warnCount * 3);
    }

    // 3. Investment score (0–20)
    let investmentsScore = 0;
    if (investments.length > 0) {
      investmentsScore = 10;
      const types = new Set(investments.map((i) => i.type));
      if (types.size >= 3) investmentsScore = 20;
      else if (types.size >= 2) investmentsScore = 15;
    }

    // 4. Emergency fund (0–15): net savings >= 3× monthly income
    let emergencyScore = 0;
    if (profile.monthlyIncome > 0 && summary.netSavings > 0) {
      const months = summary.netSavings / profile.monthlyIncome;
      if (months >= 3) emergencyScore = 15;
      else emergencyScore = Math.round((months / 3) * 15);
    }

    // 5. Profile completeness (0–10)
    let profileScore = 0;
    if (profile.name) profileScore += 3;
    if (profile.monthlyIncome > 0) profileScore += 3;
    if (profile.age > 0) profileScore += 2;
    if (profile.country) profileScore += 2;

    const score = savingsScore + budgetsScore + investmentsScore + emergencyScore + profileScore;

    let label: string;
    let color: string;
    if (score >= 80) { label = 'Excelente'; color = '#10B981'; }
    else if (score >= 60) { label = 'Bueno'; color = '#F59E0B'; }
    else if (score >= 40) { label = 'Regular'; color = '#F97316'; }
    else { label = 'Necesita atención'; color = '#EF4444'; }

    return {
      score,
      breakdown: {
        savings: savingsScore,
        budgets: budgetsScore,
        investments: investmentsScore,
        emergency: emergencyScore,
        profile: profileScore,
      },
      label,
      color,
    };
  },

  // ─── Financial Summary ───────────────────────────────────────────────────────

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

    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach((t) => {
      const month = t.date.substring(0, 7);
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

  // ─── Storage ─────────────────────────────────────────────────────────────────

  loadFromStorage: async () => {
    try {
      const [profile, transactions, investments, chatHistory, budgets, goals] = await Promise.all([
        AsyncStorage.getItem('financial_profile'),
        AsyncStorage.getItem('financial_transactions'),
        AsyncStorage.getItem('financial_investments'),
        AsyncStorage.getItem('financial_chat'),
        AsyncStorage.getItem('financial_budgets'),
        AsyncStorage.getItem('financial_goals'),
      ]);

      set({
        profile: profile ? JSON.parse(profile) : get().profile,
        transactions: transactions ? JSON.parse(transactions) : [],
        investments: investments ? JSON.parse(investments) : [],
        chatHistory: chatHistory ? JSON.parse(chatHistory) : [],
        budgets: budgets ? JSON.parse(budgets) : [],
        goals: goals ? JSON.parse(goals) : [],
      });
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const { profile, transactions, investments, chatHistory, budgets, goals } = get();
      await Promise.all([
        AsyncStorage.setItem('financial_profile', JSON.stringify(profile)),
        AsyncStorage.setItem('financial_transactions', JSON.stringify(transactions)),
        AsyncStorage.setItem('financial_investments', JSON.stringify(investments)),
        AsyncStorage.setItem('financial_chat', JSON.stringify(chatHistory.slice(-50))),
        AsyncStorage.setItem('financial_budgets', JSON.stringify(budgets)),
        AsyncStorage.setItem('financial_goals', JSON.stringify(goals)),
      ]);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));
