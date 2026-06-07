import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type {
  BudgetScope,
  BudgetSummary,
  CalendarEvent,
  FunctionTrack,
  Goal,
  Interruption,
  LifeArea,
  LogMode,
  ReconciliationDue,
  ReconciliationInput,
  Task,
  TaskStatus,
  TodayState,
} from './types';
import { useAuth } from '../auth/AuthContext';
import {
  apiRepo,
  localRepo,
  todayKey,
  type CreateAreaInput,
  type CreateGoalInput,
  type CreateInterruptionInput,
  type CreateTaskInput,
  type CreateTrackInput,
  type TodaySlices,
} from './repo';

function emptyState(): TodayState {
  return {
    areas: [],
    tracks: [],
    tasks: [],
    goals: [],
    interruptions: [],
    fixedBlocks: [],
    logs: [],
    timer: { runs: {} },
    collapsedAreas: {},
    budgetScope: 'day',
    scopeSummary: null,
    dueReconciliations: [],
    calendarEvents: [],
    availableMinutes: 360,
  };
}

type Action =
  | { type: 'HYDRATE'; slices: TodaySlices }
  | { type: 'TICK' }
  | { type: 'PLAY'; taskId: string }
  | { type: 'PAUSE'; taskId: string }
  | { type: 'PAUSE_ALL' }
  | { type: 'STOP_COMPLETE'; taskId: string }
  | { type: 'COMPLETE_WITH_LOG'; taskId: string; loggedMinutes: number }
  | { type: 'UNCOMPLETE'; taskId: string }
  | { type: 'TOGGLE_AREA'; areaId: string }
  | { type: 'SET_SCOPE'; scope: BudgetScope }
  | { type: 'SET_SCOPE_SUMMARY'; summary: BudgetSummary | null }
  | { type: 'SET_DUE_RECONCILIATIONS'; due: ReconciliationDue[] }
  | { type: 'REMOVE_DUE_RECONCILIATION'; scope: string; periodKey: string }
  | { type: 'SET_CALENDAR_EVENTS'; events: CalendarEvent[] }
  | { type: 'SET_EVENT_DEDUCT'; seriesKey: string; deduct: boolean }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'SET_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'ADD_AREA'; area: LifeArea }
  | { type: 'ADD_TRACK'; track: FunctionTrack }
  | { type: 'UPDATE_TRACK'; id: string; patch: Partial<Pick<FunctionTrack, 'name' | 'color'>> }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'ADD_GOAL'; goal: Goal }
  | { type: 'ADD_INTERRUPTION'; interruption: Interruption };

/** Commit one task's live run into its loggedMinutes and drop the run. */
function commitRun(state: TodayState, taskId: string): TodayState {
  const run = state.timer.runs[taskId];
  if (!run) return state;
  const add = run.elapsedSeconds / 60;
  const runs = { ...state.timer.runs };
  delete runs[taskId];
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, loggedMinutes: t.loggedMinutes + add } : t)),
    timer: { runs },
  };
}

/** Commit every running task (used by Pause all / interrupt is now independent). */
function commitAllRuns(state: TodayState): TodayState {
  return Object.keys(state.timer.runs).reduce((s, id) => commitRun(s, id), state);
}

