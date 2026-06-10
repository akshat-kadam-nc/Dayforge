import { api } from '../api/client';
import { makeInitialState } from './seed';
import type {
  BudgetScope,
  BudgetSummary,
  CalendarEvent,
  FunctionTrack,
  Goal,
  Interruption,
  InterruptionType,
  LifeArea,
  ReconciliationDue,
  ReconciliationInput,
  Task,
  TimeLog,
} from './types';
import { getGoogleEvents, muteSeries, unmuteSeries } from '../google/api';

/** Today's day key in YYYY-MM-DD (local), matching the server's dayKey(). */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Client mirror of the server's scopeRange (week = Mon–Sun, month = full month). */
function scopeRange(scope: BudgetScope, key: string): { start: string; end: string; days: number } {
  const [y, m, d] = key.split('-').map(Number);
  if (scope === 'day') return { start: key, end: key, days: 1 };
  if (scope === 'week') {
    const base = new Date(y, m - 1, d);
    const offset = (base.getDay() + 6) % 7;
    return { start: keyOf(new Date(y, m - 1, d - offset)), end: keyOf(new Date(y, m - 1, d - offset + 6)), days: 7 };
  }
  const last = new Date(y, m, 0);
  return { start: keyOf(new Date(y, m - 1, 1)), end: keyOf(last), days: last.getDate() };
}

