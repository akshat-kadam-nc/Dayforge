# Dayforge — API Reference

REST API under `/api`. JSON in, JSON out. Generated from the route definitions
in `server/src/routes/`. Field shapes are in [DATA_MODEL.md](DATA_MODEL.md).

## Conventions

- **Auth:** send `Authorization: Bearer <jwt>`. The token comes from
  register/login. All endpoints require it **except** `/api/health`,
  `/api/auth/register`, `/api/auth/login`, and `/api/google/callback`.
- **DB guard:** every authed route also requires the DB; if `MONGODB_URI` is
  unset the route returns **503** `{ "error": "Database not configured..." }`.
- **Scoping:** every read/write is filtered by the authenticated `userId`. You
  can only see and mutate your own documents.
- **IDs:** responses use Mongo `_id`. The client seam maps `_id → id`.
- **Errors:** `400` `{ error: "Validation failed", details }` (zod),
  `401` (auth), `404`, `503` (no DB), `500` `{ error }`.
- Bodies are validated with **zod**; unknown fields are ignored.

---

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/health` | no | `{ status: "ok", db: "connected" \| "disconnected" }` |

## Auth — `/api/auth`

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/register` | no | `{ email, password, name? }` → `{ token, user }` |
| POST | `/login` | no | `{ email, password }` → `{ token, user }` |
| GET | `/me` | yes | current `{ user }` |
| POST | `/change-password` | yes | `{ password }` (min 8) → `{ ok: true }` |

`user` is the public projection (no `passwordHash`): id, email, name, onboarded,
routine.

## Me — `/api/me`

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| PATCH | `/settings` | yes | routine `{ sleepMinutes, commuteMinutes, workMinutes, workdays[] }` (+ flips `onboarded`) → `{ onboarded, routine }` |

## Life areas — `/api/areas`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ areas }` (sorted by order, createdAt) |
| POST | `/` | `{ name, icon?, color?, order? }` → `{ area }` |
| PATCH | `/:id` | partial update → `{ area }` |
| DELETE | `/:id` | `204` |

## Function tracks — `/api/tracks`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ tracks }` |
| POST | `/` | `{ areaId, name, color? }` → `{ track }` |
| PATCH | `/:id` | `{ name?, color? }` → `{ track }` |
| DELETE | `/:id` | `204` |

## Goals — `/api/goals`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ goals }` (plain CRUD list) |
| GET | `/rollup` | `{ goals, rollup }` — resolves lifecycle lazily and returns a per-goal `{ estTotal, estDone, countTotal, countDone }` map the client derives progress from |
| POST | `/` | create; accepts `parentId`, `metric`, `targetCount`, `timed`, `dueAt` (leaf-only guards) → `{ goal }` |
| PATCH | `/:id` | update incl. status transitions (conclude/reopen stamp/clear `completedAt`/`resolvedAt`) → `{ goal }` |
| POST | `/:id/duplicate` | clone for the next period (progress reset, timed deadline shifted) → `{ goal }` |
| DELETE | `/:id` | `204`; deleting a parent detaches children (`parentId → null`) |

## Tasks — `/api/tasks`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ tasks }`. Filters: `?day=YYYY-MM-DD`, or `?from=&to=` (filters by **createdAt** for the history table). No filter → all of the user's tasks |
| POST | `/` | create. `{ title, areaId, kind?, trackId?, goalId?, estimateMinutes?, scheduledAt?, dueAt?, deadlineType?, day? }` (areaId required unless `kind:'chore_session'`) → `{ task }` |
| PATCH | `/:id` | partial. Setting `status:'done'` stamps `completedAt`; any other status clears it. `''` clears `trackId`/`goalId`; `dueAt` nullable → `{ task }` |
| POST | `/:id/defer` | bump to a later day / `deferredCount` → `{ task }` |
| DELETE | `/:id` | `204` |

## Interruptions — `/api/interruptions`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ interruptions }` (by `?day`) |
| POST | `/` | `{ type: fire\|rabbit_hole\|distraction, title, note?, minutes, day }` → `{ interruption }` |
| PATCH | `/:id` | update → `{ interruption }` |
| DELETE | `/:id` | `204` |

## Today — `/api/today`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | One payload for the cockpit (`?day=`). Returns `{ day, availableMinutes, streak, areas, tracks, goals, tasks, interruptions, logs }`. **tasks** = everything slated for the day **plus** unfinished other-day tasks **plus** anything completed within ±1 day of the date (so the Completed-today fold survives reload). No destructive rollover. |

## Budget — `/api/budget`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?scope=day\|week\|month&day=` → `{ scope, start, end, days, ...aggregate }` (logged/estimate sums per range and per area) |

## Reconciliations — `/api/reconciliations`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ reconciliations }` |
| GET | `/due` | `{ due }` — period closes (week/month/half-year) currently due |
| POST | `/` | save a reconciliation `{ scope, periodKey, ..., rating?, responses[] }` → `{ reconciliation }` |

## Google — `/api/google`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/status` | yes | connected accounts + whether OAuth is configured |
| GET | `/auth-url` | yes | `{ url }` — OAuth consent URL (signed `state`) |
| GET | `/callback` | no | OAuth redirect target; upserts the account, redirects to `/settings?google=connected` (renders a static error page on failure) |
| PATCH | `/accounts/:id` | yes | `{ color?, enabled? }` → `{ account }` |
| DELETE | `/accounts/:id` | yes | `204` |
| GET | `/events` | yes | `?from=&to=` → `{ events }` (recurring expanded, each with `seriesKey`) |
| POST | `/exclude` | yes | mute a series from the budget `{ seriesKey, label? }` → `{ ok }` |
| DELETE | `/exclude/:seriesKey` | yes | un-mute → `204` |

## Calendar — `/api/calendar`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?from=&to=` → `{ start, end, areas, days, tasks }` — per-day aggregates (allocation, completed count, events) + range tasks for the Day/Week/Month views |

## Team — `/api/team`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ people, delegations }` |
| POST | `/people` | `{ name, role?, color?, order? }` → `{ person }` |
| PATCH | `/people/:id` | update → `{ person }` |
| DELETE | `/people/:id` | `204` (cascades the person's delegations) |
| POST | `/delegations` | `{ personId, title, status?, dueAt?, followUpAt?, recurrence?, ventureLabel? }` → `{ delegation }` |
| PATCH | `/delegations/:id` | update (status → `done` stamps `completedAt`) → `{ delegation }` |
| DELETE | `/delegations/:id` | `204` |

## Reports — `/api/reports`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?from=&to=` (inclusive day range) → one aggregate `{ start, end, days, areas, perArea, totals, pace, deadlines, goals: { completed, missed, legacyCount }, team, series }`. Bucketed by `completedAt`. Resolves goal lifecycle first. |

## TimeLog — `/api/timelogs`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `{ logs }` |
| POST | `/` | create a log |

> **Legacy:** the budget now uses per-task `loggedMinutes`, so the `TimeLog`
> model and this route are unused by current features. Kept for compatibility.

---

## Timezone caveat

`completedAt` is a UTC instant; day-range filters (`today`, `reports`,
`calendar`, task-history) bucket it in the **server's** timezone (UTC on Vercel)
while day keys are the user's local day. Range-edge items can shift a day. Same
caveat applies to the streak. Revisit with a stored per-user timezone if it
matters.
