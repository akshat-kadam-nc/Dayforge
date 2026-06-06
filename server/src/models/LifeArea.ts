import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const lifeAreaSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '📦' },
    color: { type: String, default: '#8b5cf6' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type LifeArea = InferSchemaType<typeof lifeAreaSchema>;
export const LifeAreaModel = model('LifeArea', lifeAreaSchema);
