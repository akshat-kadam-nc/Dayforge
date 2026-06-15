# Dayforge — Architecture

Technical overview of how the codebase is structured and how a request flows
through it. For the REST surface see [API.md](API.md); for the persisted shapes
see [DATA_MODEL.md](DATA_MODEL.md); for setup and conventions see
[DEVELOPMENT.md](DEVELOPMENT.md).

> Naming: the product is **Dayforge**; the repo, package names, the Atlas db
> (`axiom`), and localStorage keys (`axiom.*`) still use the original working
> name `axiom`. This is deliberate — renaming would break stored data.

---

## 1. Monorepo layout

npm workspaces, two packages:

```
AXIOM/
├─ server/   Express + TypeScript API (NodeNext ESM, Mongoose, JWT)
├─ client/   React + TypeScript PWA (Vite, react-router, vite-plugin-pwa)
├─ api/      Vercel serverless entry that wraps the Express app (index.ts)
├─ docs/     This documentation
├─ mockups/  Static UX reference screens (not bundled)
└─ project-context/, RESUME.md   Internal planning / session catch-up
```

The two workspaces are independent builds joined only by HTTP: the client calls
`/api/*`, never importing server code (except the Vercel wrapper, which imports
the server app source to bundle it into one function).

---

## 2. Request lifecycle

```
Browser (React)
  → fetch(`/api/...`)            client/src/api/client.ts (adds JWT bearer)
  → Vercel CDN / dev proxy       static client served by CDN; /api/* → function
  → api/index.ts                 serverless wrapper: dynamic-imports createApp()
  → Express app                  server/src/app.ts (cors, json, routers)
      → requireDb                503 if MONGODB_URI unset
      → requireAuth              401 if JWT missing/invalid; sets req.userId
      → route handler            validates with zod, calls model/service
      → Mongoose                 every query filtered by userId
  → MongoDB Atlas
```

- **Dev:** Vite (`:5173`) serves the client and proxies `/api` to Express
  (`:4000`). Same-origin, no CORS needed.
- **Prod (Vercel):** the client (`client/dist`) is static on the CDN; the whole
  API is one serverless function (`api/index.ts`) reached via a rewrite. See
  DEVELOPMENT.md → Deployment.

---

## 3. Backend (`server/src/`)

Express + TypeScript, NodeNext ESM (note the explicit `.js` import specifiers in
`.ts` files), Mongoose, JWT. Layered:

