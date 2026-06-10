import { api } from '../api/client';

export interface Routine {
  sleepMinutes: number;
  commuteMinutes: number;
  workMinutes: number;
  /** Weekdays worked, 0=Sun … 6=Sat. */
  workdays: number[];
}

export function saveRoutine(routine: Routine): Promise<{ onboarded: boolean; routine: Routine }> {
  return api('/me/settings', { method: 'PATCH', body: JSON.stringify({ routine }) });
}

export function changePassword(newPassword: string): Promise<{ ok: boolean }> {
  return api('/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword }) });
}
