# Axiom — Resume Here

Personal time-management web app built with Claude Code for Akshu. MERN + TypeScript, PWA-first. This file is the catch-up entry point for a fresh session.

## How to resume
1. Open this repo in Claude Code.
2. Read this file, then `project-context/` for durable context: `user_akshu.md` (who he is), `feedback_communication_style.md` (**how to write: direct, no em dashes, no filler, no AI-sounding phrasing**), `project_task_manager.md` (full locked feature set + UX), `MEMORY.md`.
3. **Current work is on the `feature/calendar-view` branch, NOT yet merged to `main`.** Check it out first: `git fetch origin && git checkout feature/calendar-view && git pull`. The Calendar view (below) lives only on this branch. `main` is the cross-machine sync point for finished work; merge this branch into `main` once the Calendar is signed off.
4. Recreate `server/.env` on this machine (gitignored — keys below). Then `npm install && npm run build` to confirm green before changing anything.

## Run it
```
npm install
npm run dev          # API on :4000, client on :5173 (Vite proxies /api → :4000)
```
`server/.env` is **gitignored — recreate per machine**. Required keys (see `.env.example`):
- `MONGODB_URI` — Atlas cluster AXIOM-Core, db `axiom` (ask Akshu).
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/callback` — Google Cloud project `axiom-498710`. Without these, Calendar features stay inert (no crash).

The API boots without a DB; DB-backed routes return 503 until `MONGODB_URI` is set.

## How to verify changes
- **Demo mode** (no backend): login screen → "Explore in demo mode". Uses `localRepo` with a rich in-memory seed (today tasks + a Pending + a Scheduled + 2 calendar events). Best for fast UI checks; reloading drops the demo session.
- **Real account**: register/login; data persists to Atlas. Needed to test Google sync, onboarding, reconciliation against the live API.
- Build gate: `npm run build` (server `tsc` + client `tsc --noEmit && vite build`). Keep it green before committing.
- The Claude Preview tool drives `:5173`. Note: synthetic outside-clicks must dispatch `mousedown` (PortalMenu closes on mousedown), and never manually `.remove()` portal nodes (corrupts React → false console errors).

## Architecture map

**Server (`server/src/`)** — Express + TS (NodeNext ESM), Mongoose, JWT. Every doc scoped to `userId`.
- Models: `User` (+ `routine{sleep/commute/work Minutes, workdays[]}` + `onboarded`), `LifeArea`, `FunctionTrack`, `Goal`, `Task`, `Interruption`, `TimeLog` (now unused by budget — kept), `Reconciliation`, `GoogleAccount` (OAuth tokens, **plaintext — encrypt before multi-user**), `BudgetExclusion` (muted calendar series).
- `Task` fields: areaId, trackId?, goalId?, title, status (not_started|in_progress|done|deferred|blocked), source, estimateMinutes, **loggedMinutes**, scheduledAt?, **dueAt? + deadlineType(soft|hard)**, delegateName?, deferredCount, **completedAt?**, **day** (YYYY-MM-DD, the day it shows in Today), timestamps (createdAt).
- Routes (`/api`): auth, me (`/settings` saves routine + flips onboarded), areas, tracks, goals, tasks (CRUD + `/:id/defer`; PATCH stamps completedAt on done), interruptions, timelogs, **today** (returns the day + availableMinutes + today's tasks **plus all unfinished other-day tasks** — no destructive rollover), **budget** (`?scope=day|week|month`), **reconciliations** (`/`, `/due`, POST), **google** (`/status`, `/auth-url`, `/callback` signed-state, accounts CRUD, `/events`, `/exclude`).
- Services: `budget.ts#computeBudget` (sums task.loggedMinutes/estimate per range), `availability.ts` (availableForDay/Range from routine — work only deducts on workdays; 24h before onboarding), `google.ts` (plain-fetch OAuth + calendar fetch, recurring expanded, seriesKey).
- `util/day.ts`: local day keys, `addDays`, `scopeRange`, `weekOfYear`, `daysBetween`, `completedPeriod`.

