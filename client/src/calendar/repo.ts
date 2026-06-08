import { makeInitialState } from '../today/seed';
import type { CalendarEvent, Task } from '../today/types';
import { getGoogleEvents } from '../google/api';
import { getCalendar, type CalendarDay, type CalendarPayload } from './api';
import { addDaysKey, parseKey, todayKey } from './grid';

export interface CalendarRepo {
  load(from: string, to: string): Promise<CalendarPayload>;
  loadEvents(from: string, to: string): Promise<CalendarEvent[]>;
}

// ---- Real accounts ----

export const apiCalendarRepo: CalendarRepo = {
  load(from, to) {
    return getCalendar(from, to);
  },
  async loadEvents(from, to) {
    return getGoogleEvents(from, to);
  },
};

// ---- Demo mode: synthesise a plausible month from the seed ----

/** Deterministic 0..1 pseudo-random keyed off a day string, so the grid looks
 *  organic but is stable across reloads. */
function hash(key: string): number {
  // FNV-1a — small avalanche so adjacent date strings spread across 0..1.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const localCalendarRepo: CalendarRepo = {
  async load(from, to) {
    const s = makeInitialState();
    const today = todayKey();
    const days: CalendarDay[] = [];
    const tasks: Task[] = [];

    for (let key = from; key <= to; key = addDaysKey(key, 1)) {
      const r = hash(key);
      const dow = parseKey(key).getDay();
      const workday = dow >= 1 && dow <= 5;
      const available = workday ? 360 : 600;

      // 0-3 areas active that day, scaled by the day's pseudo-random weight.
      const active = s.areas.filter((_, i) => hash(key + i) > 0.45).slice(0, 3);
      const perArea = active.map((a, i) => ({
        areaId: a.id,
        minutes: 30 + Math.round(hash(key + a.id) * (i === 0 ? 220 : 120)),
      }));
      const allocated = perArea.reduce((x, p) => x + p.minutes, 0);
      const followUp = r > 0.7;
      const isPast = key < today;

      // Synthesise a couple of tasks per active day for the Day detail.
      active.forEach((a, i) => {
        const done = isPast || (key === today && i === 0);
        const est = perArea[i]?.minutes ?? 60;
        tasks.push({
          id: `demo-${key}-${a.id}`,
          title: `${a.name} block`,
          areaId: a.id,
          status: done ? 'done' : 'not_started',
          estimateMinutes: est,
          source: 'manual',
          day: key,
          deferredCount: 0,
          loggedMinutes: done ? Math.round(est * (0.7 + hash(key + a.id) * 0.5)) : 0,
          createdAt: key + 'T08:00:00',
          completedAt: done ? key + 'T17:30:00' : undefined,
          delegateName: followUp && i === 0 ? 'Rahul' : undefined,
        });
      });

      days.push({
        day: key,
        availableMinutes: available,
        allocated,
        overflow: allocated > available,
        followUp,
        completedCount: tasks.filter((t) => t.day === key && t.status === 'done').length,
        perArea,
      });
    }

    return { start: from, end: to, areas: s.areas, days, tasks };
  },

  async loadEvents(from, to) {
    // A few illustrative events spread across the window.
    const today = todayKey();
    const mk = (dayOffset: number, title: string, color: string, allDay = false): CalendarEvent => {
      const day = addDaysKey(today, dayOffset);
      return {
        id: `demo-ev-${dayOffset}`,
        seriesKey: `demo-${title}`,
        title,
        start: day + 'T10:00:00',
        end: day + 'T11:00:00',
        allDay,
        durationMinutes: allDay ? 0 : 60,
        accountId: 'demo',
        color,
        deduct: !allDay,
      };
    };
    const all = [
      mk(0, 'Faculty meeting', '#16a34a'),
      mk(1, 'Zuma standup', '#f59e0b'),
      mk(2, 'JICA prep call', '#0ea5e9'),
      mk(-1, 'Gym', '#22c55e'),
      mk(3, 'Company off-site', '#0F9D58', true),
    ];
    return all.filter((e) => e.start.slice(0, 10) >= from && e.start.slice(0, 10) <= to);
  },
};
