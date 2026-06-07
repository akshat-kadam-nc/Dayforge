import { api } from '../api/client';

export interface GoogleAccount {
  id: string;
  email: string;
  name?: string;
  color: string;
  enabled: boolean;
}

export interface GoogleStatus {
  configured: boolean;
  accounts: GoogleAccount[];
}

export interface GoogleEvent {
  id: string;
  seriesKey: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  durationMinutes: number;
  accountId: string;
  color: string;
  deduct: boolean;
}

export function getGoogleStatus(): Promise<GoogleStatus> {
  return api<GoogleStatus>('/google/status');
}

export async function startGoogleConnect(): Promise<void> {
  const { url } = await api<{ url: string }>('/google/auth-url');
  window.location.href = url;
}

export function patchGoogleAccount(id: string, patch: Partial<Pick<GoogleAccount, 'enabled' | 'color'>>) {
  return api<{ account: GoogleAccount }>(`/google/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function disconnectGoogleAccount(id: string): Promise<void> {
  return api(`/google/accounts/${id}`, { method: 'DELETE' });
}

export async function getGoogleEvents(start: string, end?: string): Promise<GoogleEvent[]> {
  const q = `start=${encodeURIComponent(start)}${end ? `&end=${encodeURIComponent(end)}` : ''}`;
  const r = await api<{ events: GoogleEvent[] }>(`/google/events?${q}`);
  return r.events;
}

export function muteSeries(seriesKey: string, label?: string): Promise<void> {
  return api('/google/exclude', { method: 'POST', body: JSON.stringify({ seriesKey, label }) });
}

export function unmuteSeries(seriesKey: string): Promise<void> {
  return api(`/google/exclude/${encodeURIComponent(seriesKey)}`, { method: 'DELETE' });
}