**Client (`client/src/`)** — React PWA. The cockpit is driven by `today/useToday.tsx` (reducer + context) over a **repo seam** `today/repo.ts`: `localRepo` (demo seed) vs `apiRepo` (persisted) chosen by `auth.isGuest`. Components in `components/today/*`.
- State (`today/types.ts` `TodayState`): areas, tracks, tasks (**all buckets: today + pending + upcoming**), goals, interruptions, fixedBlocks, **timer.runs** (Record<taskId,{startedAt,elapsedSeconds}> — concurrent), **day**, budgetScope, scopeSummary, dueReconciliations, calendarEvents, availableMinutes.
- `today/budget.ts` derivations: `todaysTasks` (day===state.day), `completedTodayTasks` (by completedAt date), `taskLoggedSeconds`, `effectiveAvailable` (minus deducting calendar events), ring/bar segments, `timeGainedMinutes`.
- Key components: `TimerStrip` (one strip per running task, each 1s/sec, ⚡/⏸/⏹), `TaskRow` (logged HH:MM:SS / estimate, due badge, kebab via `PortalMenu`), `TaskBuckets` (Pending/Scheduled), `CompletedFold` (table: Logged/Δ/Created/Completed), `TimeBudgetCard` (day + week/month scopes, gained line), `AllocationRing`, `CalendarEventsBlock` (mute toggle), `ReconciliationModal`, `RoutineModal` (onboarding + Settings), `WallpaperPicker`, `GoogleAccountsSection`, `Fab` (create: area/track/estimate/**start day**/**deadline + soft-hard**).
- Wallpaper: `wallpaper/WallpaperContext.tsx` (localStorage). Profile: `profile/api.ts`. Google: `google/api.ts`.

## Built so far (all on `main`, pushed)
Scaffold → Phase 1/2 (cockpit + Atlas persistence) → function-track UI → wallpaper picker + real week/month budget scopes → auto-prompted weekly/monthly/half-year **reconciliation** → **Google Calendar** read-only sync (connected, events become budget-deducting fixed blocks, per-series mute) → **routine-based onboarding** (24h start, sleep/commute/work setup) → **timer/logging rework** (per-task loggedMinutes, concurrent multi-strip timers each 1s/sec, Pause / Stop & Complete, complete-with-log options, time gained/lost) → **task scheduling** (Pending/Scheduled buckets, due dates + soft/hard deadlines, future start days, day-crossover auto-reload, Move-to-today) → Completed-today keyed off completedAt.

Then **Calendar view** (`feature/calendar-view` branch): Day/Week/Month toggle replacing the placeholder. Month is a GCal-style grid (event chips + per-area allocation bar + overflow corner flag + delegation follow-up 👥 dot + completed count); Week is a 7-column day breakdown; Day is a read-only detail hosting **completed-task history** (logged vs estimate), events, and planned tasks. View-aware prev/next nav, Today button, full-width layout. Server: `GET /api/calendar?from=&to=` per-day aggregates (reuses `availableForDay`) + range tasks. Client: `calendar/` module (api/grid/repo seam with demo synthesis), `components/calendar/*`, `styles/calendar.css`. Real-account path needs server/.env to verify against live data.

Latest commits (on `feature/calendar-view`): `4d35fa9` (bigger Month + Week view), `735eea9` (calendar month+day). Base off `main`: `d85130c` (completed-today fix), `8da748d` (buckets/due/crossover).

## Calendar — where things live (for the next two tasks)
- Page + state: `client/src/pages/CalendarPage.tsx` holds `view` (`day|week|month`), `anchor` (the in-view date), `selectedDay`. It fetches one payload per visible window via `monthGridRange(anchor)` (a 42-day Mon-start window) so Month/Week/Day all read the same data. `step(dir)` already does view-aware prev/next (month/week/day); `goToday()` snaps back.
- Date helpers: `client/src/calendar/grid.ts` (`monthMatrix`, `monthGridRange`, `weekDays`, `weekRangeLabel`, `shiftMonth`, `addDaysKey`, `allocationSegments`).
- Views: `client/src/components/calendar/{MonthGrid,WeekView,DayDetail,ViewToggle,CalendarLegend}.tsx`.
- Data seam: `client/src/calendar/repo.ts` (`apiCalendarRepo` real vs `localCalendarRepo` demo synthesis) + `api.ts` (`getCalendar`). Server: `server/src/routes/calendar.ts` (`GET /api/calendar?from=&to=`).

