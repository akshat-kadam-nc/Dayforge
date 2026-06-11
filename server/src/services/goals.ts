import { GoalModel } from '../models/Goal.js';
import { TaskModel } from '../models/Task.js';

export interface GoalRollup {
  estTotal: number;
  estDone: number;
  countTotal: number;
  countDone: number;
}
export type RollupMap = Record<string, GoalRollup>;

/**
 * Load a user's goals with their per-goal task rollup, and lazily resolve the
 * lifecycle of leaf count/timed goals (no scheduler exists, so terminal
 * transitions happen on read). Persists only the docs that actually changed.
 *
 * Rules (leaf goals only — parents stay pure aggregates):
 *   - derived pct: count → min(100, countDone/target); standard → estDone/estTotal
 *     (or the stored manual pct when nothing is linked).
 *   - derived >= 100  → completed (stamp completedAt, freeze pct=100)
 *   - timed & past dueAt & under target → missed (stamp resolvedAt, freeze pct)
 *   - active count leaves also persist their live pct so surfaces that read the
 *     stored pct (e.g. the Today sidebar) stay fresh.
 * Manual conclude/reopen is handled in the PATCH route, not here.
 */
export async function resolveAndRollup(userId: unknown): Promise<{
  goals: InstanceType<typeof GoalModel>[];
  rollup: RollupMap;
}> {
  const [goals, tasks] = await Promise.all([
    GoalModel.find({ userId }).sort({ createdAt: 1 }),
    TaskModel.find({ userId, goalId: { $ne: null }, kind: 'task' }).select('goalId status estimateMinutes'),
  ]);

  const rollup: RollupMap = {};
  for (const t of tasks) {
    const key = String(t.goalId);
    const r = (rollup[key] ??= { estTotal: 0, estDone: 0, countTotal: 0, countDone: 0 });
    const est = t.estimateMinutes ?? 0;
    r.estTotal += est;
    r.countTotal += 1;
    if (t.status === 'done') {
      r.estDone += est;
      r.countDone += 1;
    }
  }

  // A goal is a leaf when nothing lists it as a parent.
  const parentIds = new Set(goals.filter((g) => g.parentId).map((g) => String(g.parentId)));
  const now = new Date();

  for (const g of goals) {
    if (g.status !== 'active' || parentIds.has(String(g._id))) continue;
    const r = rollup[String(g._id)];

    let derived: number;
    if (g.metric === 'count' && g.targetCount) {
      derived = Math.min(100, Math.round(((r?.countDone ?? 0) / g.targetCount) * 100));
    } else {
      derived = r && r.estTotal > 0 ? Math.round((r.estDone / r.estTotal) * 100) : (g.pct ?? 0);
    }

    let changed = false;
    if (derived >= 100) {
      g.status = 'completed';
      if (!g.completedAt) g.completedAt = now;
      g.pct = 100;
      changed = true;
    } else if (g.timed && g.dueAt && now > g.dueAt) {
      g.status = 'missed';
      g.resolvedAt = now;
      g.pct = derived;
      changed = true;
    } else if (g.metric === 'count' && g.pct !== derived) {
      // Keep the stored pct fresh for active count leaves (standard leaves keep
      // their manual pct fallback, so we never overwrite those).
      g.pct = derived;
      changed = true;
    }
    if (changed) await g.save();
  }

  return { goals, rollup };
}
