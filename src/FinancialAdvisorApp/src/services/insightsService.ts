/**
 * Proactive Insights Service
 *
 * After transactions are added, this service asks Claude to analyze
 * spending patterns and generate short, actionable insight cards.
 * These appear on the HomeScreen as proactive messages from the Gurú
 * without the user having to ask.
 *
 * Runs fire-and-forget — never blocks the UI.
 */

import Anthropic from '@anthropic-ai/sdk';
import { FinancialProfile, FinancialSummary, Transaction, BudgetStatus, Insight } from '../store/useFinancialStore';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });

const INSIGHTS_SYSTEM = `Eres el Gurú Financiero Personal. Tu tarea es analizar los datos financieros del usuario y generar insights proactivos, breves y accionables.

## Reglas:
1. Genera de 1 a 3 insights máximo. Si no hay nada relevante, devuelve un array vacío [].
2. Cada insight debe ser ESPECÍFICO, basado en los datos reales. No genérico.
3. Tipos de insight:
   - "warning": gasto excesivo, presupuesto excedido, tendencia negativa, riesgo
   - "opportunity": oportunidad de ahorro, mes mejor que el anterior, buen comportamiento
   - "info": dato interesante, cambio notable, tendencia neutral
4. El título debe ser corto (max 6 palabras).
5. El cuerpo debe ser máximo 2 oraciones, con datos concretos (montos, porcentajes).
6. NO generes insights sobre saludos, conversaciones o cosas no relacionadas a finanzas.
7. Responde SOLO con JSON válido, sin texto adicional.

## Formato de respuesta:
[
  {
    "title": "Título corto",
    "body": "Descripción concisa con datos específicos. Segunda oración opcional.",
    "type": "warning" | "opportunity" | "info"
  }
]`;

function buildContext(
  profile: FinancialProfile,
  summary: FinancialSummary,
  transactions: Transaction[],
  budgetStatuses: BudgetStatus[]
): string {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthExpenses = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonthExpenses = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(prevMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const overBudget = budgetStatuses.filter((s) => s.status === 'over');
  const nearBudget = budgetStatuses.filter((s) => s.status === 'warning');

  const lines: string[] = [
    `Usuario: ${profile.name || 'sin nombre'} | Ingreso mensual: ${profile.currency} ${profile.monthlyIncome}`,
    `Tasa de ahorro: ${summary.savingsRate.toFixed(1)}% | Ahorro neto: ${profile.currency} ${summary.netSavings.toFixed(0)}`,
    `Gastos este mes (${currentMonth}): ${profile.currency} ${thisMonthExpenses.toFixed(0)}`,
    lastMonthExpenses > 0
      ? `Gastos mes pasado (${prevMonthStr}): ${profile.currency} ${lastMonthExpenses.toFixed(0)} (${((thisMonthExpenses / lastMonthExpenses - 1) * 100).toFixed(1)}% de cambio)`
      : '',
    `Top categorías de gasto: ${summary.topExpenseCategories.slice(0, 3).map((c) => `${c.category} ${c.percentage.toFixed(0)}%`).join(', ')}`,
    overBudget.length > 0
      ? `⚠️ Presupuestos EXCEDIDOS: ${overBudget.map((s) => `${s.budget.category} (${s.percentage.toFixed(0)}% usado)`).join(', ')}`
      : '',
    nearBudget.length > 0
      ? `⚡ Presupuestos CERCA del límite: ${nearBudget.map((s) => `${s.budget.category} (${s.percentage.toFixed(0)}%)`).join(', ')}`
      : '',
    `Total transacciones registradas: ${transactions.length}`,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Generate proactive insights from the user's financial data.
 * Returns an array of insights (may be empty if nothing significant found).
 * Fire-and-forget — callers should NOT await for UI purposes.
 */
export async function generateProactiveInsights(
  profile: FinancialProfile,
  summary: FinancialSummary,
  transactions: Transaction[],
  budgetStatuses: BudgetStatus[]
): Promise<Omit<Insight, 'id' | 'createdAt'>[]> {
  // Don't generate insights if there's very little data
  if (transactions.length < 3) return [];

  const context = buildContext(profile, summary, transactions, budgetStatuses);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      thinking: { type: 'adaptive' },
      system: INSIGHTS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Analiza estos datos financieros y genera insights proactivos:\n\n${context}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return [];

    const raw = textBlock.text.trim();
    // Extract JSON from text (handle cases where there might be surrounding text)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      body: string;
      type: 'warning' | 'opportunity' | 'info';
    }>;

    return parsed
      .filter((i) => i.title && i.body && ['warning', 'opportunity', 'info'].includes(i.type))
      .slice(0, 3);
  } catch (error) {
    console.warn('[Insights] Failed to generate insights:', error);
    return [];
  }
}
