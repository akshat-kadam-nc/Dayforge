import { Router } from 'express';
import { z } from 'zod';
import { GoalModel, GOAL_PERIODS } from '../models/Goal.js';
import { TaskModel } from '../models/Task.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const goalsRouter = Router();
goalsRouter.use(requireDb, requireAuth);

const goalInput = z.object({
  areaId: z.string().min(1),
  text: z.string().min(1),
  icon: z.string().optional(),
  pct: z.number().int().min(0).max(100).optional(),
  color: z.string().optional(),
  period: z.enum(GOAL_PERIODS).optional(),
  parentId: z.string().min(1).nullable().optional(),
});

goalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const goals = await GoalModel.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json({ goals });
  }),
);

/**
 * Goals plus a per-goal task rollup for the Goals page. For each weekly goal we
 * sum the estimate of its linked tasks (all) and of its done linked tasks, so the
 * client can derive estimate-weighted progress (done-estimate / total-estimate)
 * and roll parents up as the average of their children.
 */
goalsRouter.get(
  '/rollup',
  asyncHandler(async (req, res) => {
    const goals = await GoalModel.find({ userId: req.userId }).sort({ createdAt: 1 });
    const tasks = await TaskModel.find({
      userId: req.userId,
      goalId: { $ne: null },
      kind: 'task',
    }).select('goalId status estimateMinutes');

    const rollup: Record<string, { estTotal: number; estDone: number; countTotal: number; countDone: number }> = {};
    for (const t of tasks) {
      const key = String(t.goalId);
      const r = (rollup[key] ??= { estTotal: 0, estDone: 0, countTotal: 0, countDone: 0 });
      const est = t.estimateMinutes ?? 0;
      r.estTotal += est;
      r.countTotal += 1;
      if (t.status === 'done') {
        r.estDone += est;
        r.countDone += 1;
      }
    }
    res.json({ goals, rollup });
  }),
);

// Period ladder, low to high. A goal's parent must sit exactly one rung above it.
const PERIOD_RANK: Record<(typeof GOAL_PERIODS)[number], number> = {
  weekly: 0,
  monthly: 1,
  half_year: 2,
  annual: 3,
};

/** Ensure parentId (if set) is the caller's goal sitting one period-level up. */
async function validateParent(
  userId: unknown,
  parentId: string | null | undefined,
  childPeriod: (typeof GOAL_PERIODS)[number],
): Promise<void> {
  if (!parentId) return;
  const parent = await GoalModel.findOne({ _id: parentId, userId }).select('period');
  if (!parent) throw new HttpError(400, 'Parent goal not found');
  const parentPeriod = parent.period as (typeof GOAL_PERIODS)[number];
  if (PERIOD_RANK[parentPeriod] !== PERIOD_RANK[childPeriod] + 1) {
    throw new HttpError(400, 'Parent must be exactly one period-level above the goal');
  }
}

goalsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = goalInput.parse(req.body);
    await validateParent(req.userId, data.parentId, data.period ?? 'weekly');
    const goal = await GoalModel.create({ ...data, userId: req.userId });
    res.status(201).json({ goal });
  }),
);

goalsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = goalInput.partial().parse(req.body);
    if (data.parentId !== undefined) {
      const current = await GoalModel.findOne({ _id: req.params.id, userId: req.userId }).select('period');
      if (!current) throw new HttpError(404, 'Goal not found');
      const period = (data.period ?? current.period) as (typeof GOAL_PERIODS)[number];
      if (data.parentId && String(data.parentId) === String(req.params.id)) {
        throw new HttpError(400, 'A goal cannot be its own parent');
      }
      await validateParent(req.userId, data.parentId, period);
    }
    // Stamp completion the first time pct hits 100; clear it if pct drops back.
    const patch: Record<string, unknown> = { ...data };
    if (data.pct === 100) {
      const current = await GoalModel.findOne({ _id: req.params.id, userId: req.userId }).select('completedAt');
      if (current && !current.completedAt) patch.completedAt = new Date();
    } else if (data.pct !== undefined) {
      patch.completedAt = null;
    }
    const goal = await GoalModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      patch,
      { new: true },
    );
    if (!goal) throw new HttpError(404, 'Goal not found');
    res.json({ goal });
  }),
);

goalsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await GoalModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Goal not found');
    // Detach any children so they don't point at a deleted parent.
    await GoalModel.updateMany(
      { userId: req.userId, parentId: req.params.id },
      { $set: { parentId: null } },
    );
    res.status(204).end();
  }),
);
