import { api } from '../api/client';
import type { Goal, GoalMetric, GoalPeriod, GoalStatus } from '../today/types';
import type { RollupMap } from './tree';

interface ServerGoal {
  _id: string;
  areaId: string;
  text: string;
  icon: string;
  pct: number;
  color: string;
  period?: GoalPeriod;
  parentId?: string | null;
  metric?: GoalMetric;
  targetCount?: number | null;
  timed?: boolean;
  dueAt?: string | null;
  status?: GoalStatus;
  completedAt?: string | null;
  resolvedAt?: string | null;
}

export function mapGoal(d: ServerGoal): Goal {
  return {
    id: d._id,
    areaId: String(d.areaId),
    text: d.text,
    icon: d.icon,
    pct: d.pct ?? 0,
    color: d.color,
    period: d.period ?? 'weekly',
    parentId: d.parentId ? String(d.parentId) : undefined,
    metric: d.metric ?? 'standard',
    targetCount: d.targetCount ?? undefined,
    timed: d.timed ?? false,
    dueAt: d.dueAt ? new Date(d.dueAt).toISOString() : undefined,
    status: d.status ?? 'active',
    completedAt: d.completedAt ? new Date(d.completedAt).toISOString() : undefined,
    resolvedAt: d.resolvedAt ? new Date(d.resolvedAt).toISOString() : undefined,
  };
}

export interface GoalInput {
  areaId: string;
  text: string;
  icon: string;
  color: string;
  period: GoalPeriod;
  pct?: number;
  parentId?: string | null;
  metric?: GoalMetric;
  targetCount?: number | null;
  timed?: boolean;
  dueAt?: string | null;
  status?: GoalStatus;
}

export async function fetchRollup(): Promise<{ goals: Goal[]; rollup: RollupMap }> {
  const r = await api<{ goals: ServerGoal[]; rollup: RollupMap }>('/goals/rollup');
  return { goals: r.goals.map(mapGoal), rollup: r.rollup ?? {} };
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const r = await api<{ goal: ServerGoal }>('/goals', { method: 'POST', body: JSON.stringify(input) });
  return mapGoal(r.goal);
}

export async function updateGoal(id: string, patch: Partial<GoalInput>): Promise<Goal> {
  const r = await api<{ goal: ServerGoal }>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return mapGoal(r.goal);
}

export async function deleteGoal(id: string): Promise<void> {
  await api(`/goals/${id}`, { method: 'DELETE' });
}

export async function duplicateGoal(id: string): Promise<Goal> {
  const r = await api<{ goal: ServerGoal }>(`/goals/${id}/duplicate`, { method: 'POST' });
  return mapGoal(r.goal);
}