function weekOfYear(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(y, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.ceil((days + start.getDay() + 1) / 7);
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
  day: string;
  streak: number;
}

export interface CreateTaskInput {
  title: string;
  /** Omitted only for a chore_session (cross-area). */
  areaId?: string;
  kind?: import('./types').TaskKind;
  estimateMinutes: number;
  trackId?: string;
  goalId?: string;
  delegateName?: string;
  scheduledAt?: string;
  /** The day the task should appear in Today (defaults to today). */
  day?: string;
  dueAt?: string;
  deadlineType?: import('./types').DeadlineType;
}
export interface CreateAreaInput { name: string; icon: string; color: string }
export interface CreateTrackInput { areaId: string; name: string; color: string }
export interface CreateGoalInput {
  areaId: string;
  text: string;
  icon: string;
  pct: number;
  color: string;
  period?: import('./types').GoalPeriod;
  parentId?: string | null;
}
export interface CreateInterruptionInput { type: InterruptionType; title: string; note?: string; minutes: number }
export interface CreateTimeLogInput { taskId: string; areaId: string; minutes: number }

/**
 * Fields a task PATCH may set. The timer/scheduling paths set a subset; the edit
 * modal sets the rest. `null` on a ref or dueAt clears it (the server stores null
 * rather than '' so the ObjectId/Date cast can't fail).
 */
export interface UpdateTaskPatch {
  status?: Task['status'];
  loggedMinutes?: number;
  day?: string;
  estimateMinutes?: number;
  scheduledAt?: string;
  title?: string;
  areaId?: string;
  trackId?: string | null;
  goalId?: string | null;
  dueAt?: string | null;
  deadlineType?: Task['deadlineType'];
}

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
  updateTask(id: string, patch: UpdateTaskPatch): Promise<void>;
  deferTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  createInterruption(input: CreateInterruptionInput): Promise<Interruption>;
  updateInterruption(id: string, input: CreateInterruptionInput): Promise<Interruption>;
  deleteInterruption(id: string): Promise<void>;
  createTimeLog(input: CreateTimeLogInput): Promise<void>;
  loadBudget(scope: BudgetScope, day: string): Promise<BudgetSummary>;
  loadDueReconciliations(day: string): Promise<ReconciliationDue[]>;
  saveReconciliation(input: ReconciliationInput): Promise<void>;
  loadCalendarEvents(day: string): Promise<CalendarEvent[]>;
  setSeriesDeduct(seriesKey: string, deduct: boolean, label?: string): Promise<void>;
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
      day: s.day,
      streak: 5, // demo: a plausible run so the streak pill is visible
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
    return {
      id: `g${Date.now()}`,
      ...input,
      period: input.period ?? 'weekly',
      parentId: input.parentId ?? undefined,
    };
  },
  async createTask(input) {
    return {
      id: `t${Date.now()}`,
      title: input.title,
      areaId: input.areaId ?? '',
      kind: input.kind ?? 'task',
      trackId: input.trackId,
      goalId: input.goalId,
      delegateName: input.delegateName,
      scheduledAt: input.scheduledAt,
      estimateMinutes: input.estimateMinutes,
      status: 'not_started',
      source: 'manual',
      day: input.day ?? todayKey(),
      dueAt: input.dueAt,
      deadlineType: input.deadlineType,
      deferredCount: 0,
      loggedMinutes: 0,
      createdAt: new Date().toISOString(),
    };
  },
  async updateTask() {},
  async deferTask() {},
  async deleteTask() {},
  async createInterruption(input) {
    return { id: `i${Date.now()}`, ...input };
  },
  async updateInterruption(id, input) {
    return { id, ...input };
  },
  async deleteInterruption() {},
  async createTimeLog() {},
  async loadDueReconciliations(day) {
    // Demo: surface a single weekly close for the current week, derived from the seed.
    const s = makeInitialState();
    const { start, end, days } = scopeRange('week', day);
    const k = 5.4;
    const perArea = s.areas.map((a) => ({
      areaId: a.id,
      minutes: Math.round(s.tasks.filter((t) => t.areaId === a.id).reduce((x, t) => x + t.estimateMinutes, 0) * k),
    }));
    const allocated = perArea.reduce((x, p) => x + p.minutes, 0);
    return [
      {
        scope: 'week',
        periodKey: start,
        start,
        end,
        days,
        label: `Week ${weekOfYear(end)}`,
        stats: {
          availableMinutes: 360 * days,
          allocated,
          logged: Math.round(allocated * 0.62),
          interrupted: Math.round(s.interruptions.reduce((x, i) => x + i.minutes, 0) * 3),
          perArea,
        },
      },
    ];
  },
  async saveReconciliation() {},
  async loadCalendarEvents() {
    // Demo: two illustrative events so the calendar block + mute toggle are visible.
    // The standup gets a real time today so it shows as a band on the day plan.
    const at = (h: number, m: number) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };
    return [
      {
        id: 'demo-ev1', seriesKey: 'demo-standup', title: 'Daily standup (recurring)',
        start: at(9, 30), end: at(10, 0), allDay: false, durationMinutes: 30, accountId: 'demo', color: '#4285F4', deduct: true,
      },
      {
        id: 'demo-ev2', seriesKey: 'demo-allhands', title: 'Company off-site', start: '', end: '',
        allDay: true, durationMinutes: 0, accountId: 'demo', color: '#0F9D58', deduct: false,
      },
    ];
  },
  async setSeriesDeduct() {},
  async loadBudget(scope, day) {
    // Demo has only one seeded day, so scale it to a plausible week/month window.
    const s = makeInitialState();
    const { start, end, days } = scopeRange(scope, day);
    const perAreaDay = s.areas.map((a) => ({
      areaId: a.id,
      minutes: s.tasks.filter((t) => t.areaId === a.id).reduce((sum, t) => sum + t.estimateMinutes, 0),
    }));
    // Vary the multiplier a little per day so totals look organic, not day×N flat.
    const k = scope === 'week' ? 5.4 : 22;
    const allocated = perAreaDay.reduce((sum, p) => sum + p.minutes, 0) * k;
    const logged = allocated * 0.62;
    const interrupted = s.interruptions.reduce((sum, i) => sum + i.minutes, 0) * (scope === 'week' ? 3 : 12);
    return {
      scope,
      start,
      end,
      days,
      availableMinutes: 360 * days,
      allocated: Math.round(allocated),
      logged: Math.round(logged),
      interrupted: Math.round(interrupted),
      perArea: perAreaDay.map((p) => ({ areaId: p.areaId, minutes: Math.round(p.minutes * k) })),
    };
  },
};

// ---- Real accounts: persisted via the API ----

