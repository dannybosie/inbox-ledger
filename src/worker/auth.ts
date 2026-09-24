import type { Env } from './env';
import { buildRawMail } from './mail';
import { UI } from '../core/text';

/**
 * Sign-in: type an email, receive a 6-digit code, enter it, stay signed in for a year.
 * Only addresses in ALLOWED_EMAILS are sent a code. Any other address gets the same answer,
 * so an outsider cannot probe which addresses the household uses.
 */
export interface User { email: string }

const COOKIE = 'fx_session';
const CODE_TTL = 10 * 60 * 1000;
const SESSION_TTL = 365 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_GAP = 60 * 1000;
const MAX_PER_HOUR = 10;

export function allowedEmails(env: Env): string[] {
  return (env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export function isAllowed(env: Env, email: string): boolean {
  return allowedEmails(env).includes(email.trim().toLowerCase());
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sends a sign-in code. Always returns { ok: true }, allowed address or not.
 * DEV_SHOW_CODE is only ever set in .dev.vars (never deployed), to test this flow locally.
 */
export async function requestCode(env: Env, rawEmail: string): Promise<{ ok: true; devCode?: string }> {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!isAllowed(env, email)) return { ok: true };

  const now = Date.now();
  const existing = await env.DB.prepare('SELECT sent_at, sent_count, window_start FROM login_codes WHERE email = ?')
    .bind(email).first<{ sent_at: number; sent_count: number; window_start: number }>();

  if (existing) {
    if (now - existing.sent_at < RESEND_GAP) return { ok: true };
    const sameWindow = now - existing.window_start < 60 * 60 * 1000;
    if (sameWindow && existing.sent_count >= MAX_PER_HOUR) return { ok: true };
  }

  const code = randomCode();
  const windowStart = existing && now - existing.window_start < 60 * 60 * 1000 ? existing.window_start : now;
  const sentCount = existing && windowStart === existing.window_start ? existing.sent_count + 1 : 1;

  await env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at, sent_count, window_start)
     VALUES (?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       attempts = 0, sent_at = excluded.sent_at, sent_count = excluded.sent_count, window_start = excluded.window_start`
  ).bind(email, await sha256(email + ':' + code), now + CODE_TTL, now, sentCount, windowStart).run();

  try {
    const { EmailMessage } = await import('cloudflare:email');
    await env.MAIL.send(new EmailMessage(env.MAIL_FROM, email,
      buildRawMail(env.MAIL_FROM, email, UI.login.mailSubject(code), UI.login.mailBody(code))));
  } catch (err) {
    console.error('Could not send the sign-in code: ' + (err as Error).message);
  }

  return env.DEV_SHOW_CODE === '1' ? { ok: true, devCode: code } : { ok: true };
}

/** Exchanges a code for a session. Returns the cookie token, or null if the code is wrong or expired. */
export async function verifyCode(env: Env, rawEmail: string, rawCode: string): Promise<string | null> {
  const email = String(rawEmail || '').trim().toLowerCase();
  const code = String(rawCode || '').trim();
  if (!isAllowed(env, email) || !/^\d{6}$/.test(code)) return null;

  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?')
    .bind(email).first<{ code_hash: string; expires_at: number; attempts: number }>();
  if (!row || row.expires_at < Date.now() || row.attempts >= MAX_ATTEMPTS) return null;

  if ((await sha256(email + ':' + code)) !== row.code_hash) {
    await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
    return null;
  }

  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email),
    env.DB.prepare('INSERT INTO sessions (token_hash, email, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await sha256(token), email, now, now + SESSION_TTL, now),
  ]);
  return token;
}

/** Who is calling? null means not signed in. Sessions extend on each day of use. */
export async function authenticate(request: Request, env: Env): Promise<User | null> {
  if (env.DEV_EMAIL) return { email: env.DEV_EMAIL };

  const token = cookie(request, COOKIE);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT email, expires_at, last_seen_at FROM sessions WHERE token_hash = ?')
    .bind(hash).first<{ email: string; expires_at: number; last_seen_at: number }>();
  if (!row) return null;

  const now = Date.now();
  if (row.expires_at < now || !isAllowed(env, row.email)) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
    return null;
  }
  if (now - row.last_seen_at > 24 * 60 * 60 * 1000) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(now, now + SESSION_TTL, hash).run();
  }
  return { email: row.email };
}

export async function signOut(request: Request, env: Env): Promise<void> {
  const token = cookie(request, COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL / 1000)}`;
}

export const CLEAR_COOKIE = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function cookie(request: Request, name: string): string | null {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

/** Deletes expired codes and sessions; the weekly cron calls it. */
export async function cleanupAuth(env: Env): Promise<void> {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_codes WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
}
