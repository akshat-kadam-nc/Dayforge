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
      t.status === 'done' &&
      (t.completedAt ? localDayOf(t.completedAt) === state.day : t.day === state.day),
  );
}

/** Sum of planned estimates across all of today's tasks. */
export function allocatedMinutes(state: TodayState): number {
  return todaysTasks(state).reduce((sum, t) => sum + t.estimateMinutes, 0);
}

export function allocatedForArea(state: TodayState, areaId: string): number {
  return todaysTasks(state)
    .filter((t) => t.areaId === areaId)
    .reduce((sum, t) => sum + t.estimateMinutes, 0);
}

/** Logged time across today's tasks (committed per-task minutes + any live runs). */
export function loggedMinutes(state: TodayState): number {
  return todaysTasks(state).reduce((sum, t) => sum + taskLoggedMinutes(state, t), 0);
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
  return [
    ...fixed,
    ...calendar,
    ...areaSegments(state),
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
