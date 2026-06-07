import { Router } from 'express';
import { TaskModel } from '../models/Task.js';
import { TimeLogModel } from '../models/TimeLog.js';
import { InterruptionModel } from '../models/Interruption.js';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { normaliseDay, scopeRange, type BudgetScope } from '../util/day.js';

export const budgetRouter = Router();
budgetRouter.use(requireDb, requireAuth);

/**
 * Aggregate the budget across a day/week/month window. The cockpit's Time
 * Budget card uses this to make the scope toggle real: available scales by the
 * number of days in the window; allocated/logged/interrupted are summed over it.
 */
budgetRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const raw = typeof req.query.scope === 'string' ? req.query.scope : 'day';
    const scope: BudgetScope = raw === 'week' || raw === 'month' ? raw : 'day';
    const day = normaliseDay(req.query.day);
    const { start, end, days } = scopeRange(scope, day);

    const dayFilter = { userId, day: { $gte: start, $lte: end } };
    const [user, tasks, logs, interruptions] = await Promise.all([
      UserModel.findById(userId),
      TaskModel.find(dayFilter),
      TimeLogModel.find(dayFilter),
      InterruptionModel.find(dayFilter),
    ]);

    const perArea = new Map<string, number>();
    let allocated = 0;
    for (const t of tasks) {
      allocated += t.estimateMinutes ?? 0;
      const key = String(t.areaId);
      perArea.set(key, (perArea.get(key) ?? 0) + (t.estimateMinutes ?? 0));
    }
    const logged = logs.reduce((s, l) => s + (l.minutes ?? 0), 0);
    const interrupted = interruptions.reduce((s, i) => s + (i.minutes ?? 0), 0);
    const availableMinutes = (user?.dailyAvailableMinutes ?? 360) * days;

    res.json({
      scope,
      start,
      end,
      days,
      availableMinutes,
      allocated,
      logged,
      interrupted,
      perArea: [...perArea].map(([areaId, minutes]) => ({ areaId, minutes })),
    });
  }),
);
