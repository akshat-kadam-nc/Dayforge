import { api } from '../api/client';
import type { LifeArea } from '../today/types';
import type { ReportsPayload, TaskHistory, TaskHistoryRow } from './types';

interface ServerDoc { _id: string }
type Doc = ServerDoc & Record<string, unknown>;

function mapArea(d: ServerDoc & Omit<LifeArea, 'id'>): LifeArea {
  return { id: d._id, name: d.name, icon: d.icon, color: d.color };
}

function mapTaskRow(d: Doc): TaskHistoryRow {
  return {
    id: d._id,
    title: String(d.title ?? ''),
    kind: String(d.kind ?? 'task'),
    status: String(d.status ?? 'not_started'),
    areaId: d.areaId ? String(d.areaId) : undefined,
    goalId: d.goalId ? String(d.goalId) : undefined,
    estimateMinutes: Number(d.estimateMinutes ?? 0),
    loggedMinutes: Number(d.loggedMinutes ?? 0),
    dueAt: d.dueAt ? new Date(d.dueAt as string).toISOString() : undefined,
    deadlineType: d.deadlineType ? String(d.deadlineType) : undefined,
    createdAt: d.createdAt ? String(d.createdAt) : undefined,
    completedAt: d.completedAt ? String(d.completedAt) : undefined,
    day: String(d.day ?? ''),
  };
}

export async function getReports(from: string, to: string): Promise<ReportsPayload> {
  const r = await api<Omit<ReportsPayload, 'areas'> & { areas: (ServerDoc & Omit<LifeArea, 'id'>)[] }>(
    `/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return { ...r, areas: r.areas.map(mapArea) };
}

/** Full raw task list plus the area/goal lookups the history table needs. */
export async function getTaskHistory(): Promise<TaskHistory> {
  const [t, a, g] = await Promise.all([
    api<{ tasks: Doc[] }>(`/tasks`),
    api<{ areas: (ServerDoc & Omit<LifeArea, 'id'>)[] }>(`/areas`),
    api<{ goals: Doc[] }>(`/goals`),
  ]);
  return {
    tasks: t.tasks.map(mapTaskRow),
    areas: a.areas.map(mapArea),
    goals: g.goals.map((d) => ({ id: d._id, text: String(d.text ?? ''), icon: String(d.icon ?? '🎯') })),
  };
}

/** Reverse a task: clear completion and put it back to not-started. The server
 *  clears completedAt for any non-done status. */
export async function reopenTask(id: string): Promise<void> {
  await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'not_started' }) });
}
