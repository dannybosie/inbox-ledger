/** Strips Vietnamese accents, lowercases and collapses spaces: "Phúc  Long" becomes "phuc long". */
export function normalizeText(text: unknown): string {
  return String(text == null ? '' : text)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads a VND amount the way people in Vietnam write it:
 * "45k", "45 nghìn", "1tr2", "1,5tr", "2 triệu", "150.000", "1,234,567 VND", "-150.000đ".
 * Returns a positive integer, or null if it cannot be read.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input === 'number') return isFinite(input) && input > 0 ? Math.round(input) : null;

  const s = normalizeText(input)
    .replace(/vnd|dong/g, '')
    .replace(/d\b/g, '')
    .replace(/\s+/g, '')
    .replace(/^[+-]/, '')
    .replace(/[.,]00$/, '');
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:tr|trieu)(\d{1,3})?$/))) {
    if (m[2] && /[.,]/.test(m[1])) return null;
    const extra = m[2] ? parseInt(m[2], 10) / Math.pow(10, m[2].length) : 0;
    return Math.round((parseFloat(m[1].replace(',', '.')) + extra) * 1e6) || null;
  }
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:k|nghin|ngan)$/))) {
    return Math.round(parseFloat(m[1].replace(',', '.')) * 1000) || null;
  }
  if (/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(s)) return parseInt(s.replace(/[.,]/g, ''), 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10) || null;
  return null;
}

/** A moment in Vietnam time, whatever the machine's time zone. */
export function vnDate(year: string | number, month: string | number, day: string | number, hour: string | number, minute: string | number): Date {
  const p = (n: string | number) => String(n || 0).padStart(2, '0');
  return new Date(`${year}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:00+07:00`);
}

/** Date in Vietnam time as "yyyy-MM-dd". */
export function vnDay(date: Date): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "dd/MM" in Vietnam time. */
export function formatDate(date: Date): string {
  const d = vnDay(date);
  return d.slice(8, 10) + '/' + d.slice(5, 7);
}

/** 1234567 → "1.234.567 ₫" */
export function formatVnd(amount: number | null | undefined): string {
  if (amount == null) return '? ₫';
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

/** Start of month "yyyy-MM" in Vietnam time; addMonths moves forward. */
export function monthStart(ym: string, addMonths = 0): Date {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + addMonths;
  return vnDate(Math.floor(total / 12), (total % 12) + 1, 1, 0, 0);
}

/** "yyyy-MM" in Vietnam time. */
export function vnMonth(date: Date): string {
  return vnDay(date).slice(0, 7);
}