interface ServerDoc { _id: string }

function mapArea(d: ServerDoc & Omit<LifeArea, 'id'>): LifeArea {
  return { id: d._id, name: d.name, icon: d.icon, color: d.color };
}
function mapTrack(d: ServerDoc & Omit<FunctionTrack, 'id'>): FunctionTrack {
  return { id: d._id, areaId: String(d.areaId), name: d.name, color: d.color };
}
function mapGoal(d: ServerDoc & Record<string, unknown>): Goal {
  return {
    id: d._id,
    areaId: String(d.areaId),
    text: d.text as string,
    icon: d.icon as string,
    pct: (d.pct as number) ?? 0,
    color: d.color as string,
    period: (d.period as Goal['period']) ?? 'weekly',
    parentId: d.parentId ? String(d.parentId) : undefined,
  };
}
function mapTask(d: ServerDoc & Record<string, unknown>): Task {
  return {
    id: d._id,
    title: d.title as string,
    areaId: d.areaId ? String(d.areaId) : '',
    kind: (d.kind as Task['kind']) ?? 'task',
    trackId: d.trackId ? String(d.trackId) : undefined,
    goalId: d.goalId ? String(d.goalId) : undefined,
    status: d.status as Task['status'],
    source: (d.source as Task['source']) ?? 'manual',
    estimateMinutes: (d.estimateMinutes as number) ?? 0,
    scheduledAt: d.scheduledAt as string | undefined,
    day: (d.day as string) ?? todayKey(),
    dueAt: d.dueAt ? new Date(d.dueAt as string).toISOString() : undefined,
    deadlineType: d.deadlineType as Task['deadlineType'],
    delegateName: d.delegateName as string | undefined,
    deferredCount: (d.deferredCount as number) ?? 0,
    loggedMinutes: (d.loggedMinutes as number) ?? 0,
    createdAt: d.createdAt as string | undefined,
    completedAt: d.completedAt as string | undefined,
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
      day: string;
      availableMinutes: number;
      areas: (ServerDoc & Omit<LifeArea, 'id'>)[];
      tracks: (ServerDoc & Omit<FunctionTrack, 'id'>)[];
      goals: (ServerDoc & Record<string, unknown>)[];
      tasks: (ServerDoc & Record<string, unknown>)[];
      interruptions: (ServerDoc & Record<string, unknown>)[];
      logs: (ServerDoc & Record<string, unknown>)[];
      streak?: number;
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
      day: r.day ?? day,
      streak: r.streak ?? 0,
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
    const r = await api<{ goal: ServerDoc & Record<string, unknown> }>('/goals', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapGoal(r.goal);
  },
  async createTask(input) {
    const r = await api<{ task: ServerDoc & Record<string, unknown> }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...input, day: input.day ?? todayKey() }),
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
  async updateInterruption(id, input) {
    const r = await api<{ interruption: ServerDoc & Record<string, unknown> }>(`/interruptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return mapInterruption(r.interruption);
  },
  async deleteInterruption(id) {
    await api(`/interruptions/${id}`, { method: 'DELETE' });
  },
  async createTimeLog(input) {
    await api('/timelogs', { method: 'POST', body: JSON.stringify({ ...input, day: todayKey() }) });
  },
  async loadBudget(scope, day) {
    return api<BudgetSummary>(`/budget?scope=${scope}&day=${encodeURIComponent(day)}`);
  },
  async loadDueReconciliations(day) {
    const r = await api<{ due: ReconciliationDue[] }>(`/reconciliations/due?day=${encodeURIComponent(day)}`);
    return r.due;
  },
  async saveReconciliation(input) {
    await api('/reconciliations', { method: 'POST', body: JSON.stringify(input) });
  },
  async loadCalendarEvents(day) {
    return getGoogleEvents(day);
  },
  async setSeriesDeduct(seriesKey, deduct, label) {
    // deduct=true means "count it" → no exclusion; deduct=false → mute the series.
    if (deduct) await unmuteSeries(seriesKey);
    else await muteSeries(seriesKey, label);
  },
};
