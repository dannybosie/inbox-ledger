import type { EmailInput, ParsedEmail } from '../types';
import { parseExampleBankEmail } from './example-bank';

/** Which member a bank's emails are filed under. Settings maps each role to a person. */
export type MemberRole = 'PRIMARY' | 'PARTNER';

export interface EmailSource {
  /** Stored on each transaction as its source. */
  id: string;
  member: MemberRole;
  /**
   * Returns null when the email is not a transaction alert from this bank, and throws
   * when it is one but the format could not be read (so it shows up in the email log).
   */
  parse: (email: EmailInput) => ParsedEmail | null;
}

/**
 * The banks this deployment reads. To add your bank:
 * 1. Copy example-bank.ts, match on the alert's subject line, and pull out amount, direction, time and description.
 * 2. Add a test with a real alert, with the account number, names and balance replaced.
 * 3. Register it here with the member role its emails belong to.
 */
export const EMAIL_SOURCES: EmailSource[] = [
  { id: 'example-bank', member: 'PRIMARY', parse: parseExampleBankEmail },
];

/** Tries each bank in order. null when no bank recognises the email. */
export function parseBankEmail(email: EmailInput): { source: EmailSource; parsed: ParsedEmail } | null {
  for (const source of EMAIL_SOURCES) {
    const parsed = source.parse(email);
    if (parsed) return { source, parsed };
  }
  return null;
}

export { parseExampleBankEmail };
