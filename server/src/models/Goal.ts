import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const GOAL_PERIODS = ['weekly', 'monthly', 'half_year', 'annual'] as const;

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
  },
  { timestamps: true },
);

export type Goal = InferSchemaType<typeof goalSchema>;
export const GoalModel = model('Goal', goalSchema);
