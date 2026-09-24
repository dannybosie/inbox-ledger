import { Hono } from 'hono';
import type { Env } from './env';
import type { User } from './auth';
import { CLEAR_COOKIE, authenticate, requestCode, sessionCookie, signOut, verifyCode } from './auth';
import type { Transaction } from '../core/types';
import { isDirection, validateManualEntry } from '../core/transaction';
import { categorize } from '../core/categorize';
import { summarizeSpending } from '../core/summary';
import { monthStart, parseAmount, vnMonth } from '../core/util';
import { INTERNAL_CATEGORY, MESSAGES, SMALL_SPEND_CATEGORY, UI, UNCATEGORIZED } from '../core/text';
import { formatVnd } from '../core/util';
import {
  getCategories, getPeople, getRules, getSettings, insertTransactions, listTransactions, rowToTx, seedDefaults,
} from './db';
import { sendWeeklyReport } from './report';

type Ctx = { Bindings: Env; Variables: { user: User; person: string } };
export const api = new Hono<Ctx>().basePath('/api');

/** Requesting a code and exchanging it for a session: the only routes that need no sign-in. */
api.post('/auth/request', async c => {
  const { email } = (await c.req.json().catch(() => ({}))) as { email?: string };
  return c.json(await requestCode(c.env, email || ''));
});

api.post('/auth/verify', async c => {
  const { email, code } = (await c.req.json().catch(() => ({}))) as { email?: string; code?: string };
  const token = await verifyCode(c.env, email || '', code || '');
  if (!token) return c.json({ error: UI.login.wrongCode }, 401);
  c.header('Set-Cookie', sessionCookie(token));
  return c.json({ ok: true });
});

api.post('/auth/signout', async c => {
  await signOut(c.req.raw, c.env);
  c.header('Set-Cookie', CLEAR_COOKIE);
  return c.json({ ok: true });
});

api.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/')) return next();
  const user = await authenticate(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not signed in' }, 401);
  await seedDefaults(c.env.DB);
  const me = await c.env.DB.prepare('SELECT name FROM people WHERE email = ?').bind(user.email).first<{ name: string }>();
  c.set('user', user);
  c.set('person', me?.name || user.email.split('@')[0]);
  await next();
});

api.get('/me', c => c.json({ email: c.get('user').email, name: c.get('person') }));

api.get('/bootstrap', async c => {
  const db = c.env.DB;
  return c.json({
    me: { email: c.get('user').email, name: c.get('person') },
    categories: await getCategories(db),
    rules: await getRules(db),
    people: await getPeople(db),
    settings: await getSettings(db),
  });
});

function txOut(tx: Transaction) {
  return { ...tx, time: tx.time.toISOString() };
}

api.get('/transactions', async c => {
  const month = c.req.query('month');
  const opts: Parameters<typeof listTransactions>[1] = {
    category: c.req.query('category') || undefined,
    q: c.req.query('q') || undefined,
    limit: Number(c.req.query('limit')) || 500,
  };
  if (month) { opts.from = monthStart(month); opts.to = monthStart(month, 1); }
  return c.json((await listTransactions(c.env.DB, opts)).map(txOut));
});

api.post('/transactions', async c => {
  const payload = await c.req.json().catch(() => ({}));
  const result = validateManualEntry(payload, {
    now: new Date(), newId: crypto.randomUUID(), categories: await getCategories(c.env.DB), person: c.get('person'),
  });
  if (!result.ok) return c.json({ error: result.error }, 400);
  await insertTransactions(c.env.DB, [result.tx]);
  return c.json({ ok: true, tx: txOut(result.tx), message: MESSAGES.saved(formatVnd(result.tx.amount), result.tx.category) });
});