**`app.ts`** — the `createApp()` factory. Mounts CORS, a body-parse guard (so it
co-exists with Vercel's pre-parsed body), `/api/health`, then every router under
`/api/*`. In single-origin mode (`SERVE_CLIENT=true`, Render) it also serves the
static client; that block is guarded so it can't crash the serverless build.

**`index.ts`** — standalone entry (`connectDb()` then `app.listen()`), used by
Render / local. Vercel uses `api/index.ts` instead.

**`config/env.ts`** — typed env access. The app boots without `MONGODB_URI`
(`isDbConfigured` is false) and DB routes return 503, so the shell runs offline.

**`db.ts`** — `connectDb()` caches the Mongoose connection promise on
`globalThis` so warm serverless invocations reuse one pool.

**`middleware/`**
- `requireDb` — 503 when the DB isn't configured.
- `requireAuth` — verifies the `Authorization: Bearer <jwt>` header, sets
  `req.userId`; 401 otherwise.
- `error.ts` — `asyncHandler` wrapper + `errorHandler` (zod → 400 with details,
  `HttpError` → its status, else 500) + the `HttpError` class.

**`routes/`** — one router per resource, all `requireDb + requireAuth` except
the public auth endpoints. Handlers validate input with **zod**, then read/write
models. See [API.md](API.md).

**`services/`** — logic shared across routes:
- `availability.ts` — `availableForDay` / `availableForRange` from the user's
  routine (work only deducts on workdays; 24h before onboarding).
- `budget.ts` — `computeBudget` sums task logged/estimate over a range.
- `goals.ts` — `resolveAndRollup`: **lazily resolves goal lifecycle on read**
  (count goals hitting target → completed; timed goals past due under target →
  missed) and returns the per-goal task rollup. Shared by `/goals/rollup` and
  `/reports`.
- `google.ts` — OAuth (auth URL, code exchange, token refresh) + calendar fetch
  (recurring expanded, `seriesKey` per series).
- `streak.ts` — `computeStreak` (consecutive days with ≥1 completed task).

**`util/day.ts`** — local day-key helpers (`dayKey`, `normaliseDay`, `addDays`,
`scopeRange`, `weekOfYear`, `completedPeriod`).

**The invariant:** every document carries `userId` and every query filters by
`req.userId`. `Task` is the reference implementation; new collections follow it.

---

## 4. Frontend (`client/src/`)

React PWA. The defining pattern is the **repo seam**.

### The repo-seam pattern

Each feature area has a folder with three files:

```
<feature>/
├─ types.ts   domain types (often re-exported from today/types)
├─ api.ts     maps the REST responses (_id → id, ObjectId → string) to types
└─ repo.ts    a Repo interface with two implementations:
                • apiRepo   → calls api.ts (real, persisted)
                • localRepo → in-memory demo seed (no backend)
```

The active implementation is chosen by **`auth.isGuest`**: demo mode uses
`localRepo` (a rich seed, nothing saved); a logged-in user uses `apiRepo`. This
lets the entire UI run with zero backend in demo, and is why "Explore in demo
mode" works offline.

Seams: `today/`, `goals/`, `calendar/`, `team/`, `reports/`.

### Today state (`today/useToday.tsx`)

The cockpit is a `useReducer` + Context provider over the chosen repo:
- Hydrates from `repo.load(today)` on mount; separate effects load calendar
  events and due reconciliations.
- Holds **all** task buckets (today + pending + scheduled), goals, interruptions,
  calendar events, available minutes, and `timer.runs` (a `Record<taskId, run>`
  so multiple timers tick concurrently, 1/sec).
- Actions (play/pause/complete, CRUD, schedule, reverse, etc.) update optimistically
  and persist via the repo. A midnight-crossover check reloads the day.

### Budget math (`today/budget.ts`)

All the derived numbers are computed **client-side** from the raw state:
`todaysTasks` / `isOnTodayPlate` (today + carry-over within deadline),
`budgetTasks`, `completedTodayTasks` (keyed off `completedAt`), allocation ring
segments, per-area splits, chores rollup, and overflow. The server stores raw
facts; the client interprets them.

### UI shell, routing, styling

- `App.tsx` → `AppShell` (left rail nav: Today / Calendar / Goals / Team /
  Reports / Settings; off-canvas drawer under 760px) wrapping a keyed
  `.app-content` that replays a page-enter animation per route.
- Pages in `pages/`; feature components in `components/<feature>/`.
- Styling is hand-rolled CSS with a centralized **glass-token** system in
  `:root` (`--glass-surface`, `--glass-blur`, etc.); page scopes alias them.
  Caution: `transform`/`backdrop-filter` create containing blocks for
  `position:fixed` descendants — a recurring source of layout bugs.
- PWA via `vite-plugin-pwa` (`registerType: autoUpdate`).

---

## 5. Key domain concepts (glossary)

- **Available minutes** — minutes left in a day after the routine (sleep/commute/
  work) is subtracted. 24h until onboarded.
- **Allocation / overflow** — sum of task estimates (+ chores) for the day;
  overflow is when allocation exceeds available.
- **On today's plate** — a task counts as "today" if its `day` is today, or it's
  a carry-over from an earlier day whose deadline hasn't passed.
- **Chore session** — the single `chore_session` task per day; its
  `loggedMinutes` is the day's batched Chores block.
- **Timeboxing** — placing tasks on the Day-plan hour grid via `task.scheduledAt`
  (an `"HH:MM"` string); no schema change.
- **Goal lifecycle** — goals are `standard` or `count`, optionally `timed`;
  status `active | completed | missed`, resolved lazily on read.
- **Function track** — a sub-grouping of work within a life area / venture.
- **Delegation** — a unit of work assigned to a Person, tracked by status.
- **seriesKey** — stable id for a recurring Google event series, used to mute it
  from the budget (`BudgetExclusion`).
