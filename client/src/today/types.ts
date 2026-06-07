/**
 * Domain types for the Today cockpit. These mirror what the server models will
 * hold in Phase 2 so the `useToday` data layer can swap seed data for the API
 * without touching components.
 */

export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'deferred' | 'blocked';

/** How a task entered the day. */
export type TaskSource = 'manual' | 'calendar' | 'recurring';

export type BudgetScope = 'day' | 'week' | 'month';

/** Aggregated budget for a week/month window (the server sums across days). */
export interface BudgetSummary {
  scope: BudgetScope;
  start: string;
  end: string;
  days: number;
  availableMinutes: number;
  allocated: number;
  logged: number;
  interrupted: number;
  perArea: { areaId: string; minutes: number }[];
}

export type InterruptionType = 'fire' | 'rabbit_hole' | 'distraction';

/** A venture / area of life. Color + icon drive the whole cockpit palette. */
export interface LifeArea {
  id: string;
  name: string;
  icon: string;
  /** Hex used for bars, ring segments, tags. */
  color: string;
}

/** A configurable work vertical inside an area (e.g. DeveLearn > Teaching). */
export interface FunctionTrack {
  id: string;
  areaId: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  areaId: string;
  trackId?: string;
  status: TaskStatus;
  /** Planned minutes. */
  estimateMinutes: number;
  source: TaskSource;
  /** Set for calendar/scheduled blocks, e.g. "11:00". */
  scheduledAt?: string;
  /** Linked weekly goal id, if any. */
  goalId?: string;
  /** Name of the report this is delegated to, if any. */
  delegateName?: string;
  /** How many times this task has rolled forward unfinished. */
  deferredCount: number;
}

export interface Interruption {
  id: string;
  type: InterruptionType;
  title: string;
  note?: string;
  minutes: number;
}

export interface Goal {
  id: string;
  areaId: string;
  text: string;
  icon: string;
  /** 0-100 progress. */
  pct: number;
  color: string;
}

/** A fixed, non-task block that consumes the day (sleep, standing meetings). */
export interface FixedBlock {
  id: string;
  label: string;
  minutes: number;
  color: string;
}

/** Accrued logged time against a task, produced by the timer. */
export interface TimeLog {
  taskId: string;
  areaId: string;
  minutes: number;
}

export interface TimerState {
  activeTaskId: string | null;
  /** Wall-clock ms when the current run started; null when stopped. */
  startedAt: number | null;
  /** Seconds accrued in the current run before the latest tick. */
  elapsedSeconds: number;
}

export interface TodayState {
  areas: LifeArea[];
  tracks: FunctionTrack[];
  tasks: Task[];
  goals: Goal[];
  interruptions: Interruption[];
  fixedBlocks: FixedBlock[];
  logs: TimeLog[];
  timer: TimerState;
  /** Per-area collapse state in the task list. */
  collapsedAreas: Record<string, boolean>;
  budgetScope: BudgetScope;
  /** Aggregated budget for the active week/month scope; null in day scope. */
  scopeSummary: BudgetSummary | null;
  /** Discretionary minutes available today after fixed blocks. */
  availableMinutes: number;
}
