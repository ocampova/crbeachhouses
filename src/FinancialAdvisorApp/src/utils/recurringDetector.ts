/**
 * Recurring Transaction Detector
 *
 * Pure utility — no API calls. Analyzes transaction history to detect
 * subscriptions and recurring expenses based on description similarity,
 * amount proximity, and date interval patterns.
 */

import { Transaction } from '../store/useFinancialStore';

export interface RecurringItem {
  description: string;
  normalizedDescription: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'yearly' | 'irregular';
  occurrences: number;
  lastDate: string;
  nextExpectedDate: string;
  monthlyCost: number;
  yearlyCost: number;
  category: string;
}

/** Normalize description: lowercase, remove special chars, trim */
function normalize(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein similarity ratio 0..1 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= lb; i++) matrix[i] = [i];
  for (let j = 0; j <= la; j++) matrix[0][j] = j;

  for (let i = 1; i <= lb; i++) {
    for (let j = 1; j <= la; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(la, lb);
  return 1 - matrix[lb][la] / maxLen;
}

/** Estimate median interval in days between sorted dates */
function medianIntervalDays(dates: string[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort();
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1]).getTime();
    const b = new Date(sorted[i]).getTime();
    intervals.push((b - a) / (1000 * 60 * 60 * 24));
  }
  intervals.sort((a, b) => a - b);
  return intervals[Math.floor(intervals.length / 2)];
}

function classifyFrequency(days: number): RecurringItem['frequency'] {
  if (days >= 6 && days <= 8) return 'weekly';
  if (days >= 25 && days <= 35) return 'monthly';
  if (days >= 350 && days <= 380) return 'yearly';
  return 'irregular';
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().split('T')[0];
}

function monthlyCostFor(frequency: RecurringItem['frequency'], amount: number): number {
  if (frequency === 'weekly') return amount * 4.33;
  if (frequency === 'monthly') return amount;
  if (frequency === 'yearly') return amount / 12;
  return amount; // assume monthly for irregular
}

/**
 * Detect recurring expenses from a transaction list.
 * Only considers expense transactions.
 * Groups by similar description + similar amount, requires ≥ 2 occurrences.
 */
export function detectRecurring(transactions: Transaction[]): RecurringItem[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length < 2) return [];

  // Group by normalized description + amount bucket
  type Group = {
    transactions: Transaction[];
    normalizedDescription: string;
  };
  const groups: Group[] = [];

  for (const t of expenses) {
    const norm = normalize(t.description);
    let matched = false;

    for (const group of groups) {
      const rep = group.transactions[0];
      const descSim = similarity(norm, group.normalizedDescription);
      const amountDiff = Math.abs(t.amount - rep.amount) / Math.max(t.amount, rep.amount, 1);

      if (descSim >= 0.75 && amountDiff <= 0.2) {
        group.transactions.push(t);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({ transactions: [t], normalizedDescription: norm });
    }
  }

  const recurring: RecurringItem[] = [];

  for (const group of groups) {
    if (group.transactions.length < 2) continue;

    const sortedDates = [...group.transactions.map((t) => t.date)].sort();
    const intervalDays = medianIntervalDays(sortedDates);
    const frequency = classifyFrequency(intervalDays);

    // Skip items with no clear recurring pattern (too long / too short interval)
    if (frequency === 'irregular' && intervalDays > 400) continue;

    const rep = group.transactions[0];
    const amounts = group.transactions.map((t) => t.amount);
    const medianAmount = amounts.sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
    const lastDate = sortedDates[sortedDates.length - 1];
    const nextExpected = addDays(lastDate, intervalDays || 30);
    const monthlyCost = monthlyCostFor(frequency, medianAmount);

    recurring.push({
      description: rep.description,
      normalizedDescription: group.normalizedDescription,
      amount: medianAmount,
      currency: rep.currency,
      frequency,
      occurrences: group.transactions.length,
      lastDate,
      nextExpectedDate: nextExpected,
      monthlyCost,
      yearlyCost: monthlyCost * 12,
      category: rep.category,
    });
  }

  // Sort by monthly cost descending
  return recurring.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
