import { Router } from 'express';
import { z } from 'zod';
import { TaskModel, TASK_STATUSES, TASK_SOURCES, DEADLINE_TYPES, TASK_KINDS } from '../models/Task.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { addDays, normaliseDay } from '../util/day.js';

export const tasksRouter = Router();

// Every route here is scoped to the authenticated user.
tasksRouter.use(requireDb, requireAuth);

const taskInput = z.object({
  title: z.string().min(1),
  // Optional at the schema level so a cross-area chore_session can omit it; the
  // create route enforces it for every other kind.
  areaId: z.string().min(1).optional(),
  kind: z.enum(TASK_KINDS).optional(),
  // Nullable so an edit can clear the link (null → unset the ObjectId ref).
  trackId: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  source: z.enum(TASK_SOURCES).optional(),
  estimateMinutes: z.number().int().min(0).optional(),
  loggedMinutes: z.number().min(0).optional(),
  scheduledAt: z.string().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  deadlineType: z.enum(DEADLINE_TYPES).optional(),
  delegateName: z.string().optional(),
  day: z.string().optional(),
  // Explicit completion instant, so a task finished in the past can be logged
  // with the real date rather than "now". Ignored unless status is done.
  completedAt: z.string().datetime().nullable().optional(),
});

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (typeof req.query.day === 'string') filter.day = normaliseDay(req.query.day);
    // Date-range scope for the Reports task-history table: filter by createdAt
    // (when the task was made) so the page can page back through time instead of
    // loading the whole ledger. completedAt is a UTC instant and the range keys
    // are local-day strings, same TZ caveat as reports/streak.
    if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
      const f = normaliseDay(req.query.from);
      const t = normaliseDay(req.query.to ?? req.query.from);
      const [start, end] = f <= t ? [f, t] : [t, f];
      filter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000`),
        $lte: new Date(`${end}T23:59:59.999`),
      };
    }
    const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
    res.json({ tasks });
  }),
);

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = taskInput.parse(req.body);
    if (data.kind !== 'chore_session' && !data.areaId) {
      throw new HttpError(400, 'areaId is required');
    }
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
    // An empty ref means "unlink" — store null, never '' (which fails ObjectId cast).
    if (patch.trackId === '') patch.trackId = null;
    if (patch.goalId === '') patch.goalId = null;
    if (data.status === 'done') {
      // Honour an explicit completion date (past completions); else stamp now.
      patch.completedAt = data.completedAt ? new Date(data.completedAt) : new Date();
    } else if (data.status) {
      patch.completedAt = null;
    } else if (data.completedAt !== undefined) {
      // Adjust the completion date of an already-done task without touching status.
      patch.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }
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
