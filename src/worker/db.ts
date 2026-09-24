import type { Rule, Transaction } from '../core/types';
import { DEFAULT_CATEGORIES, DEFAULT_PEOPLE, DEFAULT_RULES, DEFAULT_SMALL_AMOUNT } from '../core/text';
import type { MemberRole } from '../core/parsers';

interface TxRow {
  id: string; time: number; amount: number | null; direction: string; category: string;
  description: string; person: string; source: string; source_id: string;
}

export function rowToTx(r: TxRow): Transaction {
  return {
    id: r.id, time: new Date(r.time), amount: r.amount, direction: r.direction === 'in' ? 'in' : 'out',
    category: r.category, description: r.description, person: r.person, source: r.source, sourceId: r.source_id,
  };
}

export async function listTransactions(db: D1Database, opts: { from?: Date; to?: Date; category?: string; q?: string; limit?: number } = {}) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.from) { where.push('time >= ?'); args.push(opts.from.getTime()); }
  if (opts.to) { where.push('time < ?'); args.push(opts.to.getTime()); }
  if (opts.category) { where.push('category = ?'); args.push(opts.category); }
  if (opts.q) { where.push('lower(description) LIKE ?'); args.push('%' + opts.q.toLowerCase() + '%'); }
  const sql = 'SELECT * FROM transactions' + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY time DESC LIMIT ' + (opts.limit ?? 2000);
  const { results } = await db.prepare(sql).bind(...args).all<TxRow>();
  return results.map(rowToTx);
}

/** Inserts transactions, skipping duplicate ids or source ids. Returns how many were new. */
export async function insertTransactions(db: D1Database, txs: Transaction[]): Promise<number> {
  if (!txs.length) return 0;
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO transactions (id, time, amount, direction, category, description, person, source, source_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const results = await db.batch(txs.map(tx => stmt.bind(
    tx.id, tx.time.getTime(), tx.amount, tx.direction, tx.category, tx.description, tx.person, tx.source, tx.sourceId, now, now
  )));
  return results.reduce((n, r) => n + (r.meta.changes || 0), 0);
}

export async function getRules(db: D1Database): Promise<Rule[]> {
  const { results } = await db.prepare('SELECT keyword, category FROM rules ORDER BY position').all<Rule>();
  return results;
}

export async function getCategories(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare('SELECT name FROM categories ORDER BY position').all<{ name: string }>();
  return results.map(r => r.name);
}

export async function getSettings(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries(results.map(r => [r.key, r.value]));
}

export async function getPeople(db: D1Database) {
  const { results } = await db.prepare('SELECT email, name, role FROM people').all<{ email: string; name: string; role: string }>();
  return results;
}

export async function personForRole(db: D1Database, role: MemberRole): Promise<string> {
  const row = await db.prepare('SELECT name FROM people WHERE role = ? LIMIT 1').bind(role).first<{ name: string }>();
  return row?.name || DEFAULT_PEOPLE[role];
}

export async function smallAmount(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'small_amount'").first<{ value: string }>();
  const n = Number(row?.value);
  return n > 0 ? n : DEFAULT_SMALL_AMOUNT;
}

/** First run: seeds the default categories and rules if the tables are empty. */
export async function seedDefaults(db: D1Database) {
  const count = await db.prepare('SELECT COUNT(*) AS n FROM categories').first<{ n: number }>();
  if (count && count.n > 0) return;
  const cat = db.prepare('INSERT OR IGNORE INTO categories (name, position) VALUES (?, ?)');
  const rule = db.prepare('INSERT INTO rules (keyword, category, position) VALUES (?, ?, ?)');
  await db.batch([
    ...DEFAULT_CATEGORIES.map((name, i) => cat.bind(name, i)),
    ...DEFAULT_RULES.map(([keyword, category], i) => rule.bind(keyword, category, i)),
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('small_amount', ?)").bind(String(DEFAULT_SMALL_AMOUNT)),
  ]);
}

export async function logEmail(db: D1Database, entry: { sender: string; subject: string; status: string; detail?: string }) {
  await db.prepare('INSERT INTO email_log (received_at, sender, subject, status, detail) VALUES (?, ?, ?, ?, ?)')
    .bind(Date.now(), entry.sender, entry.subject, entry.status, entry.detail || '').run();
}
