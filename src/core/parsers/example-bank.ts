import type { EmailInput, ParsedEmail } from '../types';
import { normalizeText, parseAmount, vnDate } from '../util';

/**
 * A fictional bank, so the template runs end to end without anyone's real statements.
 * It sends two kinds of alert, in the shapes most Vietnamese banks use:
 *
 *   Subject: Example Bank: balance change alert
 *   Account 0123xxx789 changed by -120,000 VND at 13/09/2026 13:24.
 *   Description: GRABFOOD ORDER 5521.
 *
 *   Subject: Example Bank: card transaction
 *   Card ending 4321 was charged 12.50 USD at NETFLIX.COM on 14/09/2026 20:05.
 *
 * Replace it with a parser for your own bank; see index.ts.
 */
export function parseExampleBankEmail(email: EmailInput): ParsedEmail | null {
  const subject = normalizeText(email.subject);
  if (subject.indexOf('example bank') === -1) return null;
  const body = String(email.body || '').normalize('NFC');

  if (subject.indexOf('balance change') !== -1) {
    const m = body.match(/changed by ([+-])([\d.,]+) VND at (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    if (!m) throw new Error('Example Bank alert: amount/time not found');
    const description = body.match(/Description:\s*([^\n]*?)\.?\s*(?:\n|$)/);
    return {
      amount: parseAmount(m[2]),
      direction: m[1] === '+' ? 'in' : 'out',
      description: description ? description[1].trim() : '',
      time: vnDate(m[5], m[4], m[3], m[6], m[7]),
    };
  }

  if (subject.indexOf('card transaction') !== -1) {
    const m = body.match(/charged ([\d.,]+) ([A-Z]{3}) at (.+?) on (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    if (!m) throw new Error('Example Bank card alert: amount/time not found');
    const time = vnDate(m[6], m[5], m[4], m[7], m[8]);
    if (m[2] === 'VND') return { amount: parseAmount(m[1]), direction: 'out', description: m[3].trim(), time };
    return {
      amount: null,
      direction: 'out',
      description: m[3].trim(),
      time,
      foreign: { amount: Number(m[1].replace(/,/g, '')), currency: m[2] },
    };
  }

  return null;
}
