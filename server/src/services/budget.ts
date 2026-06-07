import { TaskModel } from '../models/Task.js';
import { InterruptionModel } from '../models/Interruption.js';
import { UserModel } from '../models/User.js';

export interface BudgetAggregate {
  availableMinutes: number;
  allocated: number;
  logged: number;
  interrupted: number;
  perArea: { areaId: string; minutes: number }[];
}

/** Sum the budget across an inclusive [start, end] day-key window. Shared by the
 *  /budget scope toggle and reconciliation due-period snapshots. */
export async function computeBudget(
  userId: unknown,
  start: string,
  end: string,
  days: number,
): Promise<BudgetAggregate> {
  const dayFilter = { userId, day: { $gte: start, $lte: end } };
  const [user, tasks, interruptions] = await Promise.all([
    UserModel.findById(userId),
    TaskModel.find(dayFilter),
    InterruptionModel.find(dayFilter),
  ]);

  const perArea = new Map<string, number>();
  let allocated = 0;
  let logged = 0;
  for (const t of tasks) {
    allocated += t.estimateMinutes ?? 0;
    logged += t.loggedMinutes ?? 0;
    const key = String(t.areaId);
    perArea.set(key, (perArea.get(key) ?? 0) + (t.estimateMinutes ?? 0));
  }

  return {
    availableMinutes: (user?.dailyAvailableMinutes ?? 360) * days,
    allocated,
    logged,
    interrupted: interruptions.reduce((s, i) => s + (i.minutes ?? 0), 0),
    perArea: [...perArea].map(([areaId, minutes]) => ({ areaId, minutes })),
  };
}
