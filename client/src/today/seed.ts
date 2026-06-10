import type { Task, TaskKind, TodayState } from './types';

/** Default kind to 'task' so the seed literals can omit it. */
function withKind(ts: (Omit<Task, 'kind'> & { kind?: TaskKind })[]): Task[] {
  return ts.map((t) => ({ ...t, kind: t.kind ?? 'task' }));
}

/**
 * Demo seed: a set of sample ventures and a representative day for "Explore in
 * demo mode". This is the data the cockpit reads in guest mode; real accounts
 * load their own from the API. Colors match the locked palette.
 */

const AREAS = [
  { id: 'academy', name: 'Academy', icon: '📚', color: '#f97316' },
  { id: 'nimbus', name: 'Nimbus AI', icon: '🤖', color: '#8b5cf6' },
  { id: 'orbit', name: 'Orbit', icon: '⚡', color: '#06b6d4' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: '#22c55e' },
  { id: 'brand', name: 'Personal Brand', icon: '✍️', color: '#ec4899' },
];

// Function tracks per area (from the locked spec). Only the ones referenced by
// seed tasks need distinct colors; the rest inherit sensible defaults.
const TRACKS = [
  { id: 'dl-teaching', areaId: 'academy', name: 'Teaching', color: '#1d4ed8' },
  { id: 'dl-admin', areaId: 'academy', name: 'Admin', color: '#475569' },
  { id: 'dl-leadership', areaId: 'academy', name: 'Leadership', color: '#7e22ce' },
  { id: 'zu-product', areaId: 'nimbus', name: 'Product', color: '#0891b2' },
  { id: 'zu-marketing', areaId: 'nimbus', name: 'Marketing', color: '#be185d' },
  { id: 'zu-devmgmt', areaId: 'nimbus', name: 'Dev Mgmt', color: '#15803d' },
  { id: 'zu-strategy', areaId: 'nimbus', name: 'Strategy', color: '#b45309' },
  { id: 'nx-product', areaId: 'orbit', name: 'Product', color: '#0369a1' },
  { id: 'br-content', areaId: 'brand', name: 'Content', color: '#be185d' },
];

const GOALS = [
  // Academy: a full annual → half-year → monthly → weekly chain.
  { id: 'g-dl-annual', areaId: 'academy', text: 'Grow Academy to 500 active students', icon: '🏆', pct: 0, color: '#f97316', period: 'annual' as const },
  { id: 'g-dl-half', areaId: 'academy', text: 'Reach 200 students by H1', icon: '📈', pct: 0, color: '#f97316', period: 'half_year' as const, parentId: 'g-dl-annual' },
  { id: 'g-dl-month', areaId: 'academy', text: 'Run Cohort 4 end-to-end', icon: '📚', pct: 0, color: '#f97316', period: 'monthly' as const, parentId: 'g-dl-half' },
  { id: 'g-batch4', areaId: 'academy', text: 'Cohort 4 lesson plan — 6 sessions', icon: '📚', pct: 33, color: '#f97316', period: 'weekly' as const, parentId: 'g-dl-month' },
  // Nimbus: full chain too.
  { id: 'g-zu-annual', areaId: 'nimbus', text: 'Make Nimbus market-ready', icon: '🚀', pct: 0, color: '#8b5cf6', period: 'annual' as const },
  { id: 'g-zu-half', areaId: 'nimbus', text: 'Land first 10 paying teams', icon: '📈', pct: 0, color: '#8b5cf6', period: 'half_year' as const, parentId: 'g-zu-annual' },
  { id: 'g-zu-month', areaId: 'nimbus', text: 'Ship Nimbus v1.2 to production', icon: '🤖', pct: 0, color: '#8b5cf6', period: 'monthly' as const, parentId: 'g-zu-half' },
  { id: 'g-zumalm', areaId: 'nimbus', text: 'v1.2 release checklist', icon: '🤖', pct: 70, color: '#8b5cf6', period: 'weekly' as const, parentId: 'g-zu-month' },
  // Personal Brand: a partial chain (monthly + weekly, no annual above).
  { id: 'g-br-month', areaId: 'brand', text: 'Build a consistent LinkedIn presence', icon: '✍️', pct: 0, color: '#ec4899', period: 'monthly' as const },
  { id: 'g-linkedin', areaId: 'brand', text: 'Publish 3 technical LinkedIn posts', icon: '✍️', pct: 33, color: '#ec4899', period: 'weekly' as const, parentId: 'g-br-month' },
];

