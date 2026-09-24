import { test, expect } from 'vitest';
import { parseAmount, normalizeText, formatVnd, monthStart, vnMonth } from '../src/core/util';

test('parseAmount đọc các kiểu viết số tiền phổ biến', () => {
  const cases: [unknown, number][] = [
    ['45k', 45000], ['45 K', 45000], ['2.5k', 2500], ['45 nghìn', 45000], ['45 ngàn', 45000],
    ['1tr', 1000000], ['1tr2', 1200000], ['1tr25', 1250000], ['1,5tr', 1500000], ['2 triệu', 2000000],
    ['150.000', 150000], ['150,000', 150000], ['1.234.567đ', 1234567], ['-1,234,567 VND', 1234567],
    ['VND 1,234,567.00', 1234567], ['45000', 45000], [45000, 45000],
  ];
  for (const [input, expected] of cases) expect(parseAmount(input), String(input)).toBe(expected);
});

test('parseAmount trả null khi không đọc được', () => {
  for (const input of ['', null, undefined, 'abc', '0', '1.5', 'k', -5, 0, '1.5tr2']) expect(parseAmount(input)).toBeNull();
});

test('normalizeText bỏ dấu, viết thường, gộp khoảng trắng', () => {
  expect(normalizeText('  Phúc   LONG Coffee ')).toBe('phuc long coffee');
  expect(normalizeText('ĐI CHỢ Đà Lạt')).toBe('di cho da lat');
});

test('formatVnd', () => {
  expect(formatVnd(1234567)).toBe('1.234.567 ₫');
  expect(formatVnd(0)).toBe('0 ₫');
  expect(formatVnd(null)).toBe('? ₫');
});

test('monthStart / vnMonth theo giờ Việt Nam', () => {
  expect(monthStart('2026-09').toISOString()).toBe('2026-08-31T17:00:00.000Z');
  expect(monthStart('2026-12', 1).toISOString()).toBe('2026-12-31T17:00:00.000Z');
  expect(vnMonth(new Date('2026-09-30T18:00:00Z'))).toBe('2026-10');
});
