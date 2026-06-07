import { Router } from 'express';
import { z } from 'zod';
import { TaskModel, TASK_STATUSES, TASK_SOURCES, DEADLINE_TYPES } from '../models/Task.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { addDays, normaliseDay } from '../util/day.js';

export const tasksRouter = Router();

// Every route here is scoped to the authenticated user.
tasksRouter.use(requireDb, requireAuth);

const taskInput = z.object({
  title: z.string().min(1),
  areaId: z.string().min(1),
  trackId: z.string().optional(),
  goalId: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  source: z.enum(TASK_SOURCES).optional(),
  estimateMinutes: z.number().int().min(0).optional(),
  loggedMinutes: z.number().min(0).optional(),
  scheduledAt: z.string().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  deadlineType: z.enum(DEADLINE_TYPES).optional(),
  delegateName: z.string().optional(),
  day: z.string().optional(),
});

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (typeof req.query.day === 'string') filter.day = normaliseDay(req.query.day);
    const tasks = await TaskModel.find(filter).sort({ createdAt: 1 });
    res.json({ tasks });
  }),
);

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = taskInput.parse(req.body);
    const task = await TaskModel.create({
      ...data,
      day: normaliseDay(data.day),
      userId: req.userId,
    });
    res.status(201).json({ task });
  }),
);

tasksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = taskInput.partial().parse(req.body);
    // Stamp/clear completion time when the status crosses the done boundary.
    const patch: Record<string, unknown> = { ...data };
    if (data.status === 'done') patch.completedAt = new Date();
    else if (data.status) patch.completedAt = null;
    // Scope the update by userId so one user can never touch another's task.
    const task = await TaskModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      patch,
      { new: true },
    );
    if (!task) throw new HttpError(404, 'Task not found');
    res.json({ task });
  }),
);

// Push a single task to the next day and flag it as deferred, bumping its
// carry count. (Skipping a day entirely is handled by rollover in /today.)
tasksRouter.post(
  '/:id/defer',
  asyncHandler(async (req, res) => {
    const task = await TaskModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) throw new HttpError(404, 'Task not found');
    task.day = addDays(task.day, 1);
    task.status = 'deferred';
    task.deferredCount = (task.deferredCount ?? 0) + 1;
    await task.save();
    res.json({ task });
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await TaskModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Task not found');
    res.status(204).end();
  }),
);
