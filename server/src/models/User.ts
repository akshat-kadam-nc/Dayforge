import { Schema, model, type InferSchemaType } from 'mongoose';
import bcrypt from 'bcryptjs';

/** Daily routine that carves discretionary time out of the 24h day. */
const routineSchema = new Schema(
  {
    sleepMinutes: { type: Number, min: 0, max: 1440, default: 0 },
    commuteMinutes: { type: Number, min: 0, max: 1440, default: 0 },
    workMinutes: { type: Number, min: 0, max: 1440, default: 0 },
    /** Weekdays worked, 0=Sun … 6=Sat. Work time only deducts on these days. */
    workdays: { type: [Number], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    /** Avatar descriptor `style:seed` (DiceBear). Empty = fall back to the initial. */
    avatar: { type: String, default: '' },
    /** Set once the user completes routine setup. Until then the day is fully open. */
    onboarded: { type: Boolean, default: false },
    routine: { type: routineSchema, default: () => ({}) },
    /** Legacy flat baseline; kept for back-compat, superseded by routine. */
    dailyAvailableMinutes: { type: Number, min: 0, default: 360 },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const UserModel = model('User', userSchema);