function reducer(state: TodayState, action: Action): TodayState {
  switch (action.type) {
    case 'HYDRATE':
      // Merge over current state (not emptyState) so transient slices loaded by
      // their own effects — calendar events, due closes, scope summary — survive
      // whichever fetch resolves last. Reset only the timer.
      return {
        ...state,
        ...action.slices,
        timer: { runs: {} },
      };
    case 'TICK': {
      const ids = Object.keys(state.timer.runs);
      if (ids.length === 0) return state;
      const runs: TodayState['timer']['runs'] = {};
      for (const id of ids) {
        runs[id] = { ...state.timer.runs[id], elapsedSeconds: state.timer.runs[id].elapsedSeconds + 1 };
      }
      return { ...state, timer: { runs } };
    }
    case 'PLAY': {
      // Start a concurrent run without disturbing other running tasks.
      if (state.timer.runs[action.taskId]) return state;
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, status: 'in_progress' } : t)),
        timer: { runs: { ...state.timer.runs, [action.taskId]: { startedAt: Date.now(), elapsedSeconds: 0 } } },
      };
    }
    case 'PAUSE':
      // Keep the logged time; task stays in progress, just no longer running.
      return commitRun(state, action.taskId);
    case 'PAUSE_ALL':
      return commitAllRuns(state);
    case 'STOP_COMPLETE': {
      const committed = commitRun(state, action.taskId);
      const now = new Date().toISOString();
      return {
        ...committed,
        tasks: committed.tasks.map((t) => (t.id === action.taskId ? { ...t, status: 'done', completedAt: now } : t)),
      };
    }
    case 'COMPLETE_WITH_LOG': {
      // User declares the final time taken; discard any uncommitted live run.
      const runs = { ...state.timer.runs };
      delete runs[action.taskId];
      const now = new Date().toISOString();
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, status: 'done', loggedMinutes: action.loggedMinutes, completedAt: now }
            : t,
        ),
        timer: { runs },
      };
    }
    case 'UNCOMPLETE': {
      const runs = { ...state.timer.runs };
      delete runs[action.taskId];
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, status: 'not_started', completedAt: undefined } : t,
        ),
        timer: { runs },
      };
    }
    case 'TOGGLE_AREA':
      return {
        ...state,
        collapsedAreas: {
          ...state.collapsedAreas,
          [action.areaId]: !state.collapsedAreas[action.areaId],
        },
      };
    case 'SET_SCOPE':
      // Drop any stale aggregate immediately; day scope never needs one.
      return { ...state, budgetScope: action.scope, scopeSummary: null };
    case 'SET_SCOPE_SUMMARY':
      return { ...state, scopeSummary: action.summary };
    case 'SET_DUE_RECONCILIATIONS':
      return { ...state, dueReconciliations: action.due };
    case 'REMOVE_DUE_RECONCILIATION':
      return {
        ...state,
        dueReconciliations: state.dueReconciliations.filter(
          (r) => !(r.scope === action.scope && r.periodKey === action.periodKey),
        ),
      };
    case 'SET_CALENDAR_EVENTS':
      return { ...state, calendarEvents: action.events };
    case 'SET_EVENT_DEDUCT':
      // Toggling deduction applies to the whole series (all instances share seriesKey).
      return {
        ...state,
        calendarEvents: state.calendarEvents.map((e) =>
          e.seriesKey === action.seriesKey ? { ...e, deduct: action.deduct } : e,
        ),
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'REMOVE_TASK': {
      // Commit any live run first so the time isn't lost on defer.
      const base = commitRun(state, action.taskId);
      return { ...base, tasks: base.tasks.filter((t) => t.id !== action.taskId) };
    }
    case 'SET_STATUS': {
      const base =
        action.status !== 'in_progress' ? commitRun(state, action.taskId) : state;
      return {
        ...base,
        tasks: base.tasks.map((t) =>
          t.id === action.taskId ? { ...t, status: action.status } : t,
        ),
      };
    }
    case 'ADD_AREA':
      return { ...state, areas: [...state.areas, action.area] };
    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.track] };
    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'REMOVE_TRACK':
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.id),
        // Drop the tag from any task that referenced the deleted track.
        tasks: state.tasks.map((t) => (t.trackId === action.id ? { ...t, trackId: undefined } : t)),
      };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'ADD_INTERRUPTION':
      // Concurrency is intentional now, so an interruption no longer pauses
      // running tasks — it's just logged. Pause manually if you stepped away.
      return { ...state, interruptions: [...state.interruptions, action.interruption] };
    default:
      return state;
  }
}

