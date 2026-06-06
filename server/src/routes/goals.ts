import { Router } from 'express';
import { z } from 'zod';
import { GoalModel, GOAL_PERIODS } from '../models/Goal.js';
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
});

goalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const goals = await GoalModel.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json({ goals });
  }),
);

goalsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = goalInput.parse(req.body);
    const goal = await GoalModel.create({ ...data, userId: req.userId });
    res.status(201).json({ goal });
  }),
);

goalsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = goalInput.partial().parse(req.body);
    const goal = await GoalModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
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
    res.status(204).end();
  }),
);