function keyShift(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function makeInitialState(): TodayState {
  const today = keyShift(0);
  const yesterday = keyShift(-1);
  const tomorrow = keyShift(1);
  return {
    areas: AREAS,
    tracks: TRACKS,
    goals: GOALS,
    fixedBlocks: [
      { id: 'sleep', label: 'Sleep', minutes: 420, color: '#94a3b8' },
    ],
    tasks: withKind([
      {
        id: 't1',
        title: 'Prepare Cohort 4 — Functions & Scope',
        areaId: 'academy',
        trackId: 'dl-teaching',
        status: 'in_progress',
        estimateMinutes: 90,
        source: 'manual',
        goalId: 'g-batch4',
        deferredCount: 0,
        loggedMinutes: 23,
        createdAt: '2026-06-08T07:15:00',
        day: today,
      },
      {
        id: 't2',
        title: 'Review franchise SOP draft v2',
        areaId: 'academy',
        trackId: 'dl-admin',
        status: 'not_started',
        estimateMinutes: 45,
        source: 'manual',
        deferredCount: 2,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
        day: today,
      },
      {
        id: 't3',
        title: 'Faculty meeting — curriculum alignment',
        areaId: 'academy',
        trackId: 'dl-leadership',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'calendar',
        scheduledAt: '11:00',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
        day: today,
      },
      {
        id: 't4',
        title: 'Mascot science outfit — AI image prompts',
        areaId: 'nimbus',
        trackId: 'zu-marketing',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'manual',
        goalId: 'g-zumalm',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
        day: today,
      },
      {
        id: 't5',
        title: 'Review dev sprint progress — assigned to Alex',
        areaId: 'nimbus',
        trackId: 'zu-devmgmt',
        status: 'not_started',
        estimateMinutes: 30,
        source: 'manual',
        delegateName: 'Alex',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
        day: today,
      },
      {
        id: 't6',
        title: 'Partner sync — Nimbus roadmap',
        areaId: 'nimbus',
        trackId: 'zu-strategy',
        status: 'not_started',
        estimateMinutes: 90,
        source: 'calendar',
        scheduledAt: '16:00',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
        day: today,
      },
      {
        id: 't-pending',
        title: 'Send Q2 investor update (overdue)',
        areaId: 'nimbus',
        trackId: 'zu-strategy',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'manual',
        deferredCount: 1,
        loggedMinutes: 0,
        createdAt: keyShift(-2) + 'T10:00:00',
        day: yesterday,
        dueAt: keyShift(-1) + 'T18:00:00',
        deadlineType: 'hard',
      },
      {
        id: 't-upcoming',
        title: 'Prep Academy Cohort 5 kickoff',
        areaId: 'academy',
        trackId: 'dl-leadership',
        status: 'not_started',
        estimateMinutes: 75,
        source: 'manual',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: today + 'T09:00:00',
        day: tomorrow,
        dueAt: keyShift(3) + 'T12:00:00',
        deadlineType: 'soft',
      },
      // Completed work linked to weekly goals, so the Goals page derives
      // estimate-weighted progress (done-estimate / total-estimate) in demo.
      {
        id: 'g-batch4-d1', title: 'Cohort 4 — Session 1 slides', areaId: 'academy', trackId: 'dl-teaching',
        status: 'done', estimateMinutes: 60, source: 'manual', goalId: 'g-batch4', deferredCount: 0,
        loggedMinutes: 72, createdAt: yesterday + 'T09:00:00', completedAt: yesterday + 'T11:00:00', day: yesterday,
      },
      {
        id: 'g-batch4-d2', title: 'Cohort 4 — Session 2 exercises', areaId: 'academy', trackId: 'dl-teaching',
        status: 'done', estimateMinutes: 30, source: 'manual', goalId: 'g-batch4', deferredCount: 0,
        loggedMinutes: 28, createdAt: yesterday + 'T12:00:00', completedAt: yesterday + 'T12:40:00', day: yesterday,
      },
      {
        id: 'g-linkedin-d1', title: 'Draft post — "Why MERN for solo founders"', areaId: 'brand', trackId: 'br-content',
        status: 'done', estimateMinutes: 45, source: 'manual', goalId: 'g-linkedin', deferredCount: 0,
        loggedMinutes: 50, createdAt: yesterday + 'T16:00:00', completedAt: yesterday + 'T17:00:00', day: yesterday,
      },
      // Chore session block + a few demo chores for the Chores card.
      {
        id: 'chore-session',
        title: 'Chores',
        areaId: '',
        kind: 'chore_session',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'manual',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: today + 'T08:00:00',
        day: today,
      },
      {
        id: 'chore-1', title: 'Reply to client on WhatsApp', areaId: 'nimbus', kind: 'chore',
        status: 'not_started', estimateMinutes: 5, source: 'manual', deferredCount: 0,
        loggedMinutes: 0, createdAt: today + 'T08:00:00', day: today,
      },
      {
        id: 'chore-2', title: 'Send fee receipt to franchise partner', areaId: 'academy', kind: 'chore',
        status: 'not_started', estimateMinutes: 10, source: 'manual', deferredCount: 0,
        loggedMinutes: 0, createdAt: today + 'T08:00:00', day: today,
      },
      {
        id: 'chore-3', title: 'Approve leave request', areaId: 'orbit', kind: 'chore',
        status: 'done', estimateMinutes: 5, source: 'manual', deferredCount: 0,
        loggedMinutes: 0, createdAt: today + 'T08:00:00', completedAt: today + 'T09:10:00', day: today,
      },
      {
        // Open chore from yesterday: should carry into today's card.
        id: 'chore-carry', title: 'Return call to printing vendor', areaId: 'academy', kind: 'chore',
        status: 'not_started', estimateMinutes: 10, source: 'manual', deferredCount: 0,
        loggedMinutes: 0, createdAt: yesterday + 'T15:00:00', day: yesterday,
      },
    ]),
    interruptions: [
      {
        id: 'i1',
        type: 'fire',
        title: 'App — Play Store review rejection',
        note: 'Had to respond to policy flag immediately',
        minutes: 52,
      },
      {
        id: 'i2',
        type: 'rabbit_hole',
        title: 'Rabbit hole — DB schema rethink',
        note: 'Unplanned, pulled away from lesson prep',
        minutes: 38,
      },
      {
        id: 'i3',
        type: 'distraction',
        title: 'Distraction — phone / social',
        minutes: 15,
      },
    ],
    // Some time already logged today (so the cockpit is not empty on load).
    logs: [
      { taskId: 't1', areaId: 'academy', minutes: 23 },
    ],
    timer: { runs: {} },
    collapsedAreas: {},
    budgetScope: 'day',
    scopeSummary: null,
    dueReconciliations: [],
    calendarEvents: [],
    day: today,
    availableMinutes: 360, // 6h discretionary today
    streak: 5, // demo: a plausible run so the streak pill is visible
  };
}
