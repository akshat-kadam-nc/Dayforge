import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const GOAL_PERIODS = ['weekly', 'monthly', 'half_year', 'annual'] as const;
/** How a goal's progress is measured. standard = manual/estimate-weighted from
 *  linked tasks; count = number of completed linked tasks / targetCount. */
export const GOAL_METRICS = ['standard', 'count'] as const;
/** Lifecycle. active until concluded; completed (hit target / manually done) or
 *  missed (timed goal whose deadline passed under target). */
export const GOAL_STATUSES = ['active', 'completed', 'missed'] as const;

const goalSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    areaId: { type: Types.ObjectId, ref: 'LifeArea', required: true, index: true },
    text: { type: String, required: true, trim: true },
    icon: { type: String, default: '🎯' },
    pct: { type: Number, min: 0, max: 100, default: 0 },
    color: { type: String, default: '#8b5cf6' },
    period: { type: String, enum: GOAL_PERIODS, default: 'weekly' },
    // Optional link to the goal one period-level up (weekly→monthly→half_year→annual).
    parentId: { type: Types.ObjectId, ref: 'Goal', default: null, index: true },
    // Stamped when pct first reaches 100; cleared if it drops back below. Powers
    // the Reports "completed goals" history. Legacy goals already at 100 have none.
    completedAt: { type: Date },
    // Progress measure. count goals track completed linked tasks against targetCount;
    // standard goals keep the estimate-weighted/manual pct. Leaf-only (no children).
    metric: { type: String, enum: GOAL_METRICS, default: 'standard' },
    targetCount: { type: Number, min: 1 },
    // Timed goals fail when dueAt passes under target; non-timed never fail.
    timed: { type: Boolean, default: false },
    dueAt: { type: Date },
    // Lifecycle. Terminal statuses freeze pct and move the goal to the Closed list.
    status: { type: String, enum: GOAL_STATUSES, default: 'active', index: true },
    // Stamped when a timed goal is resolved as missed.
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

export type Goal = InferSchemaType<typeof goalSchema>;
export const GoalModel = model('Goal', goalSchema);
