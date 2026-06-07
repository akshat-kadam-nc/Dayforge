import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const RECON_SCOPES = ['week', 'month', 'half_year'] as const;

const responseSchema = new Schema(
  { key: { type: String, required: true }, question: { type: String, required: true }, answer: { type: String, default: '' } },
  { _id: false },
);

const statsSchema = new Schema(
  {
    availableMinutes: Number,
    allocated: Number,
    logged: Number,
    interrupted: Number,
    perArea: [new Schema({ areaId: String, minutes: Number }, { _id: false })],
  },
  { _id: false },
);

/**
 * A completed period review. One per (userId, scope, periodKey) — re-submitting
 * the same close updates it. `stats` snapshots the budget at close time so the
 * review is faithful even if tasks later change.
 */
const reconciliationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    scope: { type: String, enum: RECON_SCOPES, required: true },
    periodKey: { type: String, required: true },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    label: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    responses: { type: [responseSchema], default: [] },
    stats: { type: statsSchema },
  },
  { timestamps: true },
);

reconciliationSchema.index({ userId: 1, scope: 1, periodKey: 1 }, { unique: true });

export type Reconciliation = InferSchemaType<typeof reconciliationSchema>;
export const ReconciliationModel = model('Reconciliation', reconciliationSchema);
