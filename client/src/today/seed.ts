import type { TodayState } from './types';

/**
 * Phase 1 seed: Akshu's real ventures and a representative day, mirroring the
 * today-v5 mockup. This is the data the cockpit reads until Phase 2 swaps it
 * for the API. Colors match the locked palette.
 */

const AREAS = [
  { id: 'develearn', name: 'DeveLearn', icon: '📚', color: '#f97316' },
  { id: 'zuma', name: 'Zuma AI', icon: '🤖', color: '#8b5cf6' },
  { id: 'next', name: 'Next / WorkIn', icon: '⚡', color: '#06b6d4' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: '#22c55e' },
  { id: 'brand', name: 'Personal Brand', icon: '✍️', color: '#ec4899' },
];

// Function tracks per area (from the locked spec). Only the ones referenced by
// seed tasks need distinct colors; the rest inherit sensible defaults.
const TRACKS = [
  { id: 'dl-teaching', areaId: 'develearn', name: 'Teaching', color: '#1d4ed8' },
  { id: 'dl-admin', areaId: 'develearn', name: 'Admin', color: '#475569' },
  { id: 'dl-leadership', areaId: 'develearn', name: 'Leadership', color: '#7e22ce' },
  { id: 'zu-product', areaId: 'zuma', name: 'Product', color: '#0891b2' },
  { id: 'zu-marketing', areaId: 'zuma', name: 'Marketing', color: '#be185d' },
  { id: 'zu-devmgmt', areaId: 'zuma', name: 'Dev Mgmt', color: '#15803d' },
  { id: 'zu-strategy', areaId: 'zuma', name: 'Strategy', color: '#b45309' },
  { id: 'nx-product', areaId: 'next', name: 'Product', color: '#0369a1' },
  { id: 'br-content', areaId: 'brand', name: 'Content', color: '#be185d' },
];

const GOALS = [
  { id: 'g-batch4', areaId: 'develearn', text: 'Batch 4 lesson plan — 6 sessions', icon: '📚', pct: 33, color: '#f97316' },
  { id: 'g-zumalm', areaId: 'zuma', text: 'Ship ZumaLM v1.2 to production', icon: '🤖', pct: 70, color: '#8b5cf6' },
  { id: 'g-linkedin', areaId: 'brand', text: 'Publish 3 technical LinkedIn posts', icon: '✍️', pct: 33, color: '#ec4899' },
];

export function makeInitialState(): TodayState {
  return {
    areas: AREAS,
    tracks: TRACKS,
    goals: GOALS,
    fixedBlocks: [
      { id: 'sleep', label: 'Sleep', minutes: 420, color: '#94a3b8' },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Prepare Python Batch 4 — Functions & Scope',
        areaId: 'develearn',
        trackId: 'dl-teaching',
        status: 'in_progress',
        estimateMinutes: 90,
        source: 'manual',
        goalId: 'g-batch4',
        deferredCount: 0,
        loggedMinutes: 23,
        createdAt: '2026-06-08T07:15:00',
      },
      {
        id: 't2',
        title: 'Review franchise SOP draft v2',
        areaId: 'develearn',
        trackId: 'dl-admin',
        status: 'not_started',
        estimateMinutes: 45,
        source: 'manual',
        deferredCount: 2,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
      },
      {
        id: 't3',
        title: 'Faculty meeting — curriculum alignment',
        areaId: 'develearn',
        trackId: 'dl-leadership',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'calendar',
        scheduledAt: '11:00',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
      },
      {
        id: 't4',
        title: 'MUNKEE science outfit — AI image prompts',
        areaId: 'zuma',
        trackId: 'zu-marketing',
        status: 'not_started',
        estimateMinutes: 60,
        source: 'manual',
        goalId: 'g-zumalm',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
      },
      {
        id: 't5',
        title: 'Review dev sprint progress — assigned to Rahul',
        areaId: 'zuma',
        trackId: 'zu-devmgmt',
        status: 'not_started',
        estimateMinutes: 30,
        source: 'manual',
        delegateName: 'Rahul',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
      },
      {
        id: 't6',
        title: 'Partner sync with Zubin — ZumaLM roadmap',
        areaId: 'zuma',
        trackId: 'zu-strategy',
        status: 'not_started',
        estimateMinutes: 90,
        source: 'calendar',
        scheduledAt: '16:00',
        deferredCount: 0,
        loggedMinutes: 0,
        createdAt: '2026-06-08T08:30:00',
      },
    ],
    interruptions: [
      {
        id: 'i1',
        type: 'fire',
        title: 'Zuma AI — Play Store review rejection',
        note: 'Had to respond to policy flag immediately',
        minutes: 52,
      },
      {
        id: 'i2',
        type: 'rabbit_hole',
        title: 'Rabbit hole — WorkIn DB schema rethink',
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
      { taskId: 't1', areaId: 'develearn', minutes: 23 },
    ],
    timer: { runs: {} },
    collapsedAreas: {},
    budgetScope: 'day',
    scopeSummary: null,
    dueReconciliations: [],
    calendarEvents: [],
    availableMinutes: 360, // 6h discretionary today
  };
}