export interface TodayActions {
  play: (taskId: string) => void;
  pause: (taskId: string) => void;
  pauseAll: () => void;
  stopComplete: (taskId: string) => void;
  completeWithLog: (taskId: string, mode: LogMode, customMinutes?: number) => void;
  uncomplete: (taskId: string) => void;
  toggleArea: (areaId: string) => void;
  setScope: (scope: BudgetScope) => void;
  addTask: (input: CreateTaskInput) => Promise<void>;
  deferTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  setStatus: (taskId: string, status: TaskStatus) => void;
  addArea: (input: CreateAreaInput) => Promise<void>;
  addTrack: (input: CreateTrackInput) => Promise<void>;
  updateTrack: (id: string, patch: Partial<Pick<FunctionTrack, 'name' | 'color'>>) => Promise<void>;
  deleteTrack: (id: string) => void;
  addGoal: (input: CreateGoalInput) => Promise<void>;
  logInterruption: (input: CreateInterruptionInput) => Promise<void>;
  saveReconciliation: (input: ReconciliationInput) => Promise<void>;
  setEventDeduct: (seriesKey: string, deduct: boolean) => void;
  /** Re-pull the day (e.g. after the routine changes available minutes). */
  reload: () => void;
}

const TodayContext = createContext<{
  state: TodayState;
  actions: TodayActions;
  loading: boolean;
} | null>(null);

