# AXIOM

Personal time-management PWA. The point of the app: an accurate, real-time view of where the day's time is going and how much is actually left. Built MERN + TypeScript.

Working name AXIOM is a placeholder.

## Layout

```
AXIOM/
├─ server/            Express + TypeScript API (JWT auth, Mongoose, userId-scoped models)
├─ client/            React + TypeScript PWA (Vite, react-router, vite-plugin-pwa)
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

Scaffold complete: auth + userId-scoped Task CRUD on the backend, PWA shell with the five-tab
bottom nav (Today / Calendar / Goals / Team / Settings) and login on the frontend. Both build
clean. Next: build features against the locked spec in `project-context/project_task_manager.md`,
starting with the Today cockpit (daily budget, per-task timer, interruption logging).
