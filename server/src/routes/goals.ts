import { Router } from 'express';
import { z } from 'zod';
import { GoalModel, GOAL_PERIODS, GOAL_METRICS, GOAL_STATUSES } from '../models/Goal.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { resolveAndRollup } from '../services/goals.js';

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
  metric: z.enum(GOAL_METRICS).optional(),
  targetCount: z.number().int().min(1).nullable().optional(),
  timed: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
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
    // Resolves leaf count/timed goal lifecycle (lazily, on read) and returns the
    // per-goal task rollup the client derives progress from.
    const { goals, rollup } = await resolveAndRollup(req.userId);
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

/** Ensure parentId (if set) is the caller's goal sitting one period-level up,
 *  and is not itself a count/timed goal (those are leaf-only). */
async function validateParent(
  userId: unknown,
  parentId: string | null | undefined,
  childPeriod: (typeof GOAL_PERIODS)[number],
): Promise<void> {
  if (!parentId) return;
  const parent = await GoalModel.findOne({ _id: parentId, userId }).select('period metric timed');
  if (!parent) throw new HttpError(400, 'Parent goal not found');
  const parentPeriod = parent.period as (typeof GOAL_PERIODS)[number];
  if (PERIOD_RANK[parentPeriod] !== PERIOD_RANK[childPeriod] + 1) {
    throw new HttpError(400, 'Parent must be exactly one period-level above the goal');
  }
  if (parent.metric === 'count' || parent.timed) {
    throw new HttpError(400, 'A count/timed goal cannot have child goals');
  }
}

/** count goals need a target; timed goals need a deadline. */
function validateFacets(
  metric: string | undefined,
  targetCount: number | null | undefined,
  timed: boolean | undefined,
  dueAt: string | null | undefined,
): void {
  if (metric === 'count' && !targetCount) throw new HttpError(400, 'A count goal needs a target (how many times)');
  if (timed && !dueAt) throw new HttpError(400, 'A timed goal needs a deadline');
}

goalsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = goalInput.parse(req.body);
    await validateParent(req.userId, data.parentId, data.period ?? 'weekly');
    validateFacets(data.metric, data.targetCount, data.timed, data.dueAt);
    const goal = await GoalModel.create({ ...data, userId: req.userId });
    res.status(201).json({ goal });
  }),
);

goalsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = goalInput.partial().parse(req.body);
    const current = await GoalModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!current) throw new HttpError(404, 'Goal not found');

    if (data.parentId !== undefined) {
      const period = (data.period ?? current.period) as (typeof GOAL_PERIODS)[number];
      if (data.parentId && String(data.parentId) === String(req.params.id)) {
        throw new HttpError(400, 'A goal cannot be its own parent');
      }
      await validateParent(req.userId, data.parentId, period);
    }

    const metric = data.metric ?? (current.metric as string | undefined);
    const timed = data.timed ?? current.timed ?? undefined;
    // count/timed are leaf-only: a goal that already has children can't become one.
    if ((data.metric === 'count' || data.timed === true)) {
      const hasChildren = await GoalModel.exists({ userId: req.userId, parentId: req.params.id });
      if (hasChildren) throw new HttpError(400, 'A goal with child goals cannot be count/timed');
    }
    validateFacets(metric, data.targetCount ?? current.targetCount, timed, data.dueAt ?? current.dueAt?.toISOString());

    const patch: Record<string, unknown> = { ...data };
    // Lifecycle stamps. Explicit status (manual conclude/reopen) wins; otherwise
    // fall back to the pct===100 completion stamp.
    if (data.status === 'completed') {
      if (!current.completedAt) patch.completedAt = new Date();
    } else if (data.status === 'active') {
      patch.completedAt = null;
      patch.resolvedAt = null;
    } else if (data.status === 'missed') {
      patch.resolvedAt = new Date();
    } else if (data.pct === 100 && !current.completedAt) {
      patch.completedAt = new Date();
    } else if (data.pct !== undefined && data.pct < 100 && current.status === 'active') {
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

/** Shift a deadline forward by one period length (for Duplicate recurrence). */
function shiftByPeriod(due: Date, period: string): Date {
  const d = new Date(due);
  if (period === 'weekly') d.setDate(d.getDate() + 7);
  else if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (period === 'half_year') d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Duplicate a (usually just-closed) goal into a fresh active copy for the next
// period — manual recurrence. Resets progress and shifts a timed deadline forward.
goalsRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const src = await GoalModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!src) throw new HttpError(404, 'Goal not found');
    const goal = await GoalModel.create({
      userId: req.userId,
      areaId: src.areaId,
      text: src.text,
      icon: src.icon,
      color: src.color,
      period: src.period,
      parentId: src.parentId ?? null,
      metric: src.metric,
      targetCount: src.targetCount,
      timed: src.timed,
      dueAt: src.timed && src.dueAt ? shiftByPeriod(src.dueAt, src.period) : undefined,
      pct: 0,
      status: 'active',
    });
    res.status(201).json({ goal });
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
