import type { LifeArea } from '../today/types';
export type { LifeArea } from '../today/types';

export interface AreaTime {
  areaId: string;
  loggedMinutes: number;
  estimateMinutes: number;
  doneCount: number;
}

export interface ReportTotals {
  loggedMinutes: number;
  estimateMinutes: number;
  doneCount: number;
  availableMinutes: number;
  days: number;
}

export interface PaceStats {
  estimateMinutes: number;
  loggedMinutes: number;
  faster: number;
  onEstimate: number;
  slower: number;
}

export interface DeadlineStats {
  withDeadline: number;
  onTime: number;
  late: number;
  avgLatenessMin: number;
  byType: {
    soft: { onTime: number; late: number };
    hard: { onTime: number; late: number };
  };
  worstLate: { title: string; dueAt: string; completedAt: string; latenessMin: number }[];
}

export interface CompletedGoal {
  id: string;
  text: string;
  icon: string;
  areaId: string;
  period: string;
  completedAt?: string;
}

export interface MissedGoal {
  id: string;
  text: string;
  icon: string;
  areaId: string;
  period: string;
  pct: number;
  resolvedAt?: string;
}

export interface TeamMemberStat {
  personId: string;
  name: string;
  color: string;
  doneCount: number;
  recent: { title: string; completedAt?: string; ventureLabel?: string }[];
}

export interface SeriesPoint {
  day: string;
  loggedMinutes: number;
  doneCount: number;
}

export interface ReportsPayload {
  start: string;
  end: string;
  days: number;
  areas: LifeArea[];
  perArea: AreaTime[];
  totals: ReportTotals;
  pace: PaceStats;
  deadlines: DeadlineStats;
  goals: { completed: CompletedGoal[]; missed: MissedGoal[]; legacyCount: number };
  team: TeamMemberStat[];
  series: SeriesPoint[];
}

/** One row of the raw task-history table. */
export interface TaskHistoryRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  areaId?: string;
  goalId?: string;
  estimateMinutes: number;
  loggedMinutes: number;
  dueAt?: string;
  deadlineType?: string;
  createdAt?: string;
  completedAt?: string;
  day: string;
}

export interface GoalLite {
  id: string;
  text: string;
  icon: string;
}

/** Everything the history tab needs: the full task list plus lookups. */
export interface TaskHistory {
  tasks: TaskHistoryRow[];
  areas: LifeArea[];
  goals: GoalLite[];
}
