import { Router } from 'express';
import { LifeAreaModel } from '../models/LifeArea.js';
import { FunctionTrackModel } from '../models/FunctionTrack.js';
import { GoalModel } from '../models/Goal.js';
import { TaskModel } from '../models/Task.js';
import { InterruptionModel } from '../models/Interruption.js';
import { TimeLogModel } from '../models/TimeLog.js';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { normaliseDay } from '../util/day.js';
import { availableForDay } from '../services/availability.js';
import { computeStreak } from '../services/streak.js';

export const todayRouter = Router();
todayRouter.use(requireDb, requireAuth);

/**
 * One round trip with everything the cockpit needs for a given day. Areas,
 * tracks, and goals are not day-scoped; tasks, interruptions, and logs are.
 * Budget math is done on the client from these raw collections.
 */
todayRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const day = normaliseDay(req.query.day);

    // No destructive rollover. We return today's tasks plus every unfinished task
    // from other days, and the client buckets them into Today / Pending (overdue)
    // / Scheduled (future). Unfinished past tasks therefore accumulate visibly.
    const taskFilter = {
      userId,
      $or: [{ day }, { day: { $ne: day }, status: { $ne: 'done' } }],
    };

    const [user, areas, tracks, goals, tasks, interruptions, logs, streak] = await Promise.all([
      UserModel.findById(userId),
      LifeAreaModel.find({ userId }).sort({ order: 1, createdAt: 1 }),
      FunctionTrackModel.find({ userId }).sort({ createdAt: 1 }),
      GoalModel.find({ userId }).sort({ createdAt: 1 }),
      TaskModel.find(taskFilter).sort({ createdAt: 1 }),
      InterruptionModel.find({ userId, day }).sort({ createdAt: 1 }),
      TimeLogModel.find({ userId, day }).sort({ createdAt: 1 }),
      computeStreak(userId, day),
    ]);

    res.json({
      day,
      availableMinutes: availableForDay(user, day),
      streak,
      areas,
      tracks,
      goals,
      tasks,
      interruptions,
      logs,
    });
  }),
);