## Next session tasks (planned by Akshu)
1. **Calendar period navigation** — extend so the Week/Month scale itself moves forward/back like Google Calendar. The view-aware `step(dir)` + arrows already exist; verify/round out the UX (keyboard arrows, swipe optional, ensure the fetch window follows the anchor smoothly across month boundaries, and that Week nav past a month edge still loads events/aggregates — `monthGridRange` re-derives from the new anchor so refetch happens, but confirm). Make it feel like GCal: smooth, obvious, no dead ends.
2. **Today page design improvements** — Akshu will provide the specific details at session start. The cockpit is `client/src/pages/TodayPage.tsx` + `client/src/components/today/*`, styled in `client/src/styles/today.css`; reference mockup `mockups/today-v5.html`. Do not start until he gives the details.

## Calendar — known limitations to be aware of
- **Not yet verified against a real account** — only demo mode (DOM-verified; the preview screenshot tool was timing out on this machine, so checks were via `preview_eval` DOM probes). With `server/.env` set, confirm `/api/calendar` aggregates, per-day availability (routine/workday logic), completed history, and GCal events on a real login.
- **Google account legend** (`CalendarLegend`) is **visual only** — the per-source on/off toggle isn't wired yet.
- Demo `localCalendarRepo` synthesises a plausible month from the seed (FNV-1a hash for organic per-day variation); it is illustrative, not real data.

## Other next (not started)
- **Streak logic** — currently hardcoded `streakDays={12}` in `TodayPage`; derive from activity/reconciliation history.
- **Recurring tasks** and **manual fixed blocks** (sleep/standing meetings beyond GCal) — still unbuilt.
- **Goals** and **Team/Delegation** pages are placeholders (locked feature set has full specs in project-context).

## Known issues / cleanup
- Google OAuth tokens stored plaintext in Mongo — encrypt before any multi-user rollout.
- Rotate Atlas DB password (shared in plaintext during setup).
- Throwaway test accounts in DB: `akshu@axiom.local`, `akshu+phase2@axiom.app`, `gcal-test@axiom.app`, `onboard-test-*@axiom.app`, `ui-onboard-*@axiom.app` — safe to delete. Real account in use: `akshat@nextplatforms.in`.
- PWA manifest references `pwa-192.png` / `pwa-512.png` that don't exist yet.
- `TimeLog` model + `/timelogs` route + `repo.createTimeLog` are now unused (budget uses per-task `loggedMinutes`) — could be removed.

## Mockups (`mockups/`, served via `.claude/launch.json` on :4321)
`today-v5.html` (cockpit), `month.html` (Calendar/Month — useful for the upcoming Calendar build), `team.html` (Team & Delegation), `today-v4.html` (wallpaper picker).

## Core problem
Akshu loses accurate sense of where time goes — illusion of free time, work overflows. The app's #1 job: an accurate real-time view of daily time allocation and remaining free time. Filter every feature through: does this help him see where time goes and prevent overflow?

## Locked feature set + stack
Full detail in `project-context/project_task_manager.md`. Summary: daily time budget, per-task estimates + live timer, overflow detection, planned-vs-actual; goal hierarchy (Annual>Half>Monthly>Weekly) with auto reviews; GCal read-only multi-account; JWT, userId-scoped. **3 differentiators:** (1) one-tap interruption logging (🔥 Fire / 🌀 Rabbit Hole / 😵 Distraction), (2) Function Tracks within ventures, (3) Delegation tracker (~10 reports). Nav: Today | Calendar | Goals | Team | Settings. Aesthetic: light/playful, Nunito, frosted glass over swappable wallpapers. Stack: MERN + TS, PWA first (React Native later).
