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
  goals: { completed: CompletedGoal[]; legacyCount: number };
  team: TeamMemberStat[];
  series: SeriesPoint[];
}
