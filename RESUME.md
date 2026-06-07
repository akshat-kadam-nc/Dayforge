# Axiom — Resume Here

Personal time-management web app being built with Claude Code. This file lets a fresh session (e.g. on the home machine) pick up cleanly.

## How to resume at home
1. Clone this repo and open it in Claude Code.
2. Tell Claude: "Read RESUME.md and project-context/ to load the full plan, then continue."
3. The durable context (user profile, decisions, full feature set) is in `project-context/` (copies of the memory files from the office machine).

## Where things stand
- Planning + UX design complete. App working name: **AXIOM** (placeholder).
- **Scaffold + Phase 1 + Phase 2 done** (pushed to `main`). The Today cockpit is fully built and **persists to MongoDB Atlas**.
  - `server/` — Express + TS, JWT auth, Mongoose. userId-scoped models: User, LifeArea, FunctionTrack, Goal, Task, Interruption, TimeLog. CRUD routes + `GET /api/today?day=` aggregation + `PATCH /api/me/settings`. `util/day.ts` = local YYYY-MM-DD day keys.
  - `client/` — React PWA. The cockpit (`pages/TodayPage`, `components/today/*`) is driven by `today/useToday.tsx` over a repo seam (`today/repo.ts`): `localRepo` = demo mode (in-memory seed, offline), `apiRepo` = persisted. Live timer, ⚡ interrupt logging, budget stats + 24h ring, venture blocks, empty-state + venture/goal creation.
  - **Demo mode**: login screen has "Explore in demo mode" (guest user, no backend). Real accounts **start empty**.
- **Phase 3 (part 1) done** — function-track UI + deferred-task rollover.
  - Tracks: full CRUD wired through the repo seam (`createTrack`/`updateTrack`/`deleteTrack`) + `useToday` actions. Settings page has an expandable per-venture **TrackManager** (add / rename / recolor / delete). FAB "New task" modal now has a track picker filtered by the chosen venture.
  - Rollover: `GET /today` auto-pulls unfinished tasks (`not_started|in_progress|blocked|deferred`) from past days forward to the real current day, `deferredCount++`, `in_progress→not_started` (done stays on its day for history). `POST /tasks/:id/defer` pushes one task to tomorrow. TaskRow shows a `⤵ N×` carry badge, a blocked state, and a `⋯` menu (Defer / Mark blocked / Delete).
- **Phase 4 (part 1) done** — wallpaper picker + real week/month budget scopes.
  - Wallpaper: `client/src/wallpaper/WallpaperContext.tsx` (localStorage-persisted selection + transient preview), slide-in `components/WallpaperPicker.tsx` (9 presets across 4 sections + custom image upload, live preview, apply/cancel), opened from the Today header button. `WallpaperLayer` renders the active selection. Preset CSS lives in `styles/global.css`; `wp-poke-dusk` still in `today.css`.
  - Budget scopes: `GET /api/budget?scope&day` aggregates available (daily × days), allocated/logged/interrupted, and per-area allocation over a day / week (Mon–Sun) / month window (`scopeRange` in `util/day.ts`). The Time Budget card's toggle now fetches + renders the real aggregate (per-area + free/over bar, period range); day scope keeps the 24h view. Demo mode synthesises scaled numbers.
