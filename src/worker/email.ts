import PostalMime from 'postal-mime';
import type { Env } from './env';
import { parseBankEmail } from '../core/parsers';
import { applyFx, buildEmailTransaction } from '../core/transaction';
import { getRules, getSettings, insertTransactions, logEmail, personForRole, seedDefaults, smallAmount } from './db';
import { fxRateToVnd } from './fx';

/** Email Routing calls this for every email sent to the app's inbox address. */
export async function handleEmail(message: ForwardableEmailMessage, env: Env) {
  await seedDefaults(env.DB);
  const raw = await new Response(message.raw).arrayBuffer();
  const mail = await PostalMime.parse(raw);
  const subject = mail.subject || '';
  const sender = mail.from?.address || message.from;
  const body = mail.text || htmlToText(mail.html || '');
  const date = mail.date ? new Date(mail.date) : new Date();
  const sourceId = (mail.messageId || message.headers.get('Message-ID') || '').trim() || `${sender}:${date.getTime()}:${subject}`;

  // Gmail sends a confirmation code when forwarding is turned on: keep it so it can be pasted back into Gmail.
  if (/forwarding confirmation|xác nhận chuyển tiếp/i.test(subject)) {
    await logEmail(env.DB, { sender, subject, status: 'confirmation', detail: body.slice(0, 2000) });
    return;
  }

  let hit;
  try {
    hit = parseBankEmail({ subject, body, date });
  } catch (err) {
    await logEmail(env.DB, { sender, subject, status: 'error', detail: String((err as Error).message) });
    return;
  }
  if (!hit) {
    await logEmail(env.DB, { sender, subject, status: 'ignored' });
    return;
  }

  let parsed = hit.parsed;
  if (parsed.foreign) parsed = applyFx(parsed, await fxRateToVnd(parsed.foreign.currency, await getSettings(env.DB)));

  const tx = buildEmailTransaction(parsed, {
    id: crypto.randomUUID(),
    source: hit.source.id,
    sourceId,
    person: await personForRole(env.DB, hit.source.member),
    rules: await getRules(env.DB),
    smallAmount: await smallAmount(env.DB),
  });
  const saved = await insertTransactions(env.DB, [tx]);
  await logEmail(env.DB, {
    sender, subject, status: saved ? 'saved' : 'duplicate',
    detail: `${hit.source.id} · ${tx.amount ?? '?'} · ${tx.category} · ${tx.description}`.slice(0, 500),
  });
}

/** Extracts text from HTML when an email has no plain-text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
