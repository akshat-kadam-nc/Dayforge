# Dayforge — Development Guide

How to run, build, extend, and deploy the codebase. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the design and [API.md](API.md) /
[DATA_MODEL.md](DATA_MODEL.md) for the references.

## Prerequisites

- Node 20+ (tested on 22)
- A MongoDB connection string (Atlas free tier works). The API boots without
  one; DB-backed routes return `503` until `MONGODB_URI` is set.

## Setup

```bash
npm install                  # installs both workspaces
cp .env.example server/.env  # then fill it in (see Env below)
```

## Run

```bash
npm run dev        # server on :4000 + client on :5173 (Vite proxies /api → :4000)
npm run dev:server # API only
npm run dev:client # client only
```

Dev is same-origin: Vite proxies `/api` to Express, so the client calls relative
`/api/...` paths (`client/src/api/client.ts`). Demo mode (`Explore in demo
mode`) needs no backend at all — it runs on `localRepo`.

## Build / typecheck

```bash
npm run build       # server: tsc → server/dist ; client: tsc --noEmit && vite build → client/dist
npm run typecheck   # both workspaces, no emit
```

Keep both green before committing.

## Environment (`server/.env`)

Read in `server/src/config/env.ts`:

| Var | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | for data | Atlas string — **must include the `/axiom` db name** before `?`, or data lands in `test` |
| `JWT_SECRET` | yes | signing secret; changing it invalidates existing tokens |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `CLIENT_ORIGIN` | prod | used for CORS + Google redirect base |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Calendar | without them, Calendar features stay inert (no crash) |
| `GOOGLE_REDIRECT_URI` | for Calendar | e.g. `https://<host>/api/google/callback` |
| `SERVE_CLIENT` | deploy | `true` = Express also serves `client/dist` (Render). On Vercel set `false` (the CDN serves it) |
| `PORT` | no | default 4000 |

## Conventions

- **Workspaces.** Root `package.json` defines `server` + `client`. Run workspace
  scripts with `npm run <script> --workspace <name>`.
- **Server is NodeNext ESM.** Relative imports in `.ts` files use the **`.js`
  extension** (`import { x } from './foo.js'`) even though the source is `.ts` —
  required by NodeNext resolution. Keep this when adding files.
- **`.npmrc` has `include=dev`** so devDeps (tsc, vite, @types) install even
  under `NODE_ENV=production` on the build hosts. Don't remove it.
- **Validation:** every route body goes through a zod schema; reuse the existing
  `*Input` schemas as the pattern.
- **Scoping:** new collections must carry `userId` and every query must filter by
  `req.userId`. Mirror `Task`.
- **Styling:** use the centralized glass tokens (`--glass-*` in `:root`); when
  placing `position:fixed`/`absolute` elements, check ancestors for
  `transform`/`backdrop-filter` (they become the containing block) and portal
  overlays to `body`.

## Adding a feature end-to-end

Example: a new resource `widgets`.

1. **Model** — `server/src/models/Widget.ts` with `userId` + `{ timestamps }`.
2. **Route** — `server/src/routes/widgets.ts`: `router.use(requireDb, requireAuth)`,
   a zod input, CRUD handlers filtering by `req.userId`. Register it in
   `server/src/app.ts` (`app.use('/api/widgets', widgetsRouter)`).
3. **Client api** — `client/src/widgets/api.ts`: fetch + map `_id → id`.
4. **Client repo** — `client/src/widgets/repo.ts`: a `Repo` interface with
   `apiRepo` (calls api) and `localRepo` (demo seed), chosen by `auth.isGuest`.
5. **UI** — a page/component reading the repo; if it's part of the cockpit, wire
   actions through `today/useToday.tsx` (reducer + optimistic update + repo call).
6. Add the endpoint to [API.md](API.md) and the model to [DATA_MODEL.md](DATA_MODEL.md).

## Deployment

### Vercel (primary)

Static client on the CDN + the whole Express API as **one serverless function**.

- `api/index.ts` — dynamic-imports `createApp()` from the server source so
  `@vercel/node` bundles it (a static top-level import fails to load). Routes are
  reached via the `vercel.json` rewrite `/(api/...) → /api`.
- `vercel.json` — `buildCommand: npm run build --workspace client`,
  `outputDirectory: client/dist`, SPA rewrite of non-`/api` paths to `index.html`.
- **Project settings:** Root Directory = repo root (`./`), not `client/`. Env
  vars as above with `SERVE_CLIENT=false`; set the function region near Atlas.
- Atlas Network Access must allow `0.0.0.0/0` (serverless IPs are dynamic).
- Pushing to `main` auto-builds and deploys. `/api/health` → `db:connected` is
  the post-deploy canary.

### Render (fallback)

Single always-on web service: `npm start --workspace server` runs
`server/dist/index.js`, which serves both the API and `client/dist`
(`SERVE_CLIENT=true`). Config in `render.yaml`. The free tier sleeps after ~15
min idle (the reason for the Vercel move).

> Full deploy history and gotchas live in `RESUME.md`.

## Gotchas

- **PWA cache:** after a deploy, hard-refresh (Ctrl+Shift+R); on mobile, fully
  close and reopen the installed app — the service worker (`registerType:
  autoUpdate`) serves the old bundle until the next load.
- **Vite content hashing is deterministic:** a local build and the deployed build
  produce the same asset hash for the same code, so "did the hash change" is not
  a reliable deploy signal — grep the live bundle for a known string instead.
- **Timezone:** day-range queries bucket UTC `completedAt` against local day keys
  (see API.md → Timezone caveat).
