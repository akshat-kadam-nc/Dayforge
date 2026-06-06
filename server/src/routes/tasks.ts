import { Router } from 'express';
import { z } from 'zod';
import { TaskModel, TASK_STATUSES } from '../models/Task.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const tasksRouter = Router();

// Every route here is scoped to the authenticated user.
tasksRouter.use(requireDb, requireAuth);

const taskInput = z.object({
  title: z.string().min(1),
  lifeArea: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  estimateMinutes: z.number().int().min(0).optional(),
});

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tasks = await TaskModel.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ tasks });
  }),
);

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = taskInput.parse(req.body);
    const task = await TaskModel.create({ ...data, userId: req.userId });
    res.status(201).json({ task });
  }),
);

tasksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = taskInput.partial().parse(req.body);
    // Scope the update by userId so one user can never touch another's task.
    const task = await TaskModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true },
    );
    if (!task) throw new HttpError(404, 'Task not found');
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
