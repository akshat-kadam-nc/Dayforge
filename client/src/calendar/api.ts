import { api } from '../api/client';
import type { LifeArea, Task } from '../today/types';

/** Per-day aggregate the Calendar grid renders from. */
export interface CalendarDay {
  day: string;
  availableMinutes: number;
  allocated: number;
  overflow: boolean;
  followUp: boolean;
  completedCount: number;
  perArea: { areaId: string; minutes: number }[];
}

export interface CalendarPayload {
  start: string;
  end: string;
  areas: LifeArea[];
  days: CalendarDay[];
  tasks: Task[];
}

interface ServerDoc { _id: string }

function mapArea(d: ServerDoc & Omit<LifeArea, 'id'>): LifeArea {
  return { id: d._id, name: d.name, icon: d.icon, color: d.color };
}

function mapTask(d: ServerDoc & Record<string, unknown>): Task {
  return {
    id: d._id,
    title: d.title as string,
    areaId: String(d.areaId),
    trackId: d.trackId ? String(d.trackId) : undefined,
    goalId: d.goalId ? String(d.goalId) : undefined,
    status: d.status as Task['status'],
    source: (d.source as Task['source']) ?? 'manual',
    estimateMinutes: (d.estimateMinutes as number) ?? 0,
    scheduledAt: d.scheduledAt as string | undefined,
    day: d.day as string,
    dueAt: d.dueAt ? new Date(d.dueAt as string).toISOString() : undefined,
    deadlineType: d.deadlineType as Task['deadlineType'],
    delegateName: d.delegateName as string | undefined,
    deferredCount: (d.deferredCount as number) ?? 0,
    loggedMinutes: (d.loggedMinutes as number) ?? 0,
    createdAt: d.createdAt as string | undefined,
    completedAt: d.completedAt as string | undefined,
  };
}

export async function getCalendar(from: string, to: string): Promise<CalendarPayload> {
  const r = await api<{
    start: string;
    end: string;
    areas: (ServerDoc & Omit<LifeArea, 'id'>)[];
    days: CalendarDay[];
    tasks: (ServerDoc & Record<string, unknown>)[];
  }>(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  return {
    start: r.start,
    end: r.end,
    areas: r.areas.map(mapArea),
    days: r.days,
    tasks: r.tasks.map(mapTask),
  };
}
