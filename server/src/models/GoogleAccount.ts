import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * A connected Google account (read-only Calendar source). One per (userId,
 * googleSub). Tokens are stored to keep sync working without re-consent.
 * NOTE: tokens are stored in plaintext for now — encrypt at rest before any
 * multi-user / production rollout.
 */
const googleAccountSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    googleSub: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    /** Display color for this source's event chips. */
    color: { type: String, default: '#4285F4' },
    /** Whether this source's events are pulled into the cockpit. */
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

googleAccountSchema.index({ userId: 1, googleSub: 1 }, { unique: true });

export type GoogleAccount = InferSchemaType<typeof googleAccountSchema>;
export const GoogleAccountModel = model('GoogleAccount', googleAccountSchema);
