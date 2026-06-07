import { Router } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const meRouter = Router();
meRouter.use(requireDb, requireAuth);

const routineInput = z.object({
  sleepMinutes: z.number().int().min(0).max(1440),
  commuteMinutes: z.number().int().min(0).max(1440),
  workMinutes: z.number().int().min(0).max(1440),
  workdays: z.array(z.number().int().min(0).max(6)),
});

// Save the routine. Completing it flips `onboarded` on so the cockpit stops
// treating the day as fully open.
meRouter.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const routine = routineInput.parse(req.body.routine ?? req.body);
    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      { routine, onboarded: true },
      { new: true },
    );
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ onboarded: user.onboarded, routine: user.routine });
  }),
);
