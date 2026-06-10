import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const DELEGATION_STATUSES = ['pending', 'in_progress', 'done', 'blocked'] as const;

/** A piece of work delegated to a Person, with ticket-style status + follow-up. */
const delegationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    personId: { type: Types.ObjectId, ref: 'Person', required: true, index: true },
    title: { type: String, required: true, trim: true },
    /** Optional venture/context tag shown on the ticket, e.g. "Marketing". */
    ventureLabel: { type: String, default: '', trim: true },
    ventureColor: { type: String, default: '#7c3aed' },
    status: { type: String, enum: DELEGATION_STATUSES, default: 'pending', index: true },
    dueAt: { type: Date },
    /** When to next chase this. Drives the daily follow-up nudge. */
    followUpAt: { type: Date },
    /** Free-form recurrence label, e.g. "Weekly · Fri". Empty = one-off. */
    recurrence: { type: String, default: '', trim: true },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export type Delegation = InferSchemaType<typeof delegationSchema>;
export const DelegationModel = model('Delegation', delegationSchema);
