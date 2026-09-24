import type { Transaction } from './types';
import { formatDate, formatVnd } from './util';
import { INTERNAL_CATEGORY, MESSAGES, UNCATEGORIZED } from './text';

export interface SpendingSummary {
  total: number;
  count: number;
  byCategory: { category: string; amount: number }[];
  uncategorized: number;
  uncategorizedItems: Transaction[];
}

/** Total spending in [from, to): skips income, rows with no amount yet, and internal transfers. */
export function summarizeSpending(txs: Transaction[], from: Date, to: Date): SpendingSummary {
  const totals: Record<string, number> = {};
  const uncategorizedItems: Transaction[] = [];
  let total = 0;
  let count = 0;

  for (const tx of txs) {
    const t = tx.time instanceof Date ? tx.time.getTime() : NaN;
    if (isNaN(t) || t < from.getTime() || t >= to.getTime()) continue;
    if (tx.direction !== 'out' || tx.category === INTERNAL_CATEGORY || tx.amount == null) continue;

    const category = tx.category || UNCATEGORIZED;
    totals[category] = (totals[category] || 0) + tx.amount;
    total += tx.amount;
    count++;
    if (category === UNCATEGORIZED) uncategorizedItems.push(tx);
  }

  const byCategory = Object.keys(totals)
    .map(category => ({ category, amount: totals[category] }))
    .sort((a, b) => b.amount - a.amount);
  uncategorizedItems.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  return { total, count, byCategory, uncategorized: uncategorizedItems.length, uncategorizedItems };
}

export function buildWeeklyReport(summary: SpendingSummary, from: Date, to: Date, appUrl: string) {
  const range = formatDate(from) + ' to ' + formatDate(new Date(to.getTime() - 1));
  const lines = [MESSAGES.reportTotal(range, formatVnd(summary.total), summary.count), ''];

  if (summary.byCategory.length) {
    lines.push(MESSAGES.reportTop);
    summary.byCategory.slice(0, 5).forEach(c => lines.push('• ' + c.category + ': ' + formatVnd(c.amount)));
    lines.push('');
  }
  if (summary.uncategorized) {
    lines.push(MESSAGES.reportUncategorized(summary.uncategorized));
    summary.uncategorizedItems.slice(0, 10).forEach(tx => {
      lines.push('• ' + formatDate(tx.time) + ' · ' + formatVnd(tx.amount) + ' · ' + tx.source + (tx.description ? ' · ' + tx.description : ''));
    });
    lines.push('');
  }
  lines.push(MESSAGES.reportOpen + ' ' + appUrl);

  return { subject: MESSAGES.reportSubject(range, formatVnd(summary.total)), body: lines.join('\n') };
}
