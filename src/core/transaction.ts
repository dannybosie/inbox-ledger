import type { Direction, ParsedEmail, Rule, Transaction } from './types';
import { parseAmount } from './util';
import { categorize } from './categorize';
import { DEFAULT_PEOPLE, MANUAL_SOURCE, MESSAGES, SMALL_SPEND_CATEGORY, UNCATEGORIZED } from './text';

export interface ManualPayload {
  amount?: unknown;
  category?: unknown;
  note?: unknown;
  person?: unknown;
  direction?: unknown;
  time?: unknown;
}

/** Validates a manual entry from the app and builds the transaction. */
export function validateManualEntry(
  payload: ManualPayload,
  ctx: { now: Date; newId: string; categories: string[]; person?: string }
): { ok: true; tx: Transaction } | { ok: false; error: string } {
  const p = payload || {};
  const amount = parseAmount(p.amount);
  if (!amount) return { ok: false, error: MESSAGES.invalidAmount(p.amount) };

  const category = String(p.category || '').trim();
  let time = p.time ? new Date(String(p.time)) : ctx.now;
  if (isNaN(time.getTime())) time = ctx.now;

  return {
    ok: true,
    tx: {
      id: ctx.newId,
      time,
      amount,
      direction: p.direction === 'in' ? 'in' : 'out',
      category: ctx.categories.indexOf(category) !== -1 ? category : UNCATEGORIZED,
      description: String(p.note || '').trim(),
      person: ctx.person || String(p.person || '').trim() || DEFAULT_PEOPLE.UNKNOWN,
      source: MANUAL_SOURCE,
      sourceId: '',
    },
  };
}

/** Builds a transaction from a parsed bank email. */
export function buildEmailTransaction(
  parsed: ParsedEmail,
  ctx: { id: string; source: string; sourceId: string; person: string; rules: Rule[]; smallAmount?: number }
): Transaction {
  const category = categorize(parsed.description, ctx.rules);
  const smallAmount = ctx.smallAmount ?? 0;
  const isSmallUnknown =
    category === UNCATEGORIZED && parsed.direction === 'out' && parsed.amount !== null && parsed.amount < smallAmount;
  return {
    id: ctx.id,
    time: parsed.time,
    amount: parsed.amount,
    direction: parsed.direction,
    category: isSmallUnknown ? SMALL_SPEND_CATEGORY : category,
    description: parsed.description,
    person: ctx.person,
    source: ctx.source,
    sourceId: ctx.sourceId,
  };
}

/** Converts a foreign-currency transaction to VND. Without a rate, the amount stays empty with a note to fix it by hand. */
export function applyFx(parsed: ParsedEmail, rate: number): ParsedEmail {
  if (!parsed.foreign) return parsed;
  const label = parsed.foreign.amount + ' ' + parsed.foreign.currency;
  const ok = rate > 0;
  return {
    ...parsed,
    amount: ok ? Math.round(parsed.foreign.amount * rate) : null,
    description: [parsed.description, ok ? MESSAGES.fxRate(label, Math.round(rate)) : MESSAGES.fxMissing(label)]
      .filter(Boolean)
      .join(' · '),
  };
}

export function isDirection(v: unknown): v is Direction {
  return v === 'in' || v === 'out';
}
