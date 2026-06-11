import type { Goal, GoalPeriod } from '../today/types';

/** Per-goal task aggregate from the server (or seed), keyed by goal id. */
export interface GoalRollup {
  estTotal: number;
  estDone: number;
  countTotal: number;
  countDone: number;
}

export type RollupMap = Record<string, GoalRollup>;

/** A goal plus its derived progress, task rollup, and nested children. */
export interface GoalNode {
  goal: Goal;
  /** Task rollup (weekly leaves only); undefined when no tasks are linked. */
  rollup?: GoalRollup;
  /** 0-100, derived: tasks for leaves, average of children for parents, else manual. */
  pct: number;
  children: GoalNode[];
}

export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  annual: 'Annual',
  half_year: 'Half-year',
  monthly: 'Monthly',
  weekly: 'Weekly',
};

const PERIOD_RANK: Record<GoalPeriod, number> = { weekly: 0, monthly: 1, half_year: 2, annual: 3 };

/** The period a child of this goal must have (one rung down), or null for weekly. */
export function childPeriodOf(period: GoalPeriod): GoalPeriod | null {
  if (period === 'annual') return 'half_year';
  if (period === 'half_year') return 'monthly';
  if (period === 'monthly') return 'weekly';
  return null;
}

/** True for completed/missed goals (frozen pct, shown in the Closed section). */
export function isTerminal(goal: Goal): boolean {
  return goal.status === 'completed' || goal.status === 'missed';
}

/**
 * Progress for a leaf goal. Terminal goals show their frozen stored pct. Count
 * goals are countDone/targetCount. Standard goals are estimate-weighted from
 * linked tasks (done-estimate / total-estimate), falling back to manual pct.
 */
function leafPct(goal: Goal, rollup: GoalRollup | undefined): number {
  if (isTerminal(goal)) return goal.pct;
  if (goal.metric === 'count' && goal.targetCount) {
    return Math.min(100, Math.round(((rollup?.countDone ?? 0) / goal.targetCount) * 100));
  }
  if (rollup && rollup.estTotal > 0) {
    return Math.round((rollup.estDone / rollup.estTotal) * 100);
  }
  return goal.pct;
}

/**
 * Build the area's goal forest from a flat list, deriving progress bottom-up.
 * Roots are goals with no parent (or whose parent is missing). Children are
 * sorted high period first so the tree reads Annual → Weekly top to bottom.
 */
export function buildForest(goals: Goal[], rollup: RollupMap): GoalNode[] {
  const byParent = new Map<string, Goal[]>();
  const ids = new Set(goals.map((g) => g.id));
  for (const g of goals) {
    const key = g.parentId && ids.has(g.parentId) ? g.parentId : '__root__';
    (byParent.get(key) ?? byParent.set(key, []).get(key)!).push(g);
  }

  function build(goal: Goal): GoalNode {
    const kids = (byParent.get(goal.id) ?? [])
      .sort((a, b) => PERIOD_RANK[b.period] - PERIOD_RANK[a.period])
      .map(build);
    const r = rollup[goal.id];
    let pct: number;
    if (isTerminal(goal)) {
      pct = goal.pct; // frozen at conclusion, parents included
    } else if (kids.length > 0) {
      pct = Math.round(kids.reduce((s, k) => s + k.pct, 0) / kids.length);
    } else {
      pct = leafPct(goal, r);
    }
    return { goal, rollup: r, pct, children: kids };
  }

  return (byParent.get('__root__') ?? [])
    .sort((a, b) => PERIOD_RANK[b.period] - PERIOD_RANK[a.period])
    .map(build);
}
