import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { dayKey } from '../util/day.js';

/**
 * userId-scoping pattern: every document carries `userId` and every query
 * filters by the authenticated user. `areaId` ties a task to a LifeArea
 * (venture); `day` scopes it to a calendar day in the cockpit.
 */
export const TASK_STATUSES = [
  'not_started',
  'in_progress',
  'done',
  'deferred',
  'blocked',
] as const;

export const TASK_SOURCES = ['manual', 'calendar', 'recurring'] as const;

const taskSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    areaId: { type: Types.ObjectId, ref: 'LifeArea', required: true, index: true },
    trackId: { type: Types.ObjectId, ref: 'FunctionTrack' },
    goalId: { type: Types.ObjectId, ref: 'Goal' },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: TASK_STATUSES, default: 'not_started' },
    source: { type: String, enum: TASK_SOURCES, default: 'manual' },
    estimateMinutes: { type: Number, min: 0, default: 0 },
    scheduledAt: { type: String },
    delegateName: { type: String, trim: true },
    deferredCount: { type: Number, min: 0, default: 0 },
    day: { type: String, required: true, default: () => dayKey(), index: true },
  },
  { timestamps: true },
);

export type Task = InferSchemaType<typeof taskSchema>;
export const TaskModel = model('Task', taskSchema);
