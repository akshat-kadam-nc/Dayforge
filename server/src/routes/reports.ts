import { Router } from 'express';
import { LifeAreaModel } from '../models/LifeArea.js';
import { TaskModel } from '../models/Task.js';
import { GoalModel } from '../models/Goal.js';
import { PersonModel } from '../models/Person.js';
import { DelegationModel } from '../models/Delegation.js';
import { UserModel } from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { addDays, dayKey, normaliseDay } from '../util/day.js';
import { availableForRange } from '../services/availability.js';

export const reportsRouter = Router();
reportsRouter.use(requireDb, requireAuth);

/**
 * Look-back aggregate for the Reports page over an inclusive [from, to] day
 * range. Everything is bucketed by `completedAt` (the actual completion moment),
 * not `day` (the planned day) — the page answers "where did my time actually go".
 *
 * Timezone caveat: completedAt is bucketed in the server's TZ (Render = UTC), so
 * a late-night-IST completion can land a day off at the range edges. Same caveat
 * as the streak logic; revisit with a stored user TZ.
 */
reportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const a = normaliseDay(req.query.from);
    const b = normaliseDay(req.query.to ?? req.query.from);
    const [start, end] = a <= b ? [a, b] : [b, a];
    const lo = new Date(`${start}T00:00:00.000`);
    const hi = new Date(`${end}T23:59:59.999`);

    const [user, areas, doneTasks, goalsDone, persons, delegationsDone] = await Promise.all([
      UserModel.findById(userId),
      LifeAreaModel.find({ userId }).sort({ order: 1, createdAt: 1 }),
      TaskModel.find({ userId, kind: 'task', status: 'done', completedAt: { $gte: lo, $lte: hi } }),
      GoalModel.find({ userId, completedAt: { $gte: lo, $lte: hi } }).sort({ completedAt: -1 }),
      PersonModel.find({ userId }),
      DelegationModel.find({ userId, status: 'done', completedAt: { $gte: lo, $lte: hi } }).sort({ completedAt: -1 }),
    ]);

    // ── Per-area time + day series ──
    const perAreaMap = new Map<string, { loggedMinutes: number; estimateMinutes: number; doneCount: number }>();
    const seriesMap = new Map<string, { loggedMinutes: number; doneCount: number }>();
    let loggedMinutes = 0;
    let estimateMinutes = 0;

    // ── Pace ──
    let faster = 0;
    let onEstimate = 0;
    let slower = 0;

    // ── Deadlines ──
    let withDeadline = 0;
    let onTime = 0;
    let late = 0;
    let latenessSum = 0;
    const byType = {
      soft: { onTime: 0, late: 0 },
      hard: { onTime: 0, late: 0 },
    };
    const worstLate: { title: string; dueAt: string; completedAt: string; latenessMin: number }[] = [];

    for (const t of doneTasks) {
      const est = t.estimateMinutes ?? 0;
      const logged = t.loggedMinutes ?? 0;
      loggedMinutes += logged;
      estimateMinutes += est;

      const areaKey = String(t.areaId);
      const pa = perAreaMap.get(areaKey) ?? { loggedMinutes: 0, estimateMinutes: 0, doneCount: 0 };
      pa.loggedMinutes += logged;
      pa.estimateMinutes += est;
      pa.doneCount += 1;
      perAreaMap.set(areaKey, pa);

      const k = t.completedAt ? dayKey(t.completedAt) : t.day;
      const s = seriesMap.get(k) ?? { loggedMinutes: 0, doneCount: 0 };
      s.loggedMinutes += logged;
      s.doneCount += 1;
      seriesMap.set(k, s);

      // Pace: only meaningful when an estimate was set.
      if (est > 0) {
        if (logged < est) faster += 1;
        else if (logged > est) slower += 1;
        else onEstimate += 1;
      }

      // Deadline adherence: only tasks that carried a due date.
      if (t.dueAt && t.completedAt) {
        withDeadline += 1;
        const type = t.deadlineType === 'hard' ? 'hard' : 'soft';
        const latenessMin = Math.round((t.completedAt.getTime() - new Date(t.dueAt).getTime()) / 60000);
        if (latenessMin > 0) {
          late += 1;
          latenessSum += latenessMin;
          byType[type].late += 1;
          worstLate.push({
            title: t.title,
            dueAt: new Date(t.dueAt).toISOString(),
            completedAt: t.completedAt.toISOString(),
            latenessMin,
          });
        } else {
          onTime += 1;
          byType[type].onTime += 1;
        }
      }
    }

    worstLate.sort((x, y) => y.latenessMin - x.latenessMin);

    const perArea = [...perAreaMap].map(([areaId, v]) => ({ areaId, ...v }));

    // Fill the series with every day in range (zeros included) so the chart is contiguous.
    const series: { day: string; loggedMinutes: number; doneCount: number }[] = [];
    for (let key = start; key <= end; key = addDays(key, 1)) {
      const s = seriesMap.get(key) ?? { loggedMinutes: 0, doneCount: 0 };
      series.push({ day: key, ...s });
    }

    // ── Completed goals ──
    const completedGoals = goalsDone.map((g) => ({
      id: g._id,
      text: g.text,
      icon: g.icon,
      areaId: String(g.areaId),
      period: g.period,
      completedAt: g.completedAt?.toISOString(),
    }));
    // Goals already at 100 before completedAt existed (or completed outside the range stays out).
    const legacyCount = await GoalModel.countDocuments({ userId, pct: 100, completedAt: null });

    // ── Team delegation history ──
    const personById = new Map(persons.map((p) => [String(p._id), p]));
    const teamMap = new Map<string, { personId: string; name: string; color: string; doneCount: number; recent: { title: string; completedAt?: string; ventureLabel?: string }[] }>();
    for (const d of delegationsDone) {
      const pid = String(d.personId);
      const p = personById.get(pid);
      if (!p) continue;
      const entry = teamMap.get(pid) ?? { personId: pid, name: p.name, color: p.color, doneCount: 0, recent: [] };
      entry.doneCount += 1;
      if (entry.recent.length < 5) {
        entry.recent.push({ title: d.title, completedAt: d.completedAt?.toISOString(), ventureLabel: d.ventureLabel || undefined });
      }
      teamMap.set(pid, entry);
    }
    const team = [...teamMap.values()].sort((x, y) => y.doneCount - x.doneCount);

    const days = series.length;
    res.json({
      start,
      end,
      days,
      areas,
      perArea,
      totals: {
        loggedMinutes,
        estimateMinutes,
        doneCount: doneTasks.length,
        availableMinutes: availableForRange(user, start, end),
        days,
      },
      pace: { estimateMinutes, loggedMinutes, faster, onEstimate, slower },
      deadlines: {
        withDeadline,
        onTime,
        late,
        avgLatenessMin: late > 0 ? Math.round(latenessSum / late) : 0,
        byType,
        worstLate: worstLate.slice(0, 5),
      },
      goals: { completed: completedGoals, legacyCount },
      team,
      series,
    });
  }),
);
