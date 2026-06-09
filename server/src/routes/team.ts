import { Router } from 'express';
import { z } from 'zod';
import { PersonModel } from '../models/Person.js';
import { DelegationModel, DELEGATION_STATUSES } from '../models/Delegation.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const teamRouter = Router();
teamRouter.use(requireDb, requireAuth);

// ---- Read: people + delegations in one trip (the page needs both) ----

teamRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [people, delegations] = await Promise.all([
      PersonModel.find({ userId: req.userId }).sort({ order: 1, createdAt: 1 }),
      DelegationModel.find({ userId: req.userId }).sort({ createdAt: 1 }),
    ]);
    res.json({ people, delegations });
  }),
);

// ---- People ----

const personInput = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
});

teamRouter.post(
  '/people',
  asyncHandler(async (req, res) => {
    const data = personInput.parse(req.body);
    const person = await PersonModel.create({ ...data, userId: req.userId });
    res.status(201).json({ person });
  }),
);

teamRouter.patch(
  '/people/:id',
  asyncHandler(async (req, res) => {
    const data = personInput.partial().parse(req.body);
    const person = await PersonModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true },
    );
    if (!person) throw new HttpError(404, 'Person not found');
    res.json({ person });
  }),
);

teamRouter.delete(
  '/people/:id',
  asyncHandler(async (req, res) => {
    const result = await PersonModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Person not found');
    // Remove their delegations too — orphaned tickets have no home.
    await DelegationModel.deleteMany({ userId: req.userId, personId: req.params.id });
    res.status(204).end();
  }),
);

// ---- Delegations ----

const delegationInput = z.object({
  personId: z.string().min(1),
  title: z.string().min(1),
  ventureLabel: z.string().optional(),
  ventureColor: z.string().optional(),
  status: z.enum(DELEGATION_STATUSES).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  recurrence: z.string().optional(),
});

/** Confirm the target person belongs to the caller before linking work to them. */
async function assertOwnPerson(userId: unknown, personId: string): Promise<void> {
  const exists = await PersonModel.exists({ _id: personId, userId });
  if (!exists) throw new HttpError(400, 'Person not found');
}

teamRouter.post(
  '/delegations',
  asyncHandler(async (req, res) => {
    const data = delegationInput.parse(req.body);
    await assertOwnPerson(req.userId, data.personId);
    const delegation = await DelegationModel.create({ ...data, userId: req.userId });
    res.status(201).json({ delegation });
  }),
);

teamRouter.patch(
  '/delegations/:id',
  asyncHandler(async (req, res) => {
    const data = delegationInput.partial().parse(req.body);
    if (data.personId) await assertOwnPerson(req.userId, data.personId);
    // Stamp completedAt when moving to done; clear it when moving back off done.
    const patch: Record<string, unknown> = { ...data };
    if (data.status === 'done') patch.completedAt = new Date();
    else if (data.status) patch.completedAt = null;
    const delegation = await DelegationModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      patch,
      { new: true },
    );
    if (!delegation) throw new HttpError(404, 'Delegation not found');
    res.json({ delegation });
  }),
);

teamRouter.delete(
  '/delegations/:id',
  asyncHandler(async (req, res) => {
    const result = await DelegationModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Delegation not found');
    res.status(204).end();
  }),
);