- **Phase 4 (part 2) done — reconciliation.** Auto-prompted weekly (Sunday) / monthly (last day) / half-year close-outs. `Reconciliation` model (one per user+scope+periodKey, upserted) + `GET /reconciliations`, `GET /reconciliations/due` (most recent finished period per scope not yet closed + budget snapshot), `POST` to save. Shared `services/budget.ts#computeBudget` (also used by `/budget`). `util/day.ts` gained `weekOfYear`, `daysBetween`, `completedPeriod`. Client: due closes load with the day and show as Today nudges → `ReconciliationModal` (stat snapshot + structured per-scope prompts + 1–5 rating); saving clears the nudge. Demo synthesises a weekly close.
- **Phase 4 (part 3a) done — Google Calendar OAuth plumbing (inert).** Read-only OAuth (auth-code + refresh) via plain fetch. Server: `GoogleAccount` + `BudgetExclusion` models, `services/google.ts`, `routes/google.ts` (`/status`, `/auth-url`, `/callback` with signed-state, account list/patch/delete, `/events`, `/exclude` POST+DELETE). Features stay off (503 / `configured:false`) until `GOOGLE_CLIENT_ID/SECRET` set in `server/.env` (see `.env.example`). Client: `google/api.ts` + `GoogleAccountsSection` in Settings (connect / per-source color+toggle / disconnect; inert + guest states).
- **Phase 4 (part 3b) done — GCal events in the cockpit.** Creds are in `server/.env` (project `axiom-498710`). Synced events load per day and render as a Calendar block of fixed blocks; timed events deduct from the budget (`effectiveAvailable` subtracts them, they appear on the 24h ring), all-day don't. Per-event mute toggle stops deduction for the whole recurring series (persisted via `/google/exclude`). `HYDRATE` now merges over current state so parallel calendar/recon/scope fetches aren't clobbered. Verified: `/google/status`→configured, `/auth-url` valid; demo + budget math live. **Only the Google consent click-through is user-driven** (needs Akshu's Google login) — connect from Settings → Google Calendar → Connect on a real (non-demo) account.
- **Timer/logging rework + onboarding done.**
  - Per-task time: tasks have `loggedMinutes`; rows show `logged / estimate`, ticking live. Budget "Logged" sums per-task (server too).
  - **Concurrent timers**: `timer.runs` keyed by taskId; playing one doesn't stop others. Strip shows running count + **Pause all**. Per-task controls: ▶ Play → ⏸ Pause (keeps time) + ⏹ Stop & Complete. Interrupt no longer auto-pauses.
  - Completing from the checkbox opens **Log allocated / Log custom / Don't log**; done rows + budget card + completed fold show **time gained/lost** (Σ estimate−logged).
  - Menus render via `components/today/PortalMenu.tsx` (body portal, flips/clamps) — fixes the clipped-dropdown bug.
  - **Onboarding**: new accounts start at a full 24h; first-run `RoutineModal` (sleep/commute/work hours + working days) drives `availableMinutes = 1440 − sleep − commute − (work on workdays)`. Server `services/availability.ts`; `/today` + `/budget` compute per-day; `/me/settings` saves routine + flips `onboarded`; editable in Settings. (The old hardcoded 6h default is gone.)
- **Timer fix + task scheduling done** (commits `78fcdcd`, `8da748d`).
  - Concurrent timers fixed: one **strip per running task**, each ticking 1s/sec (was one summed strip advancing N×/sec). Each strip has ⚡ Interrupt / ⏸ Pause / ⏹ Stop & Complete. Rows show second-level logged time (`HH:MM:SS / estimate`). Completed-today is a table (Logged / Δ vs plan / Created / Completed); tasks carry `createdAt` + `completedAt`.
  - Task buckets: `/today` returns today + all unfinished other-day tasks (no destructive rollover); client buckets into **Pending** (overdue, with created date) and **Scheduled** (future, collapsed). Budget/counts use only `state.day` tasks (`todaysTasks`). **Day crossover** auto-reloads (interval + focus) so finished-day tasks fall into Pending.
  - **Due dates**: Task has `dueAt` + `deadlineType` (soft/hard); rows show a due badge, overdue flags amber (soft) / red (hard). Create form adds start day (future-dating), deadline date/time, soft/hard toggle. Kebab has "Move to today".
- **Next:** streak logic (hardcoded `streakDays={12}` in TodayPage), recurring tasks, manual fixed blocks, the Calendar view (to manage scheduled/future tasks). Security TODO: encrypt stored Google tokens; rotate Atlas password. Cleanup: throwaway test accounts in DB (`gcal-test@axiom.app`, `onboard-test-*`, `ui-onboard-*`).

## Run it
```
npm install
# server/.env needs MONGODB_URI (Atlas cluster AXIOM-Core, db `axiom`) + JWT_SECRET.
# This file is gitignored, so recreate it on each machine. Ask Akshu for the URI.
npm run dev                   # API :4000, client :5173
```
The API boots without a DB but auth/task/today routes return 503 until MONGODB_URI is set.

## Known follow-ups
- Rotate the Atlas DB password (was shared in plaintext during setup).
- Two throwaway test accounts exist in the DB (`akshu@axiom.local`, `akshu+phase2@axiom.app`) — safe to delete.
- PWA manifest references `pwa-192.png` / `pwa-512.png` that don't exist yet (placeholder icons needed).

## Mockups (open via local static server)
In `mockups/`:
- `today-v5.html` — current Today screen (cockpit) with the 3 differentiating features
- `month.html` — Calendar / Month view (multi-GCal sync + allocation bars)
- `team.html` — Team & Delegation tracker
- `today-v4.html` — Today with the Gmail-style wallpaper picker
- earlier: today.html (v1 dark), today-v2, today-v3

To view: the project has `.claude/launch.json` configured to serve `mockups/` on port 4321 via `npx serve`.

## Core problem the app solves
Akshu loses accurate sense of where time goes — illusion of free time, work overflows. The app's #1 job: accurate real-time view of daily time allocation and remaining free time.

## Locked feature set (summary — full detail in project-context/project_task_manager.md)
- Daily time budget, required per-task estimates, live per-task timer, overflow detection, planned-vs-actual report
- Goal hierarchy: Annual > Half-year > Monthly > Weekly per life area, auto-prompted weekly/monthly/half-year reviews
- Google Calendar read-only sync (multiple accounts) feeding fixed blocks
- JWT auth, every Mongo doc scoped to userId (multi-user ready for future public rollout)
- **3 differentiators:** (1) one-tap interruption/distraction logging (🔥 Fire / 🌀 Rabbit Hole / 😵 Distraction), (2) Function Tracks within projects, (3) Delegation tracker for ~10 reports
- Nav: Today | Calendar | Goals | Team | Settings
- Aesthetic: light, playful, Nunito font, frosted glass over swappable wallpapers (Pokémon/DBZ themes), Gmail-style wallpaper picker

## Stack
MERN. PWA first (works on desktop browsers + Android home screen). React Native is a later option.
