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
- **Next: Phase 3 (part 2 / unscoped)** — recurring tasks + fixed blocks. Then **Phase 4** — Google Calendar → fixed blocks, weekly/monthly reconciliation prompts, wallpaper picker, streak logic, real week/month budget scopes.

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
