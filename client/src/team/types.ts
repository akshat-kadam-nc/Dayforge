export const DELEGATION_STATUSES = ['pending', 'in_progress', 'done', 'blocked'] as const;
export type DelegationStatus = (typeof DELEGATION_STATUSES)[number];

export interface Person {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Delegation {
  id: string;
  personId: string;
  title: string;
  ventureLabel: string;
  ventureColor: string;
  status: DelegationStatus;
  /** ISO strings or undefined. */
  dueAt?: string;
  followUpAt?: string;
  recurrence: string;
  completedAt?: string;
}

export interface TeamData {
  people: Person[];
  delegations: Delegation[];
}

export const STATUS_LABEL: Record<DelegationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
};

export const STATUS_COLOR: Record<DelegationStatus, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  done: '#16a34a',
  blocked: '#ef4444',
};
