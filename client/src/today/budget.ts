import type { LifeArea, Task, TodayState } from './types';

const MINUTES_IN_DAY = 1440;
export const RING_RADIUS = 46;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface Segment {
  id: string;
  label: string;
  minutes: number;
  color: string;
}

/** Whether a task currently has a live (uncommitted) run. */
export function isRunning(state: TodayState, taskId: string): boolean {
  return !!state.timer.runs[taskId];
}

/** Live, uncommitted minutes accrued by a single task's current run. */
export function liveMinutesForTask(state: TodayState, taskId: string): number {
  return (state.timer.runs[taskId]?.elapsedSeconds ?? 0) / 60;
}

/** Total live minutes across every concurrently running task. */
export function liveRunMinutes(state: TodayState): number {
  return Object.values(state.timer.runs).reduce((sum, r) => sum + r.elapsedSeconds / 60, 0);
}

/** A task's logged time = committed minutes + its live run. */
export function taskLoggedMinutes(state: TodayState, task: Task): number {
  return task.loggedMinutes + liveMinutesForTask(state, task.id);
}

/** A task's logged time in whole seconds (committed + live run), for HH:MM:SS display. */
export function taskLoggedSeconds(state: TodayState, task: Task): number {
  return Math.round(task.loggedMinutes * 60) + (state.timer.runs[task.id]?.elapsedSeconds ?? 0);
}

/** Only the tasks scheduled for the day the cockpit is showing (excludes the
 *  Pending/overdue and Scheduled/future buckets that share the tasks array). */
export function todaysTasks(state: TodayState): Task[] {
  return state.tasks.filter((t) => t.day === state.day);
}

/** Today's tasks that count toward the per-area budget: normal tasks only.
 *  Chores roll up into a single Chores block via the chore_session, so the
 *  individual chores and the session itself are excluded here. */
export function budgetTasks(state: TodayState): Task[] {
  return todaysTasks(state).filter((t) => t.kind === 'task');
}

/** Chores to show in today's card: today's chores (any status) plus any
 *  still-open chore carried over from an earlier day. Done past chores drop off.
 *  This is the chore equivalent of deadline overflow — unfinished small stuff
 *  follows you forward instead of being silently lost. */
export function activeChores(state: TodayState): Task[] {
  return state.tasks.filter(
    (t) =>
      t.kind === 'chore' &&
      (t.day === state.day || (t.day < state.day && t.status !== 'done')),
  );
}

/** Whether a chore has been carried over from a previous day. */
export function isCarriedChore(state: TodayState, chore: Task): boolean {
  return chore.day < state.day;
}

/** The single chore-session block for the shown day, if one exists. */
export function choreSession(state: TodayState): Task | undefined {
  return todaysTasks(state).find((t) => t.kind === 'chore_session');
}

export const CHORES_COLOR = '#14b8a6';

/** Planned minutes set aside for chores (the session's estimate). */
export function choresPlannedMinutes(state: TodayState): number {
  return choreSession(state)?.estimateMinutes ?? 0;
}

/** Time actually spent on chores = the session's logged minutes + live run. */
export function choresLoggedMinutes(state: TodayState): number {
  const s = choreSession(state);
  return s ? taskLoggedMinutes(state, s) : 0;
}

/** Local YYYY-MM-DD for an ISO timestamp (matches day-key convention). */
function localDayOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tasks completed on the shown day — keyed off completedAt, not the scheduled
 *  day, so a past-day task finished today still counts as completed today. */
export function completedTodayTasks(state: TodayState): Task[] {
  return state.tasks.filter(
    (t) =>
      t.kind === 'task' &&
      t.status === 'done' &&
      (t.completedAt ? localDayOf(t.completedAt) === state.day : t.day === state.day),
  );
}

/** Sum of planned estimates across today's tasks plus the chores block. */
export function allocatedMinutes(state: TodayState): number {
  return budgetTasks(state).reduce((sum, t) => sum + t.estimateMinutes, 0) + choresPlannedMinutes(state);
}

export function allocatedForArea(state: TodayState, areaId: string): number {
  return budgetTasks(state)
    .filter((t) => t.areaId === areaId)
    .reduce((sum, t) => sum + t.estimateMinutes, 0);
}

