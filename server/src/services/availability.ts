import type { User } from '../models/User.js';
import { addDays } from '../util/day.js';

const FULL_DAY = 1440;

/** Discretionary minutes for one day from the user's routine. Before onboarding
 *  the whole 24h is open; after, sleep/commute (every day) and work (on workdays)
 *  are carved out. */
export function availableForDay(user: Pick<User, 'onboarded' | 'routine'> | null, dayKey: string): number {
  if (!user || !user.onboarded || !user.routine) return FULL_DAY;
  const r = user.routine;
  const [y, m, d] = dayKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const works = (r.workdays ?? []).includes(dow);
  const used = (r.sleepMinutes ?? 0) + (r.commuteMinutes ?? 0) + (works ? r.workMinutes ?? 0 : 0);
  return Math.max(0, FULL_DAY - used);
}

/** Sum of per-day discretionary minutes across an inclusive day-key range. */
export function availableForRange(
  user: Pick<User, 'onboarded' | 'routine'> | null,
  start: string,
  end: string,
): number {
  let total = 0;
  for (let key = start; key <= end; key = addDays(key, 1)) {
    total += availableForDay(user, key);
  }
  return total;
}
