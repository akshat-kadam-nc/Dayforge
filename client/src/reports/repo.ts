import { makeInitialState } from '../today/seed';
import { getReports } from './api';
import { addDaysKey } from './range';
import type { ReportsPayload, SeriesPoint, AreaTime } from './types';

export interface ReportsRepo {
  load(from: string, to: string): Promise<ReportsPayload>;
}

export const apiReportsRepo: ReportsRepo = {
  load(from, to) {
    return getReports(from, to);
  },
};

// ---- Demo mode: synthesise a plausible look-back from the seed ----

/** Deterministic 0..1 keyed off a string, so demo numbers are stable across reloads. */
function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const localReportsRepo: ReportsRepo = {
  async load(from, to) {
    const s = makeInitialState();
    const areas = s.areas;

    const perAreaMap = new Map<string, AreaTime>();
    const series: SeriesPoint[] = [];
    let faster = 0;
    let slower = 0;
    let onEstimate = 0;

    for (let key = from; key <= to; key = addDaysKey(key, 1)) {
      const dow = new Date(key).getDay();
      const workday = dow >= 1 && dow <= 5;
      // 1-3 active areas per day, weighted by a per-day hash.
      const active = areas.filter((_, i) => hash(key + ':' + i) > 0.4).slice(0, 3);
      let dayLogged = 0;
      let dayDone = 0;
      active.forEach((a, i) => {
        const est = 30 + Math.round(hash(key + a.id) * (i === 0 ? 180 : 90));
        // Actual logged drifts around the estimate so pace looks organic.
        const drift = 0.7 + hash(key + a.id + 'd') * 0.7; // 0.7..1.4
        const logged = workday ? Math.round(est * drift) : Math.round(est * drift * 0.6);
        const pa = perAreaMap.get(a.id) ?? { areaId: a.id, loggedMinutes: 0, estimateMinutes: 0, doneCount: 0 };
        pa.loggedMinutes += logged;
        pa.estimateMinutes += est;
        pa.doneCount += 1;
        perAreaMap.set(a.id, pa);
        if (logged < est) faster += 1; else if (logged > est) slower += 1; else onEstimate += 1;
        dayLogged += logged;
        dayDone += 1;
      });
      series.push({ day: key, loggedMinutes: dayLogged, doneCount: dayDone });
    }

    const perArea = [...perAreaMap.values()];
    const loggedMinutes = perArea.reduce((x, p) => x + p.loggedMinutes, 0);
    const estimateMinutes = perArea.reduce((x, p) => x + p.estimateMinutes, 0);
    const doneCount = perArea.reduce((x, p) => x + p.doneCount, 0);
    const days = series.length;

    // Deadlines: pretend ~55% of done tasks carried a due date; most on time.
    const withDeadline = Math.round(doneCount * 0.55);
    const late = Math.round(withDeadline * 0.3);
    const onTime = withDeadline - late;
    const worstLate = series
      .filter((_, i) => i % 5 === 2)
      .slice(0, 4)
      .map((p, i) => ({
        title: ['Send investor update', 'Cohort 4 review', 'Ship v1.2 notes', 'Partner contract'][i % 4],
        dueAt: `${p.day}T17:00:00.000Z`,
        completedAt: `${addDaysKey(p.day, 1 + (i % 2))}T11:30:00.000Z`,
        latenessMin: 18 * 60 + i * 40,
      }));

    // Completed goals: stamp a couple of seed goals within the range.
    const seedGoals = s.goals.slice(0, 3);
    const completed = seedGoals.map((g, i) => ({
      id: g.id,
      text: g.text,
      icon: g.icon,
      areaId: g.areaId,
      period: g.period ?? 'weekly',
      completedAt: `${addDaysKey(from, Math.min(days - 1, 2 + i * 4))}T16:00:00.000Z`,
    }));

    // Team delegation history.
    const people = [
      { personId: 'demo-p1', name: 'Alex Carter', color: '#6366f1' },
      { personId: 'demo-p2', name: 'Sam Rivera', color: '#ec4899' },
      { personId: 'demo-p3', name: 'Jordan Lee', color: '#f59e0b' },
    ];
    const team = people.map((p, i) => ({
      ...p,
      doneCount: 2 + Math.round(hash(p.name + from) * 5) - i,
      recent: [
        { title: ['Fix Play Store rejection', 'Partnership deck', 'Curriculum sync'][i], completedAt: `${addDaysKey(to, -1 - i)}T15:00:00.000Z`, ventureLabel: ['Nimbus', 'Orbit', 'Academy'][i] },
        { title: ['v1.2 QA pass', 'Lead follow-ups', 'Lesson 6 draft'][i], completedAt: `${addDaysKey(to, -3 - i)}T12:00:00.000Z`, ventureLabel: undefined },
      ],
    })).map((p) => ({ ...p, doneCount: Math.max(1, p.doneCount) }));

    return {
      start: from,
      end: to,
      days,
      areas,
      perArea,
      totals: { loggedMinutes, estimateMinutes, doneCount, availableMinutes: days * 360, days },
      pace: { estimateMinutes, loggedMinutes, faster, onEstimate, slower },
      deadlines: {
        withDeadline,
        onTime,
        late,
        avgLatenessMin: late > 0 ? 9 * 60 : 0,
        byType: { soft: { onTime: Math.round(onTime * 0.7), late: Math.round(late * 0.6) }, hard: { onTime: onTime - Math.round(onTime * 0.7), late: late - Math.round(late * 0.6) } },
        worstLate,
      },
      goals: { completed, legacyCount: 1 },
      team,
      series,
    };
  },
};
