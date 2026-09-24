import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseBankEmail, parseExampleBankEmail } from '../src/core/parsers';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const ALERT = 'Example Bank: balance change alert';
const CARD = 'Example Bank: card transaction';

test('balance change: an expense', () => {
  const r = parseExampleBankEmail({ subject: ALERT, body: fixture('example-debit.txt') })!;
  expect(r.amount).toBe(120000);
  expect(r.direction).toBe('out');
  expect(r.description).toBe('GRABFOOD ORDER 5521');
  expect(r.time.toISOString()).toBe('2026-09-13T06:24:00.000Z');
});

test('balance change: income', () => {
  const r = parseExampleBankEmail({ subject: ALERT, body: fixture('example-credit.txt') })!;
  expect(r.amount).toBe(15000000);
  expect(r.direction).toBe('in');
  expect(r.description).toBe('TT LUONG THANG 9');
});

test('card transaction in a foreign currency waits for a rate', () => {
  const r = parseExampleBankEmail({ subject: CARD, body: fixture('example-card-usd.txt') })!;
  expect(r.amount).toBeNull();
  expect(r.foreign).toEqual({ amount: 12.5, currency: 'USD' });
  expect(r.description).toBe('NETFLIX.COM');
});

test('other emails are ignored; a changed format is an error', () => {
  expect(parseExampleBankEmail({ subject: 'Example Bank: new savings rates', body: 'x' })).toBeNull();
  expect(parseExampleBankEmail({ subject: 'Your order has shipped', body: 'x' })).toBeNull();
  expect(() => parseExampleBankEmail({ subject: ALERT, body: 'the template changed' })).toThrow(/Example Bank/);
});

test('parseBankEmail finds the bank and its member role', () => {
  const hit = parseBankEmail({ subject: ALERT, body: fixture('example-debit.txt') })!;
  expect(hit.source.id).toBe('example-bank');
  expect(hit.source.member).toBe('PRIMARY');
  expect(parseBankEmail({ subject: 'Newsletter', body: 'hello' })).toBeNull();
});
