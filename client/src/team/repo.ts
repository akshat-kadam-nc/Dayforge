import {
  createDelegation as apiCreateDeleg,
  createPerson as apiCreatePerson,
  deleteDelegation as apiDeleteDeleg,
  deletePerson as apiDeletePerson,
  fetchTeam as apiFetch,
  updateDelegation as apiUpdateDeleg,
  updatePerson as apiUpdatePerson,
  type DelegationInput,
  type PersonInput,
} from './api';
import type { Delegation, Person, TeamData } from './types';

export interface TeamRepo {
  load(): Promise<TeamData>;
  createPerson(input: PersonInput): Promise<Person>;
  updatePerson(id: string, patch: Partial<PersonInput>): Promise<Person>;
  deletePerson(id: string): Promise<void>;
  createDelegation(input: DelegationInput): Promise<Delegation>;
  updateDelegation(id: string, patch: Partial<DelegationInput>): Promise<Delegation>;
  deleteDelegation(id: string): Promise<void>;
}

// ---- Real accounts ----

export const apiTeamRepo: TeamRepo = {
  load: apiFetch,
  createPerson: apiCreatePerson,
  updatePerson: apiUpdatePerson,
  deletePerson: apiDeletePerson,
  createDelegation: apiCreateDeleg,
  updateDelegation: apiUpdateDeleg,
  deleteDelegation: apiDeleteDeleg,
};

// ---- Demo mode: in-memory seed mirroring the mockup ----

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

function seed(): TeamData {
  const people: Person[] = [
    { id: 'p-rahul', name: 'Alex Carter', role: 'Lead Dev · Nimbus', color: '#3b82f6' },
    { id: 'p-priya', name: 'Sam Rivera', role: 'BD · Orbit', color: '#ec4899' },
    { id: 'p-amit', name: 'Jordan Lee', role: 'Curriculum · Academy', color: '#f97316' },
    { id: 'p-sneha', name: 'Taylor Brooks', role: 'Marketing · Nimbus', color: '#8b5cf6' },
    { id: 'p-karan', name: 'Morgan Reed', role: 'Ops · Orbit', color: '#06b6d4' },
    { id: 'p-neha', name: 'Casey Quinn', role: 'Admin · Academy', color: '#22c55e' },
    { id: 'p-vikram', name: 'Riley Stone', role: 'Product · Orbit', color: '#f43f5e' },
    { id: 'p-dev', name: 'Jamie Fox', role: 'Dev · Nimbus', color: '#a855f7' },
    { id: 'p-maya', name: 'Drew Patel', role: 'Teaching · Academy', color: '#d97706' },
  ];

  const nimbus = { ventureLabel: 'Nimbus AI', ventureColor: '#8b5cf6' };
  const orbit = { ventureLabel: 'Orbit', ventureColor: '#06b6d4' };
  const academy = { ventureLabel: 'Academy', ventureColor: '#f97316' };

  const delegations: Delegation[] = [
    { id: 'd1', personId: 'p-rahul', title: 'Fix Play Store policy rejection — re-submit build', ...nimbus, status: 'blocked', dueAt: isoOffset(0), followUpAt: isoOffset(-1), recurrence: '' },
    { id: 'd2', personId: 'p-rahul', title: 'v1.2 — final QA pass before deploy', ...nimbus, status: 'in_progress', dueAt: isoOffset(-2), followUpAt: isoOffset(0), recurrence: '' },
    { id: 'd3', personId: 'p-rahul', title: 'Weekly dev sync report', ...nimbus, status: 'in_progress', recurrence: 'Weekly · Fri' },
    { id: 'd4', personId: 'p-rahul', title: 'Scope mascot animation pipeline — feasibility note', ...nimbus, status: 'pending', dueAt: isoOffset(3), recurrence: '' },
    { id: 'd5', personId: 'p-rahul', title: 'Review platform API integration spec', ...orbit, status: 'pending', dueAt: isoOffset(5), recurrence: '' },
    { id: 'd6', personId: 'p-priya', title: 'Partnership deck — status update', ...orbit, status: 'in_progress', dueAt: isoOffset(1), followUpAt: isoOffset(0), recurrence: '' },
    { id: 'd7', personId: 'p-priya', title: 'Q3 enterprise pipeline review', ...orbit, status: 'pending', dueAt: isoOffset(6), recurrence: '' },
    { id: 'd8', personId: 'p-priya', title: 'Follow up on partner lead', ...academy, status: 'blocked', dueAt: isoOffset(-3), recurrence: '' },
    { id: 'd9', personId: 'p-amit', title: 'Cohort 5 curriculum outline', ...academy, status: 'in_progress', dueAt: isoOffset(2), recurrence: '' },
    { id: 'd10', personId: 'p-amit', title: 'Grade assessment backlog', ...academy, status: 'pending', dueAt: isoOffset(4), recurrence: '' },
    { id: 'd11', personId: 'p-sneha', title: 'Launch campaign assets', ...nimbus, status: 'in_progress', dueAt: isoOffset(2), recurrence: '' },
    { id: 'd12', personId: 'p-karan', title: 'Ops handbook v1', ...orbit, status: 'pending', dueAt: isoOffset(7), recurrence: '' },
    { id: 'd13', personId: 'p-neha', title: 'Vendor invoices reconciliation', ...academy, status: 'in_progress', recurrence: 'Monthly · 1st' },
    { id: 'd14', personId: 'p-vikram', title: 'Product roadmap Q3 draft', ...orbit, status: 'pending', dueAt: isoOffset(8), recurrence: '' },
    { id: 'd15', personId: 'p-dev', title: 'Migrate auth service to new infra', ...nimbus, status: 'in_progress', dueAt: isoOffset(3), recurrence: '' },
    { id: 'd16', personId: 'p-maya', title: 'Prep live session — decorators', ...academy, status: 'pending', dueAt: isoOffset(1), recurrence: '' },
  ];

  return { people, delegations };
}

