---
name: project-task-manager
description: "Custom personal task manager being built for Akshu — context, decisions, and feature direction"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4a747320-35f1-4839-9870-beca68ea5843
---

A custom task manager being designed and built with Claude Code. Solo user (Akshu only). Multi-device: home desktop, work desktop, laptop, Android mobile.

## Core problem to solve
Akshu loses accurate sense of where time is going. He ends up with an illusion of more free time than he has, spends more time on leisure than work, and work piles up and overflows. The #1 job of this app: give an accurate, real-time view of time allocation in a day and remaining free time.

## What has been tried and failed
Notion and to-do lists — too generic, not sticky enough for his multi-venture context.

## Form factor decision
Web app (Progressive Web App or responsive web). Ruled out: standalone desktop app (usability on mobile is a blocker). React Native considered but web app first is cleaner for MERN.

## Stack decision
MERN (MongoDB, Express, React, Node.js). Company standard. React Native is a natural extension path if native mobile ever needed.

## Design goal
Custom enough that Akshu actually uses it consistently. Features designed around his real working reality, not a generic user.

## Locked feature set
**Core time management:** daily time budget (available minus fixed blocks), required time estimate per task, live timer per task, overflow detection, planned-vs-actual end-of-day report.
**Task system:** tasks belong to a Life Area; statuses Not started/In progress/Done/Deferred/Blocked; deferred rolls forward with count; recurring tasks + fixed blocks in the daily list; quick capture.
**Goal hierarchy:** Annual > Half-year > Monthly > Weekly per Life Area; daily tasks optionally linked to weekly goals; lightweight progress on Today/Week views.
**Reconciliation:** auto-prompted weekly close (Sunday), monthly close (last day), half-year checkpoint; structured prompts not blank journal.
**Google Calendar:** read-only sync first (events become fixed blocks, auto-deduct from budget); two-way later. OAuth separate from app auth.
**Auth:** JWT-based from day one; every Mongo doc scoped to userId for future multi-user/public rollout.

## Three differentiating features (the real reason this beats generic tools)
1. **Interruption/Distraction logging** — one-tap ⚡ Interrupt button in timer strip pauses active task and tracks the interruption. Types: 🔥 Fire (urgent unplanned work), 🌀 Rabbit Hole (unplanned work drift), 😵 Distraction (non-work). Shows in Today list block, gets own red segment in 24h ring, summarized in end-of-day report. Solves untracked time leakage.
2. **Function Tracks within projects** — each project has configurable work verticals. Tasks tagged to one+ track. Reveals how project time splits across functions. Defaults: DeveLearn (Teaching, Curriculum, Marketing, Admin, Leadership, BD); Zuma AI (Product, Dev Management, Marketing, BD, Strategy); Next Platforms (Product, Dev, BD, Operations); Personal Brand (Content, Engagement, Strategy); Health (Workout, Recovery, Nutrition). Shown as task micro-tag + stacked bar on Area detail page.
3. **Delegation tracker** — "Team" nav section. ~10 direct reports. Per-person delegated work with ticketing statuses (Pending/In Progress/Done/Blocked), due date, follow-up date, recurring flag. Daily follow-up nudge in Today view. Quick-assign from task creation. Needs grouping/filtering given 10 people.

## Navigation
Bottom nav (mobile-first PWA): Today | Calendar | Goals | Team | Settings. Areas accessible from within projects. Review screens are prompted overlays.
- "Calendar" replaces the old "Week" slot and holds a Day/Week/Month toggle. Month = GCal-style grid synced with MULTIPLE Google accounts (each account is a toggleable colored source in a legend). Each day cell shows event chips PLUS a thin stacked allocation bar by life-area color, overflow days get a red corner flag, follow-up days get a 👥 dot. Today stays separate as the action cockpit.

## Aesthetics
Light playful direction (v2/v4 confirmed). Nunito font, frosted-glass cards over a wallpaper layer, pastel accents, emoji venture icons, micro-delight. Gmail-style wallpaper picker (slide-in panel, live preview, apply/cancel). Wallpaper presets include gaming/anime themes (Pokémon Dusk default, Super Saiyan/DBZ) + atmospheric + solid + custom upload. App working name: AXIOM (placeholder).

## Mockups built
D:\Claude\mockups\today.html (v1 dark), today-v2.html (light playful), today-v3.html (SVG wallpaper, did not render), today-v4.html (CSS wallpapers + working picker — current reference).

## Status (as of 2026-06-06)
Feature + UX planning. Today screen design locked on v4 direction. No production code written yet. Next: integrate the 3 differentiating features into mockup, then Week/Goals/Team screens.

**Why:** Generic tools have failed. The product needs to be entity-aware (DeveLearn, Zuma, Next Platforms, WorkIn, Personal Brand) and time-visibility-first. 99Support and Hana are no longer active contexts.
**How to apply:** All feature decisions should be filtered through: does this help Akshu see where his time is going and prevent work overflow?
