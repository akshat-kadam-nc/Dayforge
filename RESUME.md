# Dayforge — Resume Here

Personal time-management web app built with Claude Code for Akshu. MERN + TypeScript, PWA-first. This file is the catch-up entry point for a fresh session. (Rebranded AXIOM → Dayforge for user-facing strings; internal `axiom` identifiers, localStorage keys, and the Atlas db name are intentionally unchanged.)

## DEPLOYED — LIVE
- **Prod:** https://dayforge.akshatkadam.com (Render Web Service `dayforge`, also at https://dayforge-hk2e.onrender.com). Single-origin: Express serves `client/dist` + SPA fallback when `SERVE_CLIENT` is on. Free plan → sleeps after ~15 min idle, cold-starts on next request.
- **Render is Blueprint-connected but FROZEN** on the build command from the first blueprint commit (`npm install && npm run build`); `render.yaml` edits do NOT auto-sync. Build works anyway via a repo-root `.npmrc` (`include=dev`) that forces devDeps to install under `NODE_ENV=production` (else `npm install` prunes tsc + @types/node → TS2688). To change the build command you must manually re-sync the Blueprint.
- **Atlas:** db `axiom` on cluster `axiom-core.n8aodkh`. Render `MONGODB_URI` must include `/axiom` (no db name → driver lands in `test`, real accounts vanish). Network Access needs `0.0.0.0/0`.
- **Verified live:** `/api/health` → `{"status":"ok","db":"connected"}`, SPA at `/`, real-account login (`akshat@nextplatforms.in`).
- **CHORE DEBT (do later):** rotate the Atlas db-user password — shared in plaintext during setup and in chat. Change in Atlas → Database Access, then update `MONGODB_URI` in BOTH Render env and local `server/.env` (keep `@axiom-core.n8aodkh.mongodb.net/axiom?...` identical). Also delete throwaway `deploy-probe@axiom.app` (lives in the `test` db from a mis-set URI during deploy).
- **STILL TODO for Google on prod:** add `https://dayforge.akshatkadam.com/api/google/callback` as an authorized redirect URI + the origin as a JS origin in Google Cloud (project `axiom-498710`), or Calendar connect fails in prod. `CLIENT_ORIGIN`/`GOOGLE_REDIRECT_URI` are in `render.yaml` but, given the frozen blueprint, confirm they're set in the Render dashboard.

## How to resume
1. Open this repo in Claude Code.
2. Read this file, then `project-context/` for durable context: `user_akshu.md` (who he is), `feedback_communication_style.md` (**how to write: direct, no em dashes, no filler, no AI-sounding phrasing**), `project_task_manager.md` (full locked feature set + UX), `MEMORY.md`.
3. **Everything is merged and pushed to `main`.** `git fetch origin && git checkout main && git pull`. The Calendar view and the Today Chores feature are both done and on `main`. `main` is the cross-machine sync point; work directly on it (or branch and merge back when a feature is signed off — the Calendar branch `feature/calendar-view` is stale, already merged, safe to ignore/delete).
4. Recreate `server/.env` on this machine (gitignored — keys below). Then `npm install && npm run build` to confirm green before changing anything. **Atlas IP allowlist:** the DB rejects connections from non-allowlisted IPs (server crashes on boot with `MongooseServerSelectionError`). Add this machine's public IP in Atlas → Network Access before expecting real-account/DB features to work.

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
- **Demo mode** (no backend): login screen → "Explore in demo mode". Uses `localRepo` with a rich in-memory seed (today tasks + Pending + Scheduled + 2 calendar events + a chore session, 3 chores incl. one carried over from yesterday). Best for fast UI checks; reloading drops the demo session. Note: clear `localStorage` first if a real-account token is lingering, or it loads `apiRepo` instead of demo.
- **Real account**: register/login; data persists to Atlas. Needed to test Google sync, onboarding, reconciliation against the live API.
- Build gate: `npm run build` (server `tsc` + client `tsc --noEmit && vite build`). Keep it green before committing.
- The Claude Preview tool drives `:5173`. Note: synthetic outside-clicks must dispatch `mousedown` (PortalMenu closes on mousedown), and never manually `.remove()` portal nodes (corrupts React → false console errors).

## Architecture map