export function TodayProvider({ children }: { children: ReactNode }) {
  const { isGuest } = useAuth();
  const repo = isGuest ? localRepo : apiRepo;
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [loading, setLoading] = useState(true);

  // Hydrate from the chosen repo on mount.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repo
      .load(todayKey())
      .then((slices) => {
        if (!cancelled) dispatch({ type: 'HYDRATE', slices });
      })
      .catch((err) => console.error('[today] failed to load', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // Load any due period closes (weekly/monthly/half-year) alongside the day.
  useEffect(() => {
    let cancelled = false;
    repo
      .loadDueReconciliations(todayKey())
      .then((due) => {
        if (!cancelled) dispatch({ type: 'SET_DUE_RECONCILIATIONS', due });
      })
      .catch((err) => console.error('[today] failed to load reconciliations', err));
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // Load synced calendar events for the day (empty unless Google is connected).
  useEffect(() => {
    let cancelled = false;
    repo
      .loadCalendarEvents(todayKey())
      .then((events) => {
        if (!cancelled) dispatch({ type: 'SET_CALENDAR_EVENTS', events });
      })
      .catch((err) => console.error('[today] failed to load calendar events', err));
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // Tick once a second while any task is running.
  const runningCount = Object.keys(state.timer.runs).length;
  useEffect(() => {
    if (runningCount === 0) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [runningCount]);

  /** A task's committed minutes once its current live run is folded in. */
  function committedAfterRun(taskId: string): number {
    const task = state.tasks.find((t) => t.id === taskId);
    const live = (state.timer.runs[taskId]?.elapsedSeconds ?? 0) / 60;
    return (task?.loggedMinutes ?? 0) + live;
  }

  // Actions are rebuilt each render so they read fresh state (no stale closures).
  const actions: TodayActions = {
    play: (taskId) => {
      dispatch({ type: 'PLAY', taskId });
      void repo.updateTask(taskId, { status: 'in_progress' });
    },
    pause: (taskId) => {
      const loggedMinutes = committedAfterRun(taskId);
      dispatch({ type: 'PAUSE', taskId });
      void repo.updateTask(taskId, { loggedMinutes, status: 'in_progress' });
    },
    pauseAll: () => {
      for (const taskId of Object.keys(state.timer.runs)) {
        void repo.updateTask(taskId, { loggedMinutes: committedAfterRun(taskId), status: 'in_progress' });
      }
      dispatch({ type: 'PAUSE_ALL' });
    },
    stopComplete: (taskId) => {
      const loggedMinutes = committedAfterRun(taskId);
      dispatch({ type: 'STOP_COMPLETE', taskId });
      void repo.updateTask(taskId, { loggedMinutes, status: 'done' });
    },
    completeWithLog: (taskId, mode, customMinutes) => {
      const task = state.tasks.find((t) => t.id === taskId);
      const loggedMinutes =
        mode === 'allocated'
          ? (task?.estimateMinutes ?? 0)
          : mode === 'custom'
            ? Math.max(0, customMinutes ?? 0)
            : 0;
      dispatch({ type: 'COMPLETE_WITH_LOG', taskId, loggedMinutes });
      void repo.updateTask(taskId, { loggedMinutes, status: 'done' });
    },
    uncomplete: (taskId) => {
      dispatch({ type: 'UNCOMPLETE', taskId });
      void repo.updateTask(taskId, { status: 'not_started' });
    },
    toggleArea: (areaId) => dispatch({ type: 'TOGGLE_AREA', areaId }),
    setScope: (scope) => {
      dispatch({ type: 'SET_SCOPE', scope });
      if (scope === 'day') return;
      // Fetch the aggregate for the chosen window; ignore if scope changed meanwhile.
      void repo
        .loadBudget(scope, todayKey())
        .then((summary) => dispatch({ type: 'SET_SCOPE_SUMMARY', summary }))
        .catch((err) => console.error('[today] failed to load budget', err));
    },
    addTask: async (input) => {
      const task = await repo.createTask(input);
      dispatch({ type: 'ADD_TASK', task });
    },
    deferTask: (taskId) => {
      // Keep any live run's time before the task leaves today.
      if (state.timer.runs[taskId]) {
        void repo.updateTask(taskId, { loggedMinutes: committedAfterRun(taskId) });
      }
      dispatch({ type: 'REMOVE_TASK', taskId });
      void repo.deferTask(taskId);
    },
    deleteTask: (taskId) => {
      dispatch({ type: 'REMOVE_TASK', taskId });
      void repo.deleteTask(taskId);
    },
    setStatus: (taskId, status) => {
      const patch: Partial<Pick<Task, 'status' | 'loggedMinutes'>> = { status };
      if (status !== 'in_progress' && state.timer.runs[taskId]) {
        patch.loggedMinutes = committedAfterRun(taskId);
      }
      dispatch({ type: 'SET_STATUS', taskId, status });
      void repo.updateTask(taskId, patch);
    },
    addArea: async (input) => {
      const area = await repo.createArea(input);
      dispatch({ type: 'ADD_AREA', area });
    },
    addTrack: async (input) => {
      const track = await repo.createTrack(input);
      dispatch({ type: 'ADD_TRACK', track });
    },
    updateTrack: async (id, patch) => {
      await repo.updateTrack(id, patch);
      dispatch({ type: 'UPDATE_TRACK', id, patch });
    },
    deleteTrack: (id) => {
      dispatch({ type: 'REMOVE_TRACK', id });
      void repo.deleteTrack(id);
    },
    addGoal: async (input) => {
      const goal = await repo.createGoal(input);
      dispatch({ type: 'ADD_GOAL', goal });
    },
    logInterruption: async (input) => {
      const interruption = await repo.createInterruption(input);
      dispatch({ type: 'ADD_INTERRUPTION', interruption });
    },
    saveReconciliation: async (input) => {
      await repo.saveReconciliation(input);
      dispatch({ type: 'REMOVE_DUE_RECONCILIATION', scope: input.scope, periodKey: input.periodKey });
    },
    setEventDeduct: (seriesKey, deduct) => {
      const ev = state.calendarEvents.find((e) => e.seriesKey === seriesKey);
      dispatch({ type: 'SET_EVENT_DEDUCT', seriesKey, deduct });
      void repo.setSeriesDeduct(seriesKey, deduct, ev?.title);
    },
    reload: () => {
      const day = todayKey();
      void repo.load(day).then((slices) => dispatch({ type: 'HYDRATE', slices })).catch((e) => console.error('[today] reload failed', e));
      void repo.loadDueReconciliations(day).then((due) => dispatch({ type: 'SET_DUE_RECONCILIATIONS', due })).catch(() => {});
      void repo.loadCalendarEvents(day).then((events) => dispatch({ type: 'SET_CALENDAR_EVENTS', events })).catch(() => {});
    },
  };

  return (
    <TodayContext.Provider value={{ state, actions, loading }}>{children}</TodayContext.Provider>
  );
}

export function useToday() {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used within TodayProvider');
  return ctx;
}
