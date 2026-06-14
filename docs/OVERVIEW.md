# Dayforge — Overview

**Dayforge is a personal time-management cockpit.** Its single job: give you an
accurate, real-time picture of where today's time is going and how much is
actually left — so work stops quietly overflowing into the hours you thought
were free.

> Product name: **Dayforge**. The repo and internal identifiers still use the
> original working name `axiom` on purpose (changing them would break stored
> data and localStorage keys).

---

## The problem it solves

Most task apps tell you *what* to do. They don't tell you whether it actually
**fits in the day**. The result is the familiar trap: a to-do list that looks
achievable, an illusion of free time, and work that spills over because nothing
ever counted the hours against a real, finite budget.

Dayforge is built around one question, and every feature is filtered through it:

> **Does this help me see where my time goes and prevent overflow?**

---

## The core idea: a real time budget

Instead of an infinite list, your day starts as a **finite budget of minutes**.

1. You tell Dayforge your routine once (sleep, commute, work hours, working
   days). It subtracts those to compute the **time you actually have** each day.
2. Every task carries an **estimate**. As you work, a **live timer** logs real
   minutes against it.
3. The cockpit continuously shows **allocated vs available**, flags **overflow**
   the moment your plan exceeds the budget, and tracks **planned vs actual** so
   your estimates get honest over time.

Calendar events, chores, and interruptions all draw from the same budget, so the
number you see is the truth, not a wish.

---

## Salient features

**Today cockpit** — the home screen.
- Time Budget card (Day / Week / Month scopes) with a live "time gained vs plan".
- 24-Hour Allocation ring + a "Today by area" breakdown of where time landed.
- Per-task estimates, concurrent live timers, pause / stop-and-complete.
- Pending (overdue carry-over) and Scheduled (future) task buckets.
- Soft and hard deadlines with overflow detection.
- **Day plan** — a drag-to-arrange hour-by-hour timeline (timeboxing).
- Chores batched into one timed end-of-day block.
- A "Completed today" ledger you can reopen or correct logged time on.

**Goals** — a real goal hierarchy (Annual → Half-year → Monthly → Weekly).
- Progress is **derived from linked tasks**, not guessed.
- Count goals (e.g. "gym 5×") and timed goals (a hard deadline) with a real
  success / missed lifecycle; one-click duplicate for the next period.

**Calendar** — Day / Week / Month views, with **Google Calendar** read-only
sync (multi-account). Synced events become budget-deducting blocks you plan
around.

**Team & Delegation** — track work handed to ~10 people: By Person and By Status
views, follow-up reminders, and delegation history.

**Reports** — look back over any range: time per life area, pace (logged vs
estimate), deadline adherence, completed/missed goals, delegation history, and an
effort trend. Plus a **raw Task History** table you can date-filter and reverse
completions from.

**Polish** — frosted "liquid glass" UI over swappable wallpapers (with optional
timed shuffle), installable as a PWA, light and playful (Nunito).

---

## The three differentiators

1. **One-tap interruption logging** — when something derails you, log it
   instantly as 🔥 Fire, 🌀 Rabbit Hole, or 😵 Distraction. Interruptions are
   visible time, not invisible leakage.
2. **Function Tracks within ventures** — organise work by the *function* it
   serves inside each life area / venture, not just a flat project list.
3. **Delegation tracker** — first-class accounting of work you've handed off, so
   "I delegated it" doesn't mean "I lost track of it".

---

## How it's built (one line each)

- **Frontend:** React + TypeScript PWA (Vite), client-side timers and budget math.
- **Backend:** Express + TypeScript, Mongoose on MongoDB Atlas, JWT auth; every
  record scoped to the user.
- **Hosting:** Vercel — static client on the CDN, the whole API as one
  serverless function. Google Calendar via OAuth.

See [USER_GUIDE.md](USER_GUIDE.md) for a page-by-page how-to, and
`/presentation.html` on the live site for the visual deck.
