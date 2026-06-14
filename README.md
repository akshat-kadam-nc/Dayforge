# Dayforge

Personal time-management PWA. The point of the app: an accurate, real-time view of where the day's time is going and how much is actually left. Built MERN + TypeScript.

Dayforge is the product name. The repo directory and internal package/identifier names are still `axiom` (the original working name) and are intentionally left unchanged to avoid breaking storage keys and data.

## Documentation

- [docs/OVERVIEW.md](docs/OVERVIEW.md) — what Dayforge is, the problem it solves, salient features.
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — page-by-page how-to-use.
- **Presentation (HTML deck):** [`client/public/presentation.html`](client/public/presentation.html) — open it in a browser, or view it live at `/presentation.html` on the deployed site. Arrow keys / Space / click to navigate.

## Layout

```
AXIOM/
├─ server/            Express + TypeScript API (JWT auth, Mongoose, userId-scoped models)
├─ client/            React + TypeScript PWA (Vite, react-router, vite-plugin-pwa)
│  └─ public/presentation.html   Product walkthrough deck (served at /presentation.html)
├─ docs/              User-facing docs (overview + how-to-use)
├─ mockups/           Locked UX reference screens (open via npx serve)
├─ project-context/   Durable plan, user profile, feature spec
└─ RESUME.md          Catch-up entry point for a fresh session
```

## Prerequisites

- Node 20+ (tested on 22)
- A MongoDB connection string (Atlas free tier is fine). The API boots without one,
  but auth and task routes return `503` until `MONGODB_URI` is set.

## Setup

```bash
npm install                 # installs both workspaces
cp .env.example server/.env # then fill in MONGODB_URI and JWT_SECRET
```

## Run

```bash
npm run dev                 # server (http://localhost:4000) + client (http://localhost:5173)
```

The Vite dev server proxies `/api` to the Express server, so the client calls same-origin paths.

Individually:

```bash
npm run dev:server
npm run dev:client
```

## Build / typecheck

```bash
npm run build               # server tsc + client vite build
npm run typecheck           # both workspaces
```

## API surface (current)

| Method | Path             | Auth | Notes                                  |
| ------ | ---------------- | ---- | -------------------------------------- |
| GET    | /api/health      | no   | `{ status, db }`                       |
| POST   | /api/auth/register | no | `{ email, password, name? }` → token   |
| POST   | /api/auth/login  | no   | `{ email, password }` → token          |
| GET    | /api/auth/me     | yes  | current user                           |
| GET    | /api/tasks       | yes  | tasks for the authenticated user       |
| POST   | /api/tasks       | yes  | create task                            |
| PATCH  | /api/tasks/:id   | yes  | update own task                        |
| DELETE | /api/tasks/:id   | yes  | delete own task                        |

Every document carries `userId` and every query filters by it. `Task` is the reference
implementation of that pattern; new collections follow it.

## Mockups

```bash
npx serve mockups -l 4321
```

`today-v5.html` is the current Today cockpit, `month.html` the calendar, `team.html` the
delegation tracker.

## Status

Feature-complete and deployed. Six sections via the left rail — Today, Calendar, Goals, Team,
Reports, Settings — over JWT auth and userId-scoped Mongoose models. Highlights: the Today
cockpit (time budget, concurrent timers, day-plan timeboxing, chores, interruptions), the goal
hierarchy with task-derived progress, Google Calendar sync, the delegation tracker, and Reports
(look-back stats + a raw task-history table). Built as an installable PWA with a liquid-glass UI.

**Hosting:** deployed on Vercel — static client on the CDN, the API as one serverless function
(`api/index.ts`), MongoDB Atlas. See `RESUME.md` for the full deploy notes and history.
