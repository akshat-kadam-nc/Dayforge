import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const INTERRUPTION_TYPES = ['fire', 'rabbit_hole', 'distraction'] as const;

const interruptionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: INTERRUPTION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    minutes: { type: Number, min: 0, required: true },
    day: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export type Interruption = InferSchemaType<typeof interruptionSchema>;
export const InterruptionModel = model('Interruption', interruptionSchema);