/** Logged time across today's tasks (committed per-task minutes + any live runs)
 *  plus the chore session's logged time. */
export function loggedMinutes(state: TodayState): number {
  return (
    budgetTasks(state).reduce((sum, t) => sum + taskLoggedMinutes(state, t), 0) +
    choresLoggedMinutes(state)
  );
}

/** Net minutes gained (finished under estimate) minus lost (over) across tasks
 *  completed today. Positive = time gained, negative = time lost. */
export function timeGainedMinutes(state: TodayState): number {
  return completedTodayTasks(state).reduce(
    (sum, t) => sum + (t.estimateMinutes - t.loggedMinutes),
    0,
  );
}

export function interruptedMinutes(state: TodayState): number {
  return state.interruptions.reduce((sum, i) => sum + i.minutes, 0);
}

/** Timed calendar events that are set to deduct from the budget. */
export function calendarDeductMinutes(state: TodayState): number {
  return state.calendarEvents
    .filter((e) => e.deduct && !e.allDay)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
}

/** Discretionary minutes left after calendar blocks eat into the day's budget. */
export function effectiveAvailable(state: TodayState): number {
  return Math.max(0, state.availableMinutes - calendarDeductMinutes(state));
}

/** Positive when planned work exceeds the discretionary budget. */
export function overflowMinutes(state: TodayState): number {
  return allocatedMinutes(state) - effectiveAvailable(state);
}

const INTERRUPT_COLOR = '#f43f5e';
const UNTRACKED_COLOR = 'rgba(148,163,184,0.4)';

/** Per-area allocation segments, ordered by the area list. */
function areaSegments(state: TodayState): Segment[] {
  return state.areas
    .map((area: LifeArea) => ({
      id: area.id,
      label: area.name,
      minutes: allocatedForArea(state, area.id),
      color: area.color,
    }))
    .filter((s) => s.minutes > 0);
}

/** Fixed blocks + area allocations + interruptions. Used by the 24h ring. */
export function ringSegments(state: TodayState): Segment[] {
  const fixed = state.fixedBlocks.map((b) => ({
    id: b.id,
    label: b.label,
    minutes: b.minutes,
    color: b.color,
  }));
  // Deducting calendar events behave like fixed blocks on the ring.
  const calendar = state.calendarEvents
    .filter((e) => e.deduct && !e.allDay && e.durationMinutes > 0)
    .map((e) => ({ id: `cal:${e.id}`, label: e.title, minutes: e.durationMinutes, color: e.color }));
  const interrupt = interruptedMinutes(state);
  const chores = choresPlannedMinutes(state);
  return [
    ...fixed,
    ...calendar,
    ...areaSegments(state),
    ...(chores > 0
      ? [{ id: 'chores', label: 'Chores', minutes: chores, color: CHORES_COLOR }]
      : []),
    ...(interrupt > 0
      ? [{ id: 'interruptions', label: 'Interruptions', minutes: interrupt, color: INTERRUPT_COLOR }]
      : []),
  ];
}

/** Ring segments plus an "Untracked" remainder filling the 24h circle. */
export function budgetBarSegments(state: TodayState): Segment[] {
  const segs = ringSegments(state);
  const used = segs.reduce((sum, s) => sum + s.minutes, 0);
  const untracked = Math.max(0, MINUTES_IN_DAY - used);
  return [
    ...segs,
    ...(untracked > 0
      ? [{ id: 'untracked', label: 'Untracked', minutes: untracked, color: UNTRACKED_COLOR }]
      : []),
  ];
}

/** Convert a segment list into SVG stroke dash/offset pairs on the 24h circle. */
export function toRingDashes(segments: Segment[]) {
  let consumed = 0;
  return segments.map((seg) => {
    const length = (seg.minutes / MINUTES_IN_DAY) * RING_CIRCUMFERENCE;
    const gap = RING_CIRCUMFERENCE - length;
    const offset = -consumed;
    consumed += length;
    return { seg, dasharray: `${length} ${gap}`, dashoffset: offset };
  });
}

/** Each segment's width as a percentage of the 24h day, for the stacked bar. */
export function toBarPercents(segments: Segment[]) {
  return segments.map((seg) => ({
    seg,
    pct: (seg.minutes / MINUTES_IN_DAY) * 100,
  }));
}
