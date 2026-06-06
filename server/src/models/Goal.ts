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
  },
  { timestamps: true },
);

export type Goal = InferSchemaType<typeof goalSchema>;
export const GoalModel = model('Goal', goalSchema);
