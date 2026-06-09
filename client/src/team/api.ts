import { api } from '../api/client';
import type { Delegation, DelegationStatus, Person, TeamData } from './types';

interface ServerPerson {
  _id: string;
  name: string;
  role?: string;
  color?: string;
}
interface ServerDelegation {
  _id: string;
  personId: string;
  title: string;
  ventureLabel?: string;
  ventureColor?: string;
  status: DelegationStatus;
  dueAt?: string;
  followUpAt?: string;
  recurrence?: string;
  completedAt?: string;
}

function mapPerson(d: ServerPerson): Person {
  return { id: d._id, name: d.name, role: d.role ?? '', color: d.color ?? '#7c3aed' };
}
function mapDelegation(d: ServerDelegation): Delegation {
  return {
    id: d._id,
    personId: String(d.personId),
    title: d.title,
    ventureLabel: d.ventureLabel ?? '',
    ventureColor: d.ventureColor ?? '#7c3aed',
    status: d.status,
    dueAt: d.dueAt,
    followUpAt: d.followUpAt,
    recurrence: d.recurrence ?? '',
    completedAt: d.completedAt,
  };
}

export interface PersonInput {
  name: string;
  role?: string;
  color?: string;
}
export interface DelegationInput {
  personId: string;
  title: string;
  ventureLabel?: string;
  ventureColor?: string;
  status?: DelegationStatus;
  dueAt?: string | null;
  followUpAt?: string | null;
  recurrence?: string;
}

export async function fetchTeam(): Promise<TeamData> {
  const r = await api<{ people: ServerPerson[]; delegations: ServerDelegation[] }>('/team');
  return { people: r.people.map(mapPerson), delegations: r.delegations.map(mapDelegation) };
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const r = await api<{ person: ServerPerson }>('/team/people', { method: 'POST', body: JSON.stringify(input) });
  return mapPerson(r.person);
}
export async function updatePerson(id: string, patch: Partial<PersonInput>): Promise<Person> {
  const r = await api<{ person: ServerPerson }>(`/team/people/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return mapPerson(r.person);
}
export async function deletePerson(id: string): Promise<void> {
  await api(`/team/people/${id}`, { method: 'DELETE' });
}

export async function createDelegation(input: DelegationInput): Promise<Delegation> {
  const r = await api<{ delegation: ServerDelegation }>('/team/delegations', { method: 'POST', body: JSON.stringify(input) });
  return mapDelegation(r.delegation);
}
export async function updateDelegation(id: string, patch: Partial<DelegationInput>): Promise<Delegation> {
  const r = await api<{ delegation: ServerDelegation }>(`/team/delegations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return mapDelegation(r.delegation);
}
export async function deleteDelegation(id: string): Promise<void> {
  await api(`/team/delegations/${id}`, { method: 'DELETE' });
}
