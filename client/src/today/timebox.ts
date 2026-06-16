import type { CalendarEvent, Task, TodayState } from './types';
import { isOnTodayPlate, todaysTasks } from './budget';

/** Timeboxing granularity. All starts and sizes snap to this. */
export const SNAP_MIN = 15;

/** Default visible window when nothing forces it wider (7am–11pm). */
const DEFAULT_START = 7 * 60;
const DEFAULT_END = 23 * 60;

/** "HH:MM" (24h) -> minutes since midnight, or null if blank/invalid. */
export function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight -> "HH:MM" (24h), for storage. */
export function toHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Minutes since midnight -> compact 12h clock, e.g. "9:30a", "4p". */
export function fmtTimeOfDay(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h < 12 ? 'a' : 'p';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm === 0 ? `${h12}${ap}` : `${h12}:${String(mm).padStart(2, '0')}${ap}`;
}

/** Round a minute value to the nearest snap step. */
export function snap(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

export interface Box {
  task: Task;
  startMin: number;
  endMin: number;
}

/** A box's length on the timeline: its estimate, floored to one snap step so
 *  even a 0-estimate task stays grabbable. */
export function boxDuration(task: Task): number {
  return Math.max(SNAP_MIN, task.estimateMinutes);
}

/** Today's normal tasks that have been placed on the clock. */
export function scheduledBoxes(state: TodayState): Box[] {
  return todaysTasks(state)
    .filter((t) => t.kind === 'task')
    .map((t) => {
      const s = parseHHMM(t.scheduledAt);
      return s == null ? null : { task: t, startMin: s, endMin: s + boxDuration(t) };
    })
    .filter((b): b is Box => b !== null)
    .sort((a, b) => a.startMin - b.startMin);
}

/** Today's open tasks not yet placed on the clock (the tray). */
export function unscheduledTasks(state: TodayState): Task[] {
  return todaysTasks(state).filter(
    (t) => t.kind === 'task' && t.status !== 'done' && parseHHMM(t.scheduledAt) == null,
  );
}

/** Overdue/pending tasks (slated for an earlier day, off today's plate) that can
 *  still be pulled onto today's clock. Placing one moves it to today. */
export function pendingPlaceable(state: TodayState): Task[] {
  return state.tasks.filter(
    (t) => t.kind === 'task' && t.status !== 'done' && t.day < state.day && !isOnTodayPlate(state, t),
  );
}

export interface EventBlock {
  id: string;
  title: string;
  color: string;
  startMin: number;
  endMin: number;
}

function eventStartMin(e: CalendarEvent): number | null {
  if (e.allDay || !e.start) return null;
  const d = new Date(e.start);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

/** Timed, budget-deducting calendar events as fixed bands on the timeline. */
export function timedEvents(state: TodayState): EventBlock[] {
  return state.calendarEvents
    .filter((e) => e.deduct && !e.allDay)
    .map((e) => {
      const s = eventStartMin(e);
      return s == null
        ? null
        : { id: e.id, title: e.title, color: e.color, startMin: s, endMin: s + Math.max(SNAP_MIN, e.durationMinutes) };
    })
    .filter((b): b is EventBlock => b !== null)
    .sort((a, b) => a.startMin - b.startMin);
}

/** The visible window: the default work window, widened to fit any placed box
 *  or event, rounded to whole hours and clamped to the 24h day. */
export function dayWindow(state: TodayState): { startMin: number; endMin: number } {
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  for (const b of [...scheduledBoxes(state), ...timedEvents(state)]) {
    start = Math.min(start, b.startMin);
    end = Math.max(end, b.endMin);
  }
  start = Math.max(0, Math.floor(start / 60) * 60);
  end = Math.min(1440, Math.ceil(end / 60) * 60);
  if (end - start < 60) end = Math.min(1440, start + 60);
  return { startMin: start, endMin: end };
}

interface Span {
  startMin: number;
  endMin: number;
}
function overlaps(a: Span, b: Span): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Ids of placed tasks that overlap another task or a timed event. */
export function conflictIds(state: TodayState): Set<string> {
  const boxes = scheduledBoxes(state);
  const events = timedEvents(state);
  const ids = new Set<string>();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) {
        ids.add(boxes[i].task.id);
        ids.add(boxes[j].task.id);
      }
    }
    for (const e of events) {
      if (overlaps(boxes[i], e)) ids.add(boxes[i].task.id);
    }
  }
  return ids;
}

/** Earliest snapped start in the window where `durationMin` fits with no
 *  overlap. Falls back to the window start (shows as a conflict) if nothing fits. */
export function findFreeSlot(
  state: TodayState,
  durationMin: number,
  win: { startMin: number; endMin: number },
): number {
  const occupied: Span[] = [
    ...scheduledBoxes(state).map((b) => ({ startMin: b.startMin, endMin: b.endMin })),
    ...timedEvents(state).map((e) => ({ startMin: e.startMin, endMin: e.endMin })),
  ];
  const dur = Math.max(SNAP_MIN, durationMin);
  for (let t = win.startMin; t + dur <= win.endMin; t += SNAP_MIN) {
    const cand = { startMin: t, endMin: t + dur };
    if (!occupied.some((o) => overlaps(cand, o))) return t;
  }
  return win.startMin;
}
