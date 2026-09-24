import { test, expect } from 'vitest';
import { validateManualEntry, buildEmailTransaction, applyFx } from '../src/core/transaction';
import { categorize } from '../src/core/categorize';
import { summarizeSpending, buildWeeklyReport } from '../src/core/summary';

const NOW = new Date('2026-09-13T10:00:00+07:00');
const ctx = () => ({ now: NOW, newId: 'id-1', categories: ['Food & drinks', 'Transport'] });

test('validateManualEntry builds a manual transaction', () => {
  const r = validateManualEntry({ amount: 45000, category: 'Food & drinks', note: ' cà phê ' }, { ...ctx(), person: 'Alex' });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const { time, ...rest } = r.tx;
  expect(time.getTime()).toBe(NOW.getTime());
  expect(rest).toEqual({ id: 'id-1', amount: 45000, direction: 'out', category: 'Food & drinks', description: 'cà phê', person: 'Alex', source: 'manual', sourceId: '' });
  expect((validateManualEntry({ amount: '1tr2', direction: 'in', category: 'Transport' }, ctx()) as any).tx.amount).toBe(1200000);
  expect((validateManualEntry({ amount: 10000, category: 'Nope' }, ctx()) as any).tx.category).toBe('Uncategorized');
  expect((validateManualEntry({ amount: 'abc' }, ctx()) as any).error).toMatch(/Invalid amount/);
});

test('categorize: first rule wins, accents ignored', () => {
  const rules = [{ keyword: 'GrabFood', category: 'Food & drinks' }, { keyword: 'grab', category: 'Transport' }, { keyword: '', category: 'Other' }];
  expect(categorize('GRABFOOD VN', rules)).toBe('Food & drinks');
  expect(categorize('Grab Car', rules)).toBe('Transport');
  expect(categorize('gì đó', rules)).toBe('Uncategorized');
});

test('buildEmailTransaction: small unmatched spending goes to Small spending', () => {
  const build = (amount: number | null, direction: 'in' | 'out' = 'out') =>
    buildEmailTransaction({ amount, direction, description: 'chuyen tien tu vi', time: NOW },
      { id: 'e', source: 'example-bank', sourceId: 'm', person: 'Alex', rules: [], smallAmount: 500000 });
  expect(build(45000).category).toBe('Small spending');
  expect(build(500000).category).toBe('Uncategorized');
  expect(build(45000, 'in').category).toBe('Uncategorized');
  expect(build(null).category).toBe('Uncategorized');
});

test('applyFx', () => {
  const p = { amount: null, direction: 'out' as const, description: '', time: NOW, foreign: { amount: 10, currency: 'USD' } };
  expect(applyFx(p, 25000.4).amount).toBe(250004);
  expect(applyFx(p, 0).amount).toBeNull();
  expect(applyFx(p, 0).description).toMatch(/no exchange rate/);
});

test('summarizeSpending + buildWeeklyReport', () => {
  const d = (s: string) => new Date(s);
  const tx = (o: any) => ({ id: 'x', person: '', source: 'example-bank', sourceId: '', description: '', ...o });
  const txs = [
    tx({ time: d('2026-09-08T09:00:00+07:00'), amount: 100000, direction: 'out', category: 'Food & drinks' }),
    tx({ time: d('2026-09-10T09:00:00+07:00'), amount: 900000, direction: 'out', category: 'Uncategorized' }),
    tx({ time: d('2026-09-10T10:00:00+07:00'), amount: 5000000, direction: 'out', category: 'Internal transfer' }),
    tx({ time: d('2026-09-11T10:00:00+07:00'), amount: 20000000, direction: 'in', category: 'Income' }),
    tx({ time: d('2026-09-01T10:00:00+07:00'), amount: 999000, direction: 'out', category: 'Food & drinks' }),
    tx({ time: d('2026-09-12T10:00:00+07:00'), amount: null, direction: 'out', category: 'Other' }),
  ];
  const s = summarizeSpending(txs, d('2026-09-07T08:00:00+07:00'), d('2026-09-14T08:00:00+07:00'));
  expect(s.total).toBe(1000000);
  expect(s.count).toBe(2);
  expect(s.byCategory[0]).toEqual({ category: 'Uncategorized', amount: 900000 });
  const mail = buildWeeklyReport(s, d('2026-09-07T08:00:00+07:00'), d('2026-09-14T00:00:00+07:00'), 'https://ledger.example.com');
  expect(mail.subject).toBe('Spending 07/09 to 13/09: 1.000.000 ₫');
  expect(mail.body).toContain('1 uncategorized');
});
