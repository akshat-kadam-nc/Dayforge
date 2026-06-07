import { env } from '../config/env.js';
import { GoogleAccountModel, type GoogleAccount } from '../models/GoogleAccount.js';
import type { HydratedDocument } from 'mongoose';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CALENDAR_EVENTS = (calId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;

// Read-only calendar + basic identity so we can label the connected account.
const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'];

/** Consent URL. `state` carries our signed app-user id through the redirect. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh-token issuance on reconnect
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

export async function fetchUserInfo(accessToken: string): Promise<{ sub: string; email: string; name?: string }> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return res.json() as Promise<{ sub: string; email: string; name?: string }>;
}

/** Return a valid access token for an account, refreshing + persisting if stale. */
export async function getValidAccessToken(account: HydratedDocument<GoogleAccount>): Promise<string> {
  const soon = Date.now() + 60_000;
  if (account.tokenExpiry && account.tokenExpiry.getTime() > soon) return account.accessToken;
  if (!account.refreshToken) return account.accessToken; // best effort; will 401 if expired
  const t = await refreshAccessToken(account.refreshToken);
  account.accessToken = t.access_token;
  account.tokenExpiry = new Date(Date.now() + t.expires_in * 1000);
  await account.save();
  return account.accessToken;
}

export interface GoogleEvent {
  id: string;
  /** Recurring series id when this is an instance, else the event id. */
  seriesKey: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  durationMinutes: number;
}

/** Fetch the account's primary-calendar events in [timeMin, timeMax) (RFC3339). */
export async function fetchEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true', // expand recurring series into instances
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(`${CALENDAR_EVENTS('primary')}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google events fetch failed: ${res.status}`);
  const data = (await res.json()) as { items?: GoogleCalItem[] };
  return (data.items ?? []).filter((e) => e.status !== 'cancelled').map(mapEvent);
}

interface GoogleCalItem {
  id: string;
  status?: string;
  summary?: string;
  recurringEventId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

function mapEvent(e: GoogleCalItem): GoogleEvent {
  const allDay = !e.start?.dateTime;
  const start = e.start?.dateTime ?? `${e.start?.date}T00:00:00`;
  const end = e.end?.dateTime ?? `${e.end?.date}T00:00:00`;
  const durationMinutes = allDay
    ? 0
    : Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return {
    id: e.id,
    seriesKey: e.recurringEventId ?? e.id,
    title: e.summary ?? '(no title)',
    start,
    end,
    allDay,
    durationMinutes,
  };
}

/** Upsert a connected account from a token exchange + userinfo. */
export async function upsertAccount(
  userId: unknown,
  info: { sub: string; email: string; name?: string },
  tokens: TokenResponse,
  fallbackColor: string,
): Promise<void> {
  const existing = await GoogleAccountModel.findOne({ userId, googleSub: info.sub });
  await GoogleAccountModel.findOneAndUpdate(
    { userId, googleSub: info.sub },
    {
      userId,
      googleSub: info.sub,
      email: info.email,
      name: info.name,
      accessToken: tokens.access_token,
      // Google omits refresh_token on re-consent sometimes; keep the old one.
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      ...(existing ? {} : { color: fallbackColor, enabled: true }),
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}
