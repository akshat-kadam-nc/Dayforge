import { Router } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const meRouter = Router();
meRouter.use(requireDb, requireAuth);

const settingsInput = z.object({
  dailyAvailableMinutes: z.number().int().min(0).max(1440),
});

meRouter.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const data = settingsInput.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(req.userId, data, { new: true });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({
      settings: { dailyAvailableMinutes: user.dailyAvailableMinutes },
    });
  }),
);
