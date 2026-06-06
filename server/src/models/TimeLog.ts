import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const timeLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Types.ObjectId, ref: 'Task', required: true, index: true },
    areaId: { type: Types.ObjectId, ref: 'LifeArea', required: true },
    minutes: { type: Number, min: 0, required: true },
    day: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export type TimeLog = InferSchemaType<typeof timeLogSchema>;
export const TimeLogModel = model('TimeLog', timeLogSchema);