let mem: TeamData | null = null;
function data(): TeamData {
  if (!mem) mem = seed();
  return mem;
}

export const localTeamRepo: TeamRepo = {
  async load() {
    // Fresh copy each load so demo edits don't compound across mounts.
    mem = seed();
    return { people: [...mem.people], delegations: [...mem.delegations] };
  },
  async createPerson(input) {
    return { id: `p${Date.now()}`, name: input.name, role: input.role ?? '', color: input.color ?? '#7c3aed' };
  },
  async updatePerson(id, patch) {
    const p = data().people.find((x) => x.id === id);
    return { id, name: patch.name ?? p?.name ?? '', role: patch.role ?? p?.role ?? '', color: patch.color ?? p?.color ?? '#7c3aed' };
  },
  async deletePerson() {},
  async createDelegation(input) {
    return {
      id: `d${Date.now()}`,
      personId: input.personId,
      title: input.title,
      ventureLabel: input.ventureLabel ?? '',
      ventureColor: input.ventureColor ?? '#7c3aed',
      status: input.status ?? 'pending',
      dueAt: input.dueAt ?? undefined,
      followUpAt: input.followUpAt ?? undefined,
      recurrence: input.recurrence ?? '',
    };
  },
  async updateDelegation(id, patch) {
    const d = data().delegations.find((x) => x.id === id);
    return {
      id,
      personId: patch.personId ?? d?.personId ?? '',
      title: patch.title ?? d?.title ?? '',
      ventureLabel: patch.ventureLabel ?? d?.ventureLabel ?? '',
      ventureColor: patch.ventureColor ?? d?.ventureColor ?? '#7c3aed',
      status: patch.status ?? d?.status ?? 'pending',
      dueAt: patch.dueAt === null ? undefined : patch.dueAt ?? d?.dueAt,
      followUpAt: patch.followUpAt === null ? undefined : patch.followUpAt ?? d?.followUpAt,
      recurrence: patch.recurrence ?? d?.recurrence ?? '',
      completedAt: patch.status === 'done' ? new Date().toISOString() : d?.completedAt,
    };
  },
  async deleteDelegation() {},
};
