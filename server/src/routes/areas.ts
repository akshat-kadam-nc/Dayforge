import { Router } from 'express';
import { z } from 'zod';
import { LifeAreaModel } from '../models/LifeArea.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const areasRouter = Router();
areasRouter.use(requireDb, requireAuth);

const areaInput = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().optional(),
});

areasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const areas = await LifeAreaModel.find({ userId: req.userId }).sort({ order: 1, createdAt: 1 });
    res.json({ areas });
  }),
);

areasRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = areaInput.parse(req.body);
    const area = await LifeAreaModel.create({ ...data, userId: req.userId });
    res.status(201).json({ area });
  }),
);

areasRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = areaInput.partial().parse(req.body);
    const area = await LifeAreaModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true },
    );
    if (!area) throw new HttpError(404, 'Area not found');
    res.json({ area });
  }),
);

areasRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await LifeAreaModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Area not found');
    res.status(204).end();
  }),
);