api.patch('/transactions/:id', async c => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const args: unknown[] = [];
  if (typeof body.category === 'string') { sets.push('category = ?'); args.push(body.category.trim() || UNCATEGORIZED); }
  if (typeof body.description === 'string') { sets.push('description = ?'); args.push(body.description.trim()); }
  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount);
    if (!amount) return c.json({ error: MESSAGES.invalidAmount(body.amount) }, 400);
    sets.push('amount = ?'); args.push(amount);
  }
  if (isDirection(body.direction)) { sets.push('direction = ?'); args.push(body.direction); }
  if (typeof body.time === 'string' && !isNaN(Date.parse(body.time))) { sets.push('time = ?'); args.push(Date.parse(body.time)); }
  if (!sets.length) return c.json({ error: 'Nothing to change' }, 400);
  sets.push('updated_at = ?'); args.push(Date.now());
  args.push(id);
  const r = await c.env.DB.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`).bind(...args).run();
  if (!r.meta.changes) return c.json({ error: 'Transaction not found' }, 404);
  const row = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  return c.json({ ok: true, tx: txOut(rowToTx(row as never)) });
});

api.delete('/transactions/:id', async c => {
  await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

/** One month's overview plus the last 6 months. */
api.get('/summary', async c => {
  const month = c.req.query('month') || vnMonth(new Date());
  const from = monthStart(month, -5);
  const to = monthStart(month, 1);
  const txs = await listTransactions(c.env.DB, { from, to, limit: 20000 });
  const current = summarizeSpending(txs, monthStart(month), to);
  const months = [];
  for (let i = -5; i <= 0; i++) {
    const start = monthStart(month, i);
    const s = summarizeSpending(txs, start, monthStart(month, i + 1));
    months.push({ month: vnMonth(new Date(start.getTime() + 1000)), total: s.total, count: s.count });
  }
  const income = txs
    .filter(t => t.direction === 'in' && t.amount != null && t.time >= monthStart(month) && t.time < to)
    .reduce((n, t) => n + (t.amount || 0), 0);
  return c.json({
    month,
    total: current.total,
    count: current.count,
    income,
    byCategory: current.byCategory,
    uncategorized: current.uncategorized,
    uncategorizedItems: current.uncategorizedItems.map(txOut),
    months,
  });
});

/** Replaces the category list (order is position). To rename, send renames [{from,to}] so old transactions follow. */
api.put('/categories', async c => {
  const body = (await c.req.json()) as { categories: string[]; renames?: { from: string; to: string }[] };
  const names = [...new Set((body.categories || []).map(s => String(s).trim()).filter(Boolean))];
  for (const must of [UNCATEGORIZED, INTERNAL_CATEGORY, SMALL_SPEND_CATEGORY]) if (!names.includes(must)) names.push(must);
  const stmts = [c.env.DB.prepare('DELETE FROM categories')];
  names.forEach((name, i) => stmts.push(c.env.DB.prepare('INSERT INTO categories (name, position) VALUES (?, ?)').bind(name, i)));
  for (const r of body.renames || []) {
    stmts.push(c.env.DB.prepare('UPDATE transactions SET category = ? WHERE category = ?').bind(r.to, r.from));
    stmts.push(c.env.DB.prepare('UPDATE rules SET category = ? WHERE category = ?').bind(r.to, r.from));
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, categories: names });
});

api.put('/rules', async c => {
  const body = (await c.req.json()) as { rules: { keyword: string; category: string }[] };
  const rules = (body.rules || []).filter(r => r.keyword && r.category);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM rules'),
    ...rules.map((r, i) => c.env.DB.prepare('INSERT INTO rules (keyword, category, position) VALUES (?, ?, ?)').bind(r.keyword.trim(), r.category, i)),
  ]);
  return c.json({ ok: true });
});

/** Re-applies the rules to Uncategorized and Small spending rows, after new rules are added. */
api.post('/rules/reapply', async c => {
  const rules = await getRules(c.env.DB);
  const small = Number((await getSettings(c.env.DB)).small_amount) || 0;
  const txs = await listTransactions(c.env.DB, { limit: 20000 });
  const updates = [];
  for (const tx of txs) {
    if (tx.category !== UNCATEGORIZED && tx.category !== SMALL_SPEND_CATEGORY) continue;
    let cat = categorize(tx.description, rules);
    if (cat === UNCATEGORIZED && tx.direction === 'out' && tx.amount != null && tx.amount < small) cat = SMALL_SPEND_CATEGORY;
    if (cat !== tx.category) updates.push(c.env.DB.prepare('UPDATE transactions SET category = ?, updated_at = ? WHERE id = ?').bind(cat, Date.now(), tx.id));
  }
  if (updates.length) await c.env.DB.batch(updates);
  return c.json({ ok: true, updated: updates.length });
});

api.put('/settings', async c => {
  const body = (await c.req.json()) as Record<string, string>;
  const stmts = Object.entries(body).map(([k, v]) =>
    c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(v))
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

api.put('/people', async c => {
  const body = (await c.req.json()) as { people: { email: string; name: string; role: string }[] };
  const people = (body.people || []).filter(p => p.email && p.name);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM people'),
    ...people.map(p => c.env.DB.prepare('INSERT INTO people (email, name, role) VALUES (?, ?, ?)').bind(p.email.trim().toLowerCase(), p.name.trim(), p.role || '')),
  ]);
  return c.json({ ok: true });
});

/** Imports existing data: an array of transactions with id/time/amount/direction/category. Duplicates by id or source_id are skipped. */
api.post('/import', async c => {
  const body = (await c.req.json()) as { transactions: Record<string, unknown>[] };
  const txs: Transaction[] = [];
  for (const r of body.transactions || []) {
    const time = new Date(String(r.time));
    if (isNaN(time.getTime())) continue;
    txs.push({
      id: String(r.id || crypto.randomUUID()),
      time,
      amount: r.amount == null || r.amount === '' ? null : parseAmount(r.amount),
      direction: r.direction === 'in' ? 'in' : 'out',
      category: String(r.category || UNCATEGORIZED),
      description: String(r.description || ''),
      person: String(r.person || ''),
      source: String(r.source || 'import'),
      sourceId: String(r.sourceId || ''),
    });
  }
  const saved = await insertTransactions(c.env.DB, txs);
  return c.json({ ok: true, received: txs.length, saved });
});

api.get('/email-log', async c => {
  const { results } = await c.env.DB.prepare('SELECT * FROM email_log ORDER BY received_at DESC LIMIT 100').all();
  return c.json(results);
});

/** Sends the weekly report right now. */
api.post('/report/send', async c => c.json(await sendWeeklyReport(c.env)));
