import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A direct report you delegate work to. ~10 per user. */
const personSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    /** Free-form role/context label, e.g. "Lead Developer". */
    role: { type: String, default: '', trim: true },
    /** Avatar/accent color. */
    color: { type: String, default: '#7c3aed' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Person = InferSchemaType<typeof personSchema>;
export const PersonModel = model('Person', personSchema);