**Server (`server/src/`)** — Express + TS (NodeNext ESM), Mongoose, JWT. Every doc scoped to `userId`.
- Models: `User` (+ `routine{sleep/commute/work Minutes, workdays[]}` + `onboarded`), `LifeArea`, `FunctionTrack`, `Goal`, `Task`, `Interruption`, `TimeLog` (now unused by budget — kept), `Reconciliation`, `GoogleAccount` (OAuth tokens, **plaintext — encrypt before multi-user**), `BudgetExclusion` (muted calendar series).
- `Task` fields: areaId (optional only for chore_session), **kind (task|chore|chore_session)**, trackId?, goalId?, title, status (not_started|in_progress|done|deferred|blocked), source, estimateMinutes, **loggedMinutes**, scheduledAt?, **dueAt? + deadlineType(soft|hard)**, delegateName?, deferredCount, **completedAt?**, **day** (YYYY-MM-DD, the day it shows in Today), timestamps (createdAt).
- `Goal` fields: areaId, text, icon, pct (0-100), color, **period (weekly|monthly|half_year|annual)**. Full CRUD route `/api/goals` already exists; `Task.goalId` links a task to a goal.
- Routes (`/api`): auth, me (`/settings` saves routine + flips onboarded), areas, tracks, goals, tasks (CRUD + `/:id/defer`; PATCH stamps completedAt on done), interruptions, timelogs, **today** (returns the day + availableMinutes + today's tasks **plus all unfinished other-day tasks** — no destructive rollover), **budget** (`?scope=day|week|month`), **reconciliations** (`/`, `/due`, POST), **google** (`/status`, `/auth-url`, `/callback` signed-state, accounts CRUD, `/events`, `/exclude`).
- Services: `budget.ts#computeBudget` (sums task.loggedMinutes/estimate per range), `availability.ts` (availableForDay/Range from routine — work only deducts on workdays; 24h before onboarding), `google.ts` (plain-fetch OAuth + calendar fetch, recurring expanded, seriesKey).
- `util/day.ts`: local day keys, `addDays`, `scopeRange`, `weekOfYear`, `daysBetween`, `completedPeriod`.

**Client (`client/src/`)** — React PWA. The cockpit is driven by `today/useToday.tsx` (reducer + context) over a **repo seam** `today/repo.ts`: `localRepo` (demo seed) vs `apiRepo` (persisted) chosen by `auth.isGuest`. Components in `components/today/*`.
- State (`today/types.ts` `TodayState`): areas, tracks, tasks (**all buckets: today + pending + upcoming**), goals, interruptions, fixedBlocks, **timer.runs** (Record<taskId,{startedAt,elapsedSeconds}> — concurrent), **day**, budgetScope, scopeSummary, dueReconciliations, calendarEvents, availableMinutes.
- `today/budget.ts` derivations: `todaysTasks` (day===state.day), **`budgetTasks`** (today's `kind==='task'` only — feeds all area/allocation sums), `completedTodayTasks` (by completedAt date, tasks only), `taskLoggedSeconds`, `effectiveAvailable` (minus deducting calendar events), ring/bar segments (incl. a single **Chores** segment from the session), `timeGainedMinutes`. **Chores helpers:** `activeChores` (today's + carried-over open chores), `isCarriedChore`, `choreSession`, `choresPlannedMinutes`/`choresLoggedMinutes`, `CHORES_COLOR`.
- Key components: `TimerStrip` (one strip per running task, each 1s/sec, ⚡/⏸/⏹), `TaskRow` (logged HH:MM:SS / estimate, due badge, kebab via `PortalMenu`), `TaskBuckets` (Pending/Scheduled — chores excluded), `CompletedFold` (table: Logged/Δ/Created/Completed), `TimeBudgetCard` (day + week/month scopes, gained line), `AllocationRing`, **`ChoresCard`** (right-rail: session timer + checklist + quick-add + carry-over), `CalendarEventsBlock` (mute toggle), `InterruptionsBlock`, `GoalsSidebar` (this week's goals + today-by-area), `ReconciliationModal`, `RoutineModal` (onboarding + Settings), `WallpaperPicker`, `GoogleAccountsSection`, `Fab` (create: area/track/estimate/**start day**/**deadline + soft-hard**).
- **Today layout (`TodayPage.tsx`):** main column (nudges, budget, ring, today's tasks by venture, pending/scheduled, completed) + a **collapsible right rail** (`.cockpit-rail`: ChoresCard, GoalsSidebar, CalendarEventsBlock, InterruptionsBlock). Rail collapse persists in `localStorage` key `axiom.today.railCollapsed`. Body max-width 1640, rail 344 (tuned for 1920×1080 no-zoom).
- Wallpaper: `wallpaper/WallpaperContext.tsx` (localStorage). Profile: `profile/api.ts`. Google: `google/api.ts`.

## Built so far (all on `main`, pushed)
Scaffold → Phase 1/2 (cockpit + Atlas persistence) → function-track UI → wallpaper picker + real week/month budget scopes → auto-prompted weekly/monthly/half-year **reconciliation** → **Google Calendar** read-only sync (connected, events become budget-deducting fixed blocks, per-series mute) → **routine-based onboarding** (24h start, sleep/commute/work setup) → **timer/logging rework** (per-task loggedMinutes, concurrent multi-strip timers each 1s/sec, Pause / Stop & Complete, complete-with-log options, time gained/lost) → **task scheduling** (Pending/Scheduled buckets, due dates + soft/hard deadlines, future start days, day-crossover auto-reload, Move-to-today) → Completed-today keyed off completedAt.

Then **Calendar view** (merged to `main`): Day/Week/Month toggle. Month is a GCal-style grid (event chips + per-area allocation bar + overflow corner flag + delegation follow-up 👥 dot + completed count); Week is a 7-column day breakdown; Day is a read-only detail hosting **completed-task history** (logged vs estimate), events, and planned tasks. Server `GET /api/calendar?from=&to=` per-day aggregates + range tasks. **Verified against the real account** (live aggregates, availability, completed history, Google events). **Period nav** rounded out: bold header arrows + keyboard ←/→ and `t`, a reference line ("This month / 2 months ahead · Week N · year · Today …"), Today button disables on the current period. **Month declutter:** day cells tinted by dominant life-area, frequently-recurring events (seriesKey on ≥5 days) collapse to colored dots, faint weekend shading.

Then **Chores feature + Today layout** (merged to `main`): new task `kind` (task|chore|chore_session). Chores are small 5/10/15-min end-of-day items, area-tagged, due EOD; they batch into ONE timed `chore_session` block (reuses the per-task timer) ticked off a checklist in the right-rail `ChoresCard`. Chores roll up into a single teal **Chores** budget segment (not per-area slivers) and are excluded from venture blocks / buckets / completed fold. **Carry-forward:** undone chores from earlier days surface in today's card with a ↩ badge + "N carried" count. Today layout reworked into a **collapsible right rail** (Chores, Goals, Calendar events, Interruptions) and widened for 1080p.

Latest commits (on `main`): `0e7c051` (chore carry-forward), `5992438` (chores + rail + wider layout), `672ffce` (gitignore .vite), `d891a4a` (calendar nav + month declutter), `90e117c` (merge calendar-view).

## Goals section (built, on `main` — commit `4af1ad1`)
The Goals page is built and verified in demo + against the real account.
- **Model:** `Goal` gained nullable `parentId` (ref Goal). Single-step nesting enforced server-side (a parent must be exactly one period-rung up: weekly→monthly→half_year→annual); deleting a parent detaches its children (`parentId` → null).
- **Progress (locked rule):** weekly goal pct = **Σ estimate of *done* linked tasks / Σ estimate of *all* linked tasks** (estimate-weighted; binary per-task completion, so logging over estimate can't inflate it). Parents = average of children's derived pct. Manual `pct` is the fallback only when nothing is linked. Derivation lives client-side in `client/src/goals/tree.ts` (`buildForest`).
- **Server:** `GET /api/goals/rollup` returns goals + a per-goal `{estTotal,estDone,countTotal,countDone}` map (sums `kind:'task'` linked tasks). Plain `/api/goals` CRUD now accepts `parentId`.
- **Client:** new `client/src/goals/` seam (`tree.ts`, `api.ts`, `repo.ts` — local vs api by `isGuest`, mirrors Calendar). `pages/GoalsPage.tsx` = per-life-area frosted cards, each an expandable Annual→Weekly tree (`components/goals/GoalTree.tsx`), with create/edit/delete + add-child via `components/goals/GoalModal.tsx` (scoped parent picker). Styles in `client/src/styles/goals.css` (redeclares cockpit tokens since the page sits outside `.cockpit`).
- **Task linking:** `Fab` now has a weekly-goal picker (scoped to the chosen area) writing `Task.goalId`. Today `GoalsSidebar` is scoped to `period:'weekly'` goals only. Client `Goal` type carries `period` + `parentId`; demo seed has a full hierarchy + completed linked tasks so derived progress shows.
- **Still open:** `AddGoalModal` (`components/today/AddGoalModal.tsx`, used by the sidebar ＋) still creates flat weekly goals — fine, but the page's `GoalModal` is the fuller one. The real account's 3 existing goals are all stored as `weekly` with no parent (e.g. "Grow to 10 Franchises in 2026" should be annual) — they render fine and can be re-leveled via the edit modal. Today/Week surfacing of weekly-goal progress is still just the sidebar; could derive live progress there later. No `goals.html` mockup existed; designed fresh.

## Calendar — where things live
- Page + state: `client/src/pages/CalendarPage.tsx` holds `view` (`day|week|month`), `anchor`, `selectedDay`. Fetches one payload per visible window via `monthGridRange(anchor)` (42-day Mon-start). `step(dir)` = view-aware prev/next; keyboard ←/→/`t`; `goToday()` snaps back.
- Date helpers: `client/src/calendar/grid.ts` (`monthMatrix`, `monthGridRange`, `weekDays`, `weekRangeLabel`, `shiftMonth`, `addDaysKey`, `allocationSegments`, `isoWeek`, `monthDiff`, `weekDiff`, `relPhrase`).
- Views: `client/src/components/calendar/{MonthGrid,WeekView,DayDetail,ViewToggle,CalendarLegend}.tsx`. Data seam: `client/src/calendar/repo.ts` + `api.ts`. Server: `server/src/routes/calendar.ts`.

## Other next (not started)
- **Streak logic** — currently hardcoded `streakDays={12}` in `TodayPage`; derive from activity/reconciliation history.
- **Recurring tasks** and **manual fixed blocks** (sleep/standing meetings beyond GCal) — still unbuilt.
- **Team/Delegation** page is still a placeholder (locked spec in project-context; `team.html` mockup exists).
- **Google account legend** (`CalendarLegend`) is visual only — per-source on/off toggle not wired.
- Chores: a completed carried-over chore disappears (belongs to a past day, not shown in today's "done"). Acceptable; revisit if Akshu wants completed carry-overs to read as done-today. Per-chore area is stored but not yet attributed in "today by area".

## Known issues / cleanup
- Google OAuth tokens stored plaintext in Mongo — encrypt before any multi-user rollout.
- Rotate Atlas DB password (shared in plaintext during setup).
- Throwaway test accounts in DB: `akshu@axiom.local`, `akshu+phase2@axiom.app`, `gcal-test@axiom.app`, `onboard-test-*@axiom.app`, `ui-onboard-*@axiom.app` — safe to delete. Real account in use: `akshat@nextplatforms.in`.
- PWA manifest references `pwa-192.png` / `pwa-512.png` that don't exist yet.
- `TimeLog` model + `/timelogs` route + `repo.createTimeLog` are now unused (budget uses per-task `loggedMinutes`) — could be removed.

## Mockups (`mockups/`, served via `.claude/launch.json` on :4321)
`today-v5.html` (cockpit), `month.html` (Calendar/Month), `team.html` (Team & Delegation), `today-v4.html` (wallpaper picker). **No `goals.html`** — Goals page must be designed fresh.

## Preview / dev gotchas (this setup)
- Run the stack with one `npm run dev` from the repo root (starts client :5173 + server :4000 together). Starting a stray second client on :5173, or serving the built `dist`, gives a **non-proxying** server → `/api/*` returns the SPA HTML and login silently 404s. If login fails, check `/api/health` via the page returns JSON not HTML.
- Preview client config lives in `.claude/launch.json` (name `client`). The Preview screenshot tool is flaky on this machine — fall back to `preview_eval` DOM probes.

## Core problem
Akshu loses accurate sense of where time goes — illusion of free time, work overflows. The app's #1 job: an accurate real-time view of daily time allocation and remaining free time. Filter every feature through: does this help him see where time goes and prevent overflow?

## Locked feature set + stack
Full detail in `project-context/project_task_manager.md`. Summary: daily time budget, per-task estimates + live timer, overflow detection, planned-vs-actual; goal hierarchy (Annual>Half>Monthly>Weekly) with auto reviews; GCal read-only multi-account; JWT, userId-scoped. **3 differentiators:** (1) one-tap interruption logging (🔥 Fire / 🌀 Rabbit Hole / 😵 Distraction), (2) Function Tracks within ventures, (3) Delegation tracker (~10 reports). Nav: Today | Calendar | Goals | Team | Settings. Aesthetic: light/playful, Nunito, frosted glass over swappable wallpapers. Stack: MERN + TS, PWA first (React Native later).
