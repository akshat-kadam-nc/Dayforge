import { TaskModel } from '../models/Task.js';
import { dayKey, addDays } from '../util/day.js';

/**
 * Current activity streak: the run of consecutive days, ending today (or
 * yesterday if today has no activity yet), on which the user completed at least
 * one task. A day "counts" if a task was marked done with a completedAt that
 * falls on it. Today not yet being active does not break the streak — it only
 * breaks once a full day passes with nothing done.
 */
export async function computeStreak(userId: unknown, today: string): Promise<number> {
  const done = await TaskModel.find({ userId, status: 'done', completedAt: { $ne: null } })
    .select('completedAt')
    .lean();

  const active = new Set<string>();
  for (const t of done) {
    if (t.completedAt) active.add(dayKey(new Date(t.completedAt)));
  }

  let cursor = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
