import { makeInitialState } from '../today/seed';
import type { Goal } from '../today/types';
import type { RollupMap } from './tree';
import {
  createGoal as apiCreate,
  deleteGoal as apiDelete,
  duplicateGoal as apiDuplicate,
  fetchRollup as apiFetch,
  updateGoal as apiUpdate,
  type GoalInput,
} from './api';

export interface GoalsRepo {
  load(): Promise<{ goals: Goal[]; rollup: RollupMap }>;
  create(input: GoalInput): Promise<Goal>;
  update(id: string, patch: Partial<GoalInput>): Promise<Goal>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<Goal>;
}

// ---- Real accounts ----

export const apiGoalsRepo: GoalsRepo = {
  load: apiFetch,
  create: apiCreate,
  update: apiUpdate,
  remove: apiDelete,
  duplicate: apiDuplicate,
};

// ---- Demo mode: derive the rollup from the in-memory seed ----

/** Sum linked-task estimates per goal from the seed, mirroring the server route. */
function seedRollup(): { goals: Goal[]; rollup: RollupMap } {
  const s = makeInitialState();
  const rollup: RollupMap = {};
  for (const t of s.tasks) {
    if (t.kind !== 'task' || !t.goalId) continue;
    const r = (rollup[t.goalId] ??= { estTotal: 0, estDone: 0, countTotal: 0, countDone: 0 });
    const est = t.estimateMinutes ?? 0;
    r.estTotal += est;
    r.countTotal += 1;
    if (t.status === 'done') {
      r.estDone += est;
      r.countDone += 1;
    }
  }
  return { goals: s.goals, rollup };
}

// Demo create/update/delete are in-memory only; the page applies them to local state.
export const localGoalsRepo: GoalsRepo = {
  async load() {
    return seedRollup();
  },
  async create(input) {
    return {
      id: `g${Date.now()}`,
      areaId: input.areaId,
      text: input.text,
      icon: input.icon,
      pct: input.pct ?? 0,
      color: input.color,
      period: input.period,
      parentId: input.parentId ?? undefined,
      metric: input.metric ?? 'standard',
      targetCount: input.targetCount ?? undefined,
      timed: input.timed ?? false,
      dueAt: input.dueAt ?? undefined,
      status: input.status ?? 'active',
    };
  },
  async update(id, patch) {
    // The page merges the patch into its own state; return a minimal echo.
    return {
      id,
      areaId: patch.areaId ?? '',
      text: patch.text ?? '',
      icon: patch.icon ?? '🎯',
      pct: patch.pct ?? 0,
      color: patch.color ?? '#8b5cf6',
      period: patch.period ?? 'weekly',
      parentId: patch.parentId ?? undefined,
      metric: patch.metric ?? 'standard',
      targetCount: patch.targetCount ?? undefined,
      timed: patch.timed ?? false,
      dueAt: patch.dueAt ?? undefined,
      status: patch.status ?? 'active',
      completedAt: patch.status === 'completed' ? new Date().toISOString() : undefined,
    };
  },
  async remove() {},
  async duplicate(_id) {
    return {
      id: `g${Date.now()}`,
      areaId: '',
      text: 'Copy',
      icon: '🎯',
      pct: 0,
      color: '#8b5cf6',
      period: 'weekly',
      status: 'active',
      metric: 'standard',
    };
  },
};
