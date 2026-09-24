import { formatVnd, parseAmount, vnDay, vnMonth } from '../core/util';
import { UI } from '../core/text';
export { formatVnd, parseAmount, vnMonth };

/** "1.234.567 ₫", without a suffix, for compact places. */
export const money = (n: number | null | undefined) => formatVnd(n);

export function dayLabel(iso: string): string {
  const d = vnDay(new Date(iso));
  const today = vnDay(new Date());
  const yesterday = vnDay(new Date(Date.now() - 86400000));
  if (d === today) return UI.tx.today;
  if (d === yesterday) return UI.tx.yesterday;
  const [y, m, day] = d.split('-');
  return `${Number(day)}/${Number(m)}` + (y !== today.slice(0, 4) ? `/${y}` : '');
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return UI.overview.month(Number(m), y);
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
