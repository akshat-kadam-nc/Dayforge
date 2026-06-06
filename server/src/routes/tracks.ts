import { Router } from 'express';
import { z } from 'zod';
import { FunctionTrackModel } from '../models/FunctionTrack.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const tracksRouter = Router();
tracksRouter.use(requireDb, requireAuth);

const trackInput = z.object({
  areaId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
});

tracksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (typeof req.query.areaId === 'string') filter.areaId = req.query.areaId;
    const tracks = await FunctionTrackModel.find(filter).sort({ createdAt: 1 });
    res.json({ tracks });
  }),
);

tracksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = trackInput.parse(req.body);
    const track = await FunctionTrackModel.create({ ...data, userId: req.userId });
    res.status(201).json({ track });
  }),
);

tracksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = trackInput.partial().parse(req.body);
    const track = await FunctionTrackModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true },
    );
    if (!track) throw new HttpError(404, 'Track not found');
    res.json({ track });
  }),
);

tracksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await FunctionTrackModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Track not found');
    res.status(204).end();
  }),
);
