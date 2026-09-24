import { test, expect } from 'vitest';
import { htmlToText } from '../src/worker/email';
import { buildRawMail } from '../src/worker/mail';

test('htmlToText keeps line breaks and accented text', () => {
  expect(htmlToText('<p>Tài khoản <b>Spend</b> vừa giảm</p><p>Mô tả: cà phê&nbsp;sáng</p>')).toBe('Tài khoản Spend vừa giảm\nMô tả: cà phê sáng');
});

test('buildRawMail encodes a UTF-8 subject', () => {
  const raw = buildRawMail('ledger@example.com', 'a@b.c', 'Chi tiêu', 'xin chào');
  expect(raw).toContain('Subject: =?UTF-8?B?');
  expect(raw).toContain('Content-Type: text/plain; charset=UTF-8');
});
