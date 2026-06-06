import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * Reference model for the userId-scoping pattern every collection in AXIOM
 * follows: every document carries `userId`, and every query filters by the
 * authenticated user. This keeps the data model multi-user ready from day one
 * even though there is a single user today.
 */
export const TASK_STATUSES = [
  'not_started',
  'in_progress',
  'done',
  'deferred',
  'blocked',
] as const;

const taskSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    lifeArea: { type: String, trim: true, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'not_started' },
    estimateMinutes: { type: Number, min: 0, default: 0 },
    deferredCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

export type Task = InferSchemaType<typeof taskSchema>;

export const TaskModel = model('Task', taskSchema);
