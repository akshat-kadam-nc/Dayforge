import { Router } from 'express';
import { z } from 'zod';
import { TimeLogModel } from '../models/TimeLog.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { normaliseDay } from '../util/day.js';

export const timelogsRouter = Router();
timelogsRouter.use(requireDb, requireAuth);

const timeLogInput = z.object({
  taskId: z.string().min(1),
  areaId: z.string().min(1),
  minutes: z.number().min(0),
  day: z.string().optional(),
});

timelogsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (typeof req.query.day === 'string') filter.day = normaliseDay(req.query.day);
    const logs = await TimeLogModel.find(filter).sort({ createdAt: 1 });
    res.json({ logs });
  }),
);

timelogsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = timeLogInput.parse(req.body);
    const log = await TimeLogModel.create({
      ...data,
      day: normaliseDay(data.day),
      userId: req.userId,
    });
    res.status(201).json({ log });
  }),
);
