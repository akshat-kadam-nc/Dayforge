/** Day key in YYYY-MM-DD. Used to scope tasks, logs, and interruptions to a day. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate/normalise a day key, falling back to today when absent or malformed. */
export function normaliseDay(input: unknown): string {
  return typeof input === 'string' && DAY_RE.test(input) ? input : dayKey();
}

/** Shift a day key by n calendar days (n may be negative). Parsed as a local date. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export type BudgetScope = 'day' | 'week' | 'month';
export interface DayRange {
  start: string;
  end: string;
  /** Inclusive number of days in the range. */
  days: number;
}

/** Inclusive [start, end] day-key range covering the scope around `key`.
 *  Week runs Monday–Sunday; month runs the 1st to the last day of the month. */
export function scopeRange(scope: BudgetScope, key: string): DayRange {
  const [y, m, d] = key.split('-').map(Number);
  if (scope === 'day') return { start: key, end: key, days: 1 };
  if (scope === 'week') {
    const base = new Date(y, m - 1, d);
    // getDay(): Sun=0..Sat=6 → offset back to Monday.
    const offset = (base.getDay() + 6) % 7;
    const start = dayKey(new Date(y, m - 1, d - offset));
    const end = dayKey(new Date(y, m - 1, d - offset + 6));
    return { start, end, days: 7 };
  }
  // month
  const start = dayKey(new Date(y, m - 1, 1));
  const last = new Date(y, m, 0); // day 0 of next month = last day of this month
  return { start, end: dayKey(last), days: last.getDate() };
}
