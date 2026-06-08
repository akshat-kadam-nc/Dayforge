import type { LifeArea } from '../today/types';
import type { CalendarDay } from './api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Local YYYY-MM-DD key, matching the server's dayKey(). */
export function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return keyOf(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysKey(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

export interface MonthCell {
  key: string;
  dayNum: number;
  otherMonth: boolean;
}

/** A 6x7 Monday-start matrix of day keys covering the month that `anchor` is in. */
export function monthMatrix(anchorKey: string): MonthCell[] {
  const base = parseKey(anchorKey);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const month = base.getMonth();
  // Offset back to the Monday on/before the 1st (getDay: Sun=0..Sat=6).
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push({ key: keyOf(d), dayNum: d.getDate(), otherMonth: d.getMonth() !== month });
  }
  return cells;
}

/** Inclusive [start, end] keys for the full 6-week grid window of a month. */
export function monthGridRange(anchorKey: string): { from: string; to: string } {
  const cells = monthMatrix(anchorKey);
  return { from: cells[0].key, to: cells[cells.length - 1].key };
}

export function monthTitle(anchorKey: string): string {
  const d = parseKey(anchorKey);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Shift the anchor by whole months, clamping the day to a valid value. */
export function shiftMonth(anchorKey: string, n: number): string {
  const d = parseKey(anchorKey);
  return keyOf(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** The 7 day keys (Mon..Sun) of the week containing `anchor`. */
export function weekDays(anchorKey: string): string[] {
  const d = parseKey(anchorKey);
  const offset = (d.getDay() + 6) % 7; // back to Monday
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => keyOf(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}

/** "Jun 8 – 14" / "Jun 30 – Jul 6" for the week containing `anchor`. */
export function weekRangeLabel(anchorKey: string): string {
  const days = weekDays(anchorKey);
  const a = parseKey(days[0]);
  const b = parseKey(days[6]);
  const m = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
  return a.getMonth() === b.getMonth()
    ? `${m(a)} ${a.getDate()} – ${b.getDate()}`
    : `${m(a)} ${a.getDate()} – ${m(b)} ${b.getDate()}`;
}

export interface AllocSegment {
  color: string;
  /** 0-100 width percent of the bar. */
  pct: number;
}

/**
 * Per-area segments for a day's allocation bar, scaled against available
 * minutes so a full day reads as a full bar and overflow visibly saturates it.
 */
export function allocationSegments(day: CalendarDay, areas: LifeArea[]): AllocSegment[] {
  const denom = Math.max(day.availableMinutes, day.allocated, 1);
  const colorOf = new Map(areas.map((a) => [a.id, a.color]));
  return day.perArea
    .filter((p) => p.minutes > 0)
    .map((p) => ({ color: colorOf.get(p.areaId) ?? '#94a3b8', pct: (p.minutes / denom) * 100 }));
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** ISO-8601 week number (weeks start Monday; week 1 holds the year's first Thursday). */
export function isoWeek(key: string): number {
  const d = parseKey(key);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // shift to the week's Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** Whole-month delta between two day keys (ref is the reference, e.g. today). */
export function monthDiff(key: string, ref: string): number {
  const a = parseKey(key);
  const b = parseKey(ref);
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

/** Whole-week delta between the Monday-weeks containing two day keys. */
export function weekDiff(key: string, ref: string): number {
  const monday = (k: string) => {
    const d = parseKey(k);
    const off = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - off).getTime();
  };
  return Math.round((monday(key) - monday(ref)) / (7 * 86400000));
}

/** Human relative phrase: "This week", "Next week", "2 weeks ago", etc. */
export function relPhrase(delta: number, unit: 'week' | 'month'): string {
  if (delta === 0) return unit === 'week' ? 'This week' : 'This month';
  const n = Math.abs(delta);
  const noun = n === 1 ? unit : `${unit}s`;
  if (delta === 1) return unit === 'week' ? 'Next week' : 'Next month';
  if (delta === -1) return unit === 'week' ? 'Last week' : 'Last month';
  return delta > 0 ? `${n} ${noun} ahead` : `${n} ${noun} ago`;
}

export { MONTHS };
