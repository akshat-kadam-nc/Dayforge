import { Router } from 'express';
import { LifeAreaModel } from '../models/LifeArea.js';
import { TaskModel } from '../models/Task.js';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { addDays, normaliseDay } from '../util/day.js';
import { availableForDay } from '../services/availability.js';

export const calendarRouter = Router();
calendarRouter.use(requireDb, requireAuth);

/**
 * Read-only aggregate for the Calendar view over an inclusive [from, to] day
 * range. Returns one summary per day (availability + per-area allocation +
 * overflow + follow-up + completed count) plus the raw tasks for the range so
 * the Day detail can render completed history without a second round trip.
 * Availability lives on the server (routine/workday logic), so it is computed
 * here rather than duplicated on the client.
 */
calendarRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const from = normaliseDay(req.query.from);
    const toRaw = normaliseDay(req.query.to ?? req.query.from);
    // Guard against a reversed range.
    const [start, end] = from <= toRaw ? [from, toRaw] : [toRaw, from];

    const [user, areas, tasks] = await Promise.all([
      UserModel.findById(userId),
      LifeAreaModel.find({ userId }).sort({ order: 1, createdAt: 1 }),
      TaskModel.find({ userId, day: { $gte: start, $lte: end } }).sort({ createdAt: 1 }),
    ]);

    // Bucket tasks by day for per-day aggregation.
    const byDay = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const arr = byDay.get(t.day) ?? [];
      arr.push(t);
      byDay.set(t.day, arr);
    }

    const days = [];
    for (let key = start; key <= end; key = addDays(key, 1)) {
      const dayTasks = byDay.get(key) ?? [];
      const perAreaMap = new Map<string, number>();
      let allocated = 0;
      let completedCount = 0;
      let followUp = false;
      for (const t of dayTasks) {
        const est = t.estimateMinutes ?? 0;
        allocated += est;
        const areaKey = String(t.areaId);
        perAreaMap.set(areaKey, (perAreaMap.get(areaKey) ?? 0) + est);
        if (t.status === 'done') completedCount += 1;
        if (t.delegateName) followUp = true;
      }
      const availableMinutes = availableForDay(user, key);
      days.push({
        day: key,
        availableMinutes,
        allocated,
        overflow: allocated > availableMinutes,
        followUp,
        completedCount,
        perArea: [...perAreaMap].map(([areaId, minutes]) => ({ areaId, minutes })),
      });
    }

    res.json({ start, end, areas, days, tasks });
  }),
);
