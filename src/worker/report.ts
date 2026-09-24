import { EmailMessage } from 'cloudflare:email';
import type { Env } from './env';
import { buildWeeklyReport, summarizeSpending } from '../core/summary';
import { getPeople, listTransactions } from './db';
import { buildRawMail } from './mail';

/** Monday morning cron (00:00 UTC, 07:00 in Vietnam): emails a 7-day summary to everyone in the people table. */
export async function sendWeeklyReport(env: Env) {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const txs = await listTransactions(env.DB, { from, to });
  const mail = buildWeeklyReport(summarizeSpending(txs, from, to), from, to, env.APP_URL);
  const people = await getPeople(env.DB);
  for (const person of people) {
    await env.MAIL.send(new EmailMessage(env.MAIL_FROM, person.email, buildRawMail(env.MAIL_FROM, person.email, mail.subject, mail.body)));
  }
  return { recipients: people.length, subject: mail.subject };
}

