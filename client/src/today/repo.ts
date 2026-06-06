import { api } from '../api/client';
import { makeInitialState } from './seed';
import type {
  FunctionTrack,
  Goal,
  Interruption,
  InterruptionType,
  LifeArea,
  Task,
  TimeLog,
} from './types';

/** Today's day key in YYYY-MM-DD (local), matching the server's dayKey(). */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The slices the cockpit hydrates from. */
export interface TodaySlices {
  areas: LifeArea[];
  tracks: FunctionTrack[];
  tasks: Task[];
  goals: Goal[];
  interruptions: Interruption[];
  logs: TimeLog[];
  fixedBlocks: { id: string; label: string; minutes: number; color: string }[];
  availableMinutes: number;
}

export interface CreateTaskInput {
  title: string;
  areaId: string;
  estimateMinutes: number;
  trackId?: string;
  goalId?: string;
  delegateName?: string;
  scheduledAt?: string;
}
export interface CreateAreaInput { name: string; icon: string; color: string }
export interface CreateTrackInput { areaId: string; name: string; color: string }
export interface CreateGoalInput { areaId: string; text: string; icon: string; pct: number; color: string }
export interface CreateInterruptionInput { type: InterruptionType; title: string; note?: string; minutes: number }
export interface CreateTimeLogInput { taskId: string; areaId: string; minutes: number }

/**
 * The data seam. `localRepo` keeps Phase 1 behaviour (in-memory seed, no
 * network) for demo mode; `apiRepo` persists to the backend for real accounts.
 * The reducer and components are identical across both.
 */
export interface TodayRepo {
  load(day: string): Promise<TodaySlices>;
  createArea(input: CreateAreaInput): Promise<LifeArea>;
  createTrack(input: CreateTrackInput): Promise<FunctionTrack>;
  updateTrack(id: string, patch: Partial<Pick<FunctionTrack, 'name' | 'color'>>): Promise<FunctionTrack>;
  deleteTrack(id: string): Promise<void>;
  createGoal(input: CreateGoalInput): Promise<Goal>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, patch: Partial<Pick<Task, 'status'>>): Promise<void>;
  deferTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  createInterruption(input: CreateInterruptionInput): Promise<Interruption>;
  createTimeLog(input: CreateTimeLogInput): Promise<void>;
}

// ---- Demo mode: in-memory, seeded, no persistence ----

export const localRepo: TodayRepo = {
  async load() {
    const s = makeInitialState();
    return {
      areas: s.areas,
      tracks: s.tracks,
      tasks: s.tasks,
      goals: s.goals,
      interruptions: s.interruptions,
      logs: s.logs,
      fixedBlocks: s.fixedBlocks,
      availableMinutes: s.availableMinutes,
    };
  },
  async createArea(input) {
    return { id: `a${Date.now()}`, ...input };
  },
  async createTrack(input) {
    return { id: `tr${Date.now()}`, ...input };
  },
  async updateTrack(id, patch) {
    return { id, areaId: '', name: '', color: '', ...patch };
  },
  async deleteTrack() {},
  async createGoal(input) {
    return { id: `g${Date.now()}`, ...input };
  },
  async createTask(input) {
    return {
      id: `t${Date.now()}`,
      title: input.title,
      areaId: input.areaId,
      trackId: input.trackId,
      goalId: input.goalId,
      delegateName: input.delegateName,
      scheduledAt: input.scheduledAt,
      estimateMinutes: input.estimateMinutes,
      status: 'not_started',
      source: 'manual',
      deferredCount: 0,
    };
  },
  async updateTask() {},
  async deferTask() {},
  async deleteTask() {},
  async createInterruption(input) {
    return { id: `i${Date.now()}`, ...input };
  },
  async createTimeLog() {},
};

// ---- Real accounts: persisted via the API ----

interface ServerDoc { _id: string }

function mapArea(d: ServerDoc & Omit<LifeArea, 'id'>): LifeArea {
  return { id: d._id, name: d.name, icon: d.icon, color: d.color };
}
function mapTrack(d: ServerDoc & Omit<FunctionTrack, 'id'>): FunctionTrack {
  return { id: d._id, areaId: String(d.areaId), name: d.name, color: d.color };
}
function mapGoal(d: ServerDoc & Omit<Goal, 'id'>): Goal {
  return { id: d._id, areaId: String(d.areaId), text: d.text, icon: d.icon, pct: d.pct, color: d.color };
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
    delegateName: d.delegateName as string | undefined,
    deferredCount: (d.deferredCount as number) ?? 0,
  };
}
function mapInterruption(d: ServerDoc & Record<string, unknown>): Interruption {
  return {
    id: d._id,
    type: d.type as InterruptionType,
    title: d.title as string,
    note: (d.note as string) || undefined,
    minutes: d.minutes as number,
  };
}
function mapLog(d: ServerDoc & Record<string, unknown>): TimeLog {
  return { taskId: String(d.taskId), areaId: String(d.areaId), minutes: d.minutes as number };
}

export const apiRepo: TodayRepo = {
  async load(day) {
    const r = await api<{
      availableMinutes: number;
      areas: (ServerDoc & Omit<LifeArea, 'id'>)[];
      tracks: (ServerDoc & Omit<FunctionTrack, 'id'>)[];
      goals: (ServerDoc & Omit<Goal, 'id'>)[];
      tasks: (ServerDoc & Record<string, unknown>)[];
      interruptions: (ServerDoc & Record<string, unknown>)[];
      logs: (ServerDoc & Record<string, unknown>)[];
    }>(`/today?day=${encodeURIComponent(day)}`);
    return {
      areas: r.areas.map(mapArea),
      tracks: r.tracks.map(mapTrack),
      goals: r.goals.map(mapGoal),
      tasks: r.tasks.map(mapTask),
      interruptions: r.interruptions.map(mapInterruption),
      logs: r.logs.map(mapLog),
      fixedBlocks: [],
      availableMinutes: r.availableMinutes,
    };
  },
  async createArea(input) {
    const r = await api<{ area: ServerDoc & Omit<LifeArea, 'id'> }>('/areas', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapArea(r.area);
  },
  async createTrack(input) {
    const r = await api<{ track: ServerDoc & Omit<FunctionTrack, 'id'> }>('/tracks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapTrack(r.track);
  },
  async updateTrack(id, patch) {
    const r = await api<{ track: ServerDoc & Omit<FunctionTrack, 'id'> }>(`/tracks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return mapTrack(r.track);
  },
  async deleteTrack(id) {
    await api(`/tracks/${id}`, { method: 'DELETE' });
  },
  async createGoal(input) {
    const r = await api<{ goal: ServerDoc & Omit<Goal, 'id'> }>('/goals', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapGoal(r.goal);
  },
  async createTask(input) {
    const r = await api<{ task: ServerDoc & Record<string, unknown> }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...input, day: todayKey() }),
    });
    return mapTask(r.task);
  },
  async updateTask(id, patch) {
    await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  async deferTask(id) {
    await api(`/tasks/${id}/defer`, { method: 'POST' });
  },
  async deleteTask(id) {
    await api(`/tasks/${id}`, { method: 'DELETE' });
  },
  async createInterruption(input) {
    const r = await api<{ interruption: ServerDoc & Record<string, unknown> }>('/interruptions', {
      method: 'POST',
      body: JSON.stringify({ ...input, day: todayKey() }),
    });
    return mapInterruption(r.interruption);
  },
  async createTimeLog(input) {
    await api('/timelogs', { method: 'POST', body: JSON.stringify({ ...input, day: todayKey() }) });
  },
};
