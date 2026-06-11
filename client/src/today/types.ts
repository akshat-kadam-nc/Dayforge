/**
 * Domain types for the Today cockpit. These mirror what the server models will
 * hold in Phase 2 so the `useToday` data layer can swap seed data for the API
 * without touching components.
 */

export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'deferred' | 'blocked';

export type DeadlineType = 'soft' | 'hard';

/** How a task entered the day. */
export type TaskSource = 'manual' | 'calendar' | 'recurring';

/**
 * `task` = normal estimated work. `chore` = a small end-of-day item (5/10/15
 * min) batched in the Chores card. `chore_session` = the single timed block the
 * chores are worked within; its logged time is the day's Chores budget block.
 */
export type TaskKind = 'task' | 'chore' | 'chore_session';

/** Allowed minute estimates for a chore. Anything larger should be a task. */
export const CHORE_ESTIMATES = [5, 10, 15] as const;

export type BudgetScope = 'day' | 'week' | 'month';

/** Budget totals over some window; shared by scope summaries and reconciliations. */
export interface BudgetStats {
  availableMinutes: number;
  allocated: number;
  logged: number;
  interrupted: number;
  perArea: { areaId: string; minutes: number }[];
}

/** Aggregated budget for a week/month window (the server sums across days). */
export interface BudgetSummary extends BudgetStats {
  scope: BudgetScope;
  start: string;
  end: string;
  days: number;
}

export type ReconScope = 'week' | 'month' | 'half_year';

export interface ReconResponse {
  key: string;
  question: string;
  answer: string;
}

/** A finished period awaiting its structured close, with a budget snapshot. */
export interface ReconciliationDue {
  scope: ReconScope;
  periodKey: string;
  start: string;
  end: string;
  days: number;
  label: string;
  stats: BudgetStats;
}

export interface ReconciliationInput {
  scope: ReconScope;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  label: string;
  rating?: number;
  responses: ReconResponse[];
  stats: BudgetStats;
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

/** A configurable work vertical inside an area (e.g. Studio > Design). */
export interface FunctionTrack {
  id: string;
  areaId: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  /** Empty for a chore_session (cross-area). Required for tasks and chores. */
  areaId: string;
  /** Defaults to 'task'. See TaskKind. */
  kind: TaskKind;
  trackId?: string;
  status: TaskStatus;
  /** Planned minutes. */
  estimateMinutes: number;
  source: TaskSource;
  /** The day this task is scheduled to appear in Today (YYYY-MM-DD). */
  day: string;
  /** Set for calendar/scheduled blocks, e.g. "11:00". */
  scheduledAt?: string;
  /** Optional deadline (ISO date-time) + how firm it is. */
  dueAt?: string;
  deadlineType?: DeadlineType;
  /** Linked weekly goal id, if any. */
  goalId?: string;
  /** Name of the report this is delegated to, if any. */
  delegateName?: string;
  /** How many times this task has rolled forward unfinished. */
  deferredCount: number;
  /** Committed minutes worked on this task (excludes any live, uncommitted run). */
  loggedMinutes: number;
  /** ISO timestamps. createdAt set on creation; completedAt set when marked done. */
  createdAt?: string;
  completedAt?: string;
}

/** How to record time when completing a task from the checkbox. */
export type LogMode = 'allocated' | 'custom' | 'none';

/** A synced calendar event. Deducting ones become fixed blocks in the budget. */
export interface CalendarEvent {
  id: string;
  /** Recurring series id (instances share it); equals id for one-offs. */
  seriesKey: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  durationMinutes: number;
  accountId: string;
  color: string;
  /** Whether this event deducts from the budget. */
  deduct: boolean;
}

export interface Interruption {
  id: string;
  type: InterruptionType;
  title: string;
  note?: string;
  minutes: number;
}

/** Goal hierarchy levels, low to high: weekly rolls up to annual. */
export type GoalPeriod = 'weekly' | 'monthly' | 'half_year' | 'annual';

export const GOAL_PERIODS: GoalPeriod[] = ['weekly', 'monthly', 'half_year', 'annual'];

/** standard = manual/estimate-weighted; count = completed linked tasks / targetCount. */
export type GoalMetric = 'standard' | 'count';
/** active until concluded; completed (done / hit target) or missed (timed lapse). */
export type GoalStatus = 'active' | 'completed' | 'missed';

export interface Goal {
  id: string;
  areaId: string;
  text: string;
  icon: string;
  /** 0-100 manual progress; for weekly goals it's a fallback when no tasks are linked. */
  pct: number;
  color: string;
  period: GoalPeriod;
  /** Goal one period-level up, if linked. */
  parentId?: string;
  /** How progress is measured (default standard). count is leaf-only. */
  metric?: GoalMetric;
  /** Target number of completed tasks, for count goals. */
  targetCount?: number;
  /** Timed goals fail when dueAt passes under target. */
  timed?: boolean;
  /** Deadline (ISO) for timed goals. */
  dueAt?: string;
  /** Lifecycle (default active). Terminal statuses freeze pct + move to Closed. */
  status?: GoalStatus;
  /** Set when completed (done / hit target / manually concluded). */
  completedAt?: string;
  /** Set when a timed goal resolves as missed. */
  resolvedAt?: string;
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

/** One in-progress run of a task (uncommitted time). */
export interface TimerRun {
  /** Wall-clock ms when this run started. */
  startedAt: number;
  /** Seconds accrued in this run so far. */
  elapsedSeconds: number;
}

/** Multiple tasks can run concurrently; each has its own live run. */
export interface TimerState {
  runs: Record<string, TimerRun>;
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
  /** Finished periods awaiting their structured close (week/month/half-year). */
  dueReconciliations: ReconciliationDue[];
  /** Synced Google Calendar events for the day. */
  calendarEvents: CalendarEvent[];
  /** The day the cockpit is currently showing (YYYY-MM-DD). */
  day: string;
  /** Discretionary minutes available today after fixed blocks. */
  availableMinutes: number;
  /** Consecutive days (ending today/yesterday) with at least one completed task. */
  streak: number;
}
