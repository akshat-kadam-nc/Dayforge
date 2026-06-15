# Dayforge — Data Model

Mongoose models in `server/src/models/`. MongoDB Atlas, db `axiom`. All
timestamps (`createdAt` / `updatedAt`) are added by `{ timestamps: true }` unless
noted.

## The scoping invariant

**Every collection except `User` carries `userId` (indexed) and every query
filters by the authenticated user's id.** This is the core multi-tenant
guarantee — there is no shared/global data. New collections must follow it.

---

## User

The account + the routine that drives available-time math.

| Field | Type | Notes |
| --- | --- | --- |
| email | String | required, unique, lowercased |
| name | String | required |
| passwordHash | String | required (bcrypt); never returned to the client |
| onboarded | Boolean | default false; true once the routine is set |
| routine | sub-doc | `{ sleepMinutes, commuteMinutes, workMinutes (0–1440 each), workdays: number[] (0=Sun..6=Sat) }` |
| dailyAvailableMinutes | Number | default 360; legacy fallback |

## LifeArea

A venture / area of life. Tasks, tracks and goals hang off it.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| name | String | required |
| icon | String | emoji, default 📦 |
| color | String | hex, default `#8b5cf6` |
| order | Number | sort order |

## FunctionTrack

A function-based sub-grouping of work within an area.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| areaId | ObjectId→LifeArea | required, indexed |
| name | String | required |
| color | String | default `#64748b` |

## Goal

A goal in the Annual → Half-year → Monthly → Weekly hierarchy. Progress is
derived client-side from linked tasks; `pct` is the manual fallback.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| areaId | ObjectId→LifeArea | required, indexed |
| text | String | required |
| icon | String | default 🎯 |
| pct | Number | 0–100; manual fallback when nothing is linked |
| color | String | default `#8b5cf6` |
| period | enum | `weekly \| monthly \| half_year \| annual` |
| parentId | ObjectId→Goal | single-step nesting; `null` for roots; indexed |
| completedAt | Date | stamped when it first hits 100% / is concluded |
| metric | enum | `standard \| count` |
| targetCount | Number | for `count` goals (≥1) |
| timed | Boolean | hard-deadline goal |
| dueAt | Date | deadline for `timed` goals |
| status | enum | `active \| completed \| missed` (indexed); resolved lazily on read |
| resolvedAt | Date | when it became terminal |

## Task

The central record: tasks, chores, and the daily chore session.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| areaId | ObjectId→LifeArea | indexed; optional only for `chore_session` |
| kind | enum | `task \| chore \| chore_session` (indexed) |
| trackId | ObjectId→FunctionTrack | optional |
| goalId | ObjectId→Goal | optional; links a task to a goal |
| title | String | required |
| status | enum | `not_started \| in_progress \| done \| deferred \| blocked` |
| source | enum | `manual \| calendar \| recurring` |
| estimateMinutes | Number | planned minutes |
| loggedMinutes | Number | actual time worked |
| scheduledAt | String | `"HH:MM"` start on the Day-plan timeline (empty = unscheduled) |
| dueAt | Date | deadline |
| deadlineType | enum | `soft \| hard` |
| delegateName | String | optional |
| deferredCount | Number | times deferred |
| completedAt | Date | stamped on done, cleared otherwise |
| day | String | `YYYY-MM-DD` the task shows in Today (required, indexed) |

**Kinds:** `task` = normal estimated work. `chore` = small (5/10/15-min)
end-of-day item. `chore_session` = the single timed block per day chores are
worked within; its `loggedMinutes` is the day's Chores budget block.

## Interruption

One-tap log of something that derailed the day.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| type | enum | `fire \| rabbit_hole \| distraction` |
| title | String | required |
| note | String | default `''` |
| minutes | Number | required |
| day | String | `YYYY-MM-DD`, indexed |

## Reconciliation

A saved period review (weekly / monthly / half-year close).

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| scope | enum | `week \| month \| half_year` |
| periodKey | String | stable id for the period |
| periodStart / periodEnd | String | day keys |
| label | String | e.g. "Week 24" |
| rating | Number | 1–5 |
| responses | sub-doc[] | `{ key, question, answer }` |
| stats | sub-doc | snapshot incl. `perArea: { areaId, minutes }[]` |

Unique index on `{ userId, scope, periodKey }` — one reconciliation per period.

## GoogleAccount

A connected Google Calendar source (OAuth).

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| googleSub | String | Google subject id |
| email | String | required |
| name | String | |
| accessToken | String | required — **plaintext (encrypt before multi-user)** |
| refreshToken | String | |
| tokenExpiry | Date | |
| color | String | source color, default `#4285F4` |
| enabled | Boolean | default true |

Unique index on `{ userId, googleSub }` — one row per account per user.

## BudgetExclusion

A muted recurring calendar series (won't deduct from the budget).

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| seriesKey | String | the series to mute |
| label | String | optional |

Unique index on `{ userId, seriesKey }`.

## Person

A delegate / report on the Team page.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| name | String | required |
| role | String | default `''` |
| color | String | default `#7c3aed` |
| order | Number | sort order |

## Delegation

A unit of work assigned to a Person.

| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId→User | required, indexed |
| personId | ObjectId→Person | required, indexed |
| title | String | required |
| ventureLabel / ventureColor | String | optional context tag |
| status | enum | `pending \| in_progress \| done \| blocked` (indexed) |
| dueAt | Date | |
| followUpAt | Date | drives the "follow-ups due" strip |
| recurrence | String | optional label |
| completedAt | Date | stamped on `done` |

Deleting a Person cascades its delegations.

## TimeLog (legacy)

| Field | Type | Notes |
| --- | --- | --- |
| userId / taskId / areaId | ObjectId | refs |
| minutes | Number | |
| day | String | |

Superseded by per-task `loggedMinutes`. Kept but unused by current features.

---

## Relationship summary

```
User ──< LifeArea ──< FunctionTrack
              │            ▲
              ├──< Goal ───┘ (Goal.parentId → Goal, single-step)
              └──< Task ──> Goal? ──> FunctionTrack?
User ──< Interruption
User ──< Reconciliation
User ──< GoogleAccount,  User ──< BudgetExclusion
User ──< Person ──< Delegation
```
