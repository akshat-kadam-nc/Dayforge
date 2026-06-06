import { Router } from 'express';
import { z } from 'zod';
import { InterruptionModel, INTERRUPTION_TYPES } from '../models/Interruption.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { normaliseDay } from '../util/day.js';

export const interruptionsRouter = Router();
interruptionsRouter.use(requireDb, requireAuth);

const interruptionInput = z.object({
  type: z.enum(INTERRUPTION_TYPES),
  title: z.string().min(1),
  note: z.string().optional(),
  minutes: z.number().int().min(0),
  day: z.string().optional(),
});

interruptionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (typeof req.query.day === 'string') filter.day = normaliseDay(req.query.day);
    const interruptions = await InterruptionModel.find(filter).sort({ createdAt: 1 });
    res.json({ interruptions });
  }),
);

interruptionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = interruptionInput.parse(req.body);
    const interruption = await InterruptionModel.create({
      ...data,
      day: normaliseDay(data.day),
      userId: req.userId,
    });
    res.status(201).json({ interruption });
  }),
);

interruptionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await InterruptionModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Interruption not found');
    res.status(204).end();
  }),
);
