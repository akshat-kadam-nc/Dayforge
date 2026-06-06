import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const functionTrackSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    areaId: { type: Types.ObjectId, ref: 'LifeArea', required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#64748b' },
  },
  { timestamps: true },
);

export type FunctionTrack = InferSchemaType<typeof functionTrackSchema>;
export const FunctionTrackModel = model('FunctionTrack', functionTrackSchema);
