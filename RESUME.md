# Axiom — Resume Here

Personal time-management web app being built with Claude Code. This file lets a fresh session (e.g. on the home machine) pick up cleanly.

## How to resume at home
1. Clone this repo and open it in Claude Code.
2. Tell Claude: "Read RESUME.md and project-context/ to load the full plan, then continue."
3. The durable context (user profile, decisions, full feature set) is in `project-context/` (copies of the memory files from the office machine).

## Where things stand
- Planning + UX design phase complete. No production code written yet.
- Next step agreed: **scaffold the full MERN project** (Node/Express/MongoDB backend with JWT auth and userId-scoped models; React PWA frontend), then build feature by feature.
- App working name: **AXIOM** (placeholder, kept for now).

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
