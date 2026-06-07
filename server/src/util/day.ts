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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Calendar week number (matches the cockpit header's local-date convention). */
export function weekOfYear(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(y, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.ceil((days + start.getDay() + 1) / 7);
}

/** Inclusive day count between two day keys. */
export function daysBetween(start: string, end: string): number {
  const [ay, am, ad] = start.split('-').map(Number);
  const [by, bm, bd] = end.split('-').map(Number);
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(by, bm - 1, bd).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export type ReconScope = 'week' | 'month' | 'half_year';
export interface CompletedPeriod {
  scope: ReconScope;
  /** Stable id for this period: week=Monday key, month="YYYY-MM", half="YYYY-H1/H2". */
  periodKey: string;
  start: string;
  end: string;
  days: number;
  label: string;
}

/** The most recently *finished* period of a scope as of `today` (end <= today).
 *  This is the period a reconciliation closes out. */
export function completedPeriod(scope: ReconScope, today: string): CompletedPeriod {
  const [y, m, d] = today.split('-').map(Number);

  if (scope === 'week') {
    const dow = new Date(y, m - 1, d).getDay(); // 0 = Sunday
    const lastSunday = dow === 0 ? today : addDays(today, -dow);
    const r = scopeRange('week', lastSunday); // Mon..Sun(=lastSunday)
    return { scope, periodKey: r.start, start: r.start, end: r.end, days: r.days, label: `Week ${weekOfYear(r.end)}` };
  }

  if (scope === 'month') {
    const thisMonth = scopeRange('month', today);
    const done = thisMonth.end <= today ? thisMonth : scopeRange('month', addDays(thisMonth.start, -1));
    const [yy, mm] = done.start.split('-').map(Number);
    return { scope, periodKey: done.start.slice(0, 7), start: done.start, end: done.end, days: done.days, label: `${MONTHS[mm - 1]} ${yy}` };
  }

  // half_year: H1 ends Jun 30, H2 ends Dec 31.
  const h1end = `${y}-06-30`;
  const h2end = `${y}-12-31`;
  let key: string, start: string, end: string, label: string;
  if (today >= h2end) {
    key = `${y}-H2`; start = `${y}-07-01`; end = h2end; label = `H2 ${y}`;
  } else if (today >= h1end) {
    key = `${y}-H1`; start = `${y}-01-01`; end = h1end; label = `H1 ${y}`;
  } else {
    key = `${y - 1}-H2`; start = `${y - 1}-07-01`; end = `${y - 1}-12-31`; label = `H2 ${y - 1}`;
  }
  return { scope, periodKey: key, start, end, days: daysBetween(start, end), label };
}
