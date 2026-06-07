import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * Calendar events the user does NOT want deducting from the budget. Keyed by a
 * series key (a recurring event's series id, or a single event's id) so muting
 * one recurring meeting mutes every instance at once.
 */
const budgetExclusionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    seriesKey: { type: String, required: true },
    /** Kept for display in a "muted events" list. */
    label: { type: String },
  },
  { timestamps: true },
);

budgetExclusionSchema.index({ userId: 1, seriesKey: 1 }, { unique: true });

export type BudgetExclusion = InferSchemaType<typeof budgetExclusionSchema>;
export const BudgetExclusionModel = model('BudgetExclusion', budgetExclusionSchema);
