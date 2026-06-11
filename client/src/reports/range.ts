import { todayKey } from '../today/repo';

export type RangePreset = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom';

export interface Range {
  from: string;
  to: string;
  label: string;
  preset: RangePreset;
}

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parse(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDaysKey(k: string, n: number): string {
  const d = parse(k);
  d.setDate(d.getDate() + n);
  return key(d);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Monday-start week containing `today`. */
export function thisWeek(today = todayKey()): Range {
  const d = parse(today);
  const offset = (d.getDay() + 6) % 7; // back to Monday
  const from = key(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
  const to = key(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset + 6));
  return { from, to, label: 'This week', preset: 'this_week' };
}

export function thisMonth(today = todayKey()): Range {
  const d = parse(today);
  const from = key(new Date(d.getFullYear(), d.getMonth(), 1));
  const to = key(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { from, to, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, preset: 'this_month' };
}

export function lastMonth(today = todayKey()): Range {
  const d = parse(today);
  const from = key(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const to = key(new Date(d.getFullYear(), d.getMonth(), 0));
  const m = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return { from, to, label: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`, preset: 'last_month' };
}

/** Rolling 90 days ending today. */
export function last3Months(today = todayKey()): Range {
  return { from: addDaysKey(today, -89), to: today, label: 'Last 3 months', preset: 'last_3_months' };
}

export function customRange(from: string, to: string): Range {
  return { from, to, label: 'Custom', preset: 'custom' };
}

export function presetRange(preset: RangePreset, today = todayKey()): Range {
  switch (preset) {
    case 'this_week': return thisWeek(today);
    case 'this_month': return thisMonth(today);
    case 'last_month': return lastMonth(today);
    case 'last_3_months': return last3Months(today);
    default: return thisWeek(today);
  }
}

/** Short human label for a [from,to] window, e.g. "Jun 9 – Jun 15 · 7 days". */
export function rangeLabel(from: string, to: string): string {
  const f = parse(from);
  const t = parse(to);
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const short = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  return `${short(f)} – ${short(t)} · ${days} day${days === 1 ? '' : 's'}`;
}
