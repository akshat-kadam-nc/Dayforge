import { Router } from 'express';
import { z } from 'zod';
import { ReconciliationModel, RECON_SCOPES } from '../models/Reconciliation.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { completedPeriod, normaliseDay, type ReconScope } from '../util/day.js';
import { computeBudget } from '../services/budget.js';

export const reconciliationsRouter = Router();
reconciliationsRouter.use(requireDb, requireAuth);

reconciliationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await ReconciliationModel.find({ userId: req.userId }).sort({ periodEnd: -1 });
    res.json({ reconciliations: items });
  }),
);

/**
 * Which closes are currently due: for each scope, the most recently finished
 * period that hasn't been reconciled yet, with its budget snapshot attached so
 * the client can render the review without another round trip.
 */
reconciliationsRouter.get(
  '/due',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const today = normaliseDay(req.query.day);
    const existing = await ReconciliationModel.find({ userId }).select('scope periodKey');
    const done = new Set(existing.map((r) => `${r.scope}:${r.periodKey}`));

    const due = [];
    for (const scope of RECON_SCOPES as readonly ReconScope[]) {
      const p = completedPeriod(scope, today);
      if (done.has(`${scope}:${p.periodKey}`)) continue;
      const stats = await computeBudget(userId, p.start, p.end, p.days);
      due.push({ ...p, stats });
    }
    res.json({ due });
  }),
);

const reconInput = z.object({
  scope: z.enum(RECON_SCOPES),
  periodKey: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  label: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  responses: z.array(z.object({ key: z.string(), question: z.string(), answer: z.string() })).default([]),
  stats: z
    .object({
      availableMinutes: z.number(),
      allocated: z.number(),
      logged: z.number(),
      interrupted: z.number(),
      perArea: z.array(z.object({ areaId: z.string(), minutes: z.number() })),
    })
    .optional(),
});

// Upsert by (userId, scope, periodKey) so re-closing a period edits the review.
reconciliationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = reconInput.parse(req.body);
    const recon = await ReconciliationModel.findOneAndUpdate(
      { userId: req.userId, scope: data.scope, periodKey: data.periodKey },
      { ...data, userId: req.userId },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.status(201).json({ reconciliation: recon });
  }),
);
