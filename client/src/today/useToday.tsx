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
    timer: { activeTaskId: null, startedAt: null, elapsedSeconds: 0 },
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
  | { type: 'START_TIMER'; taskId: string }
  | { type: 'STOP_TIMER' }
  | { type: 'TOGGLE_DONE'; taskId: string }
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

/** Commit the active run's accrued seconds into a merged TimeLog and clear the timer. */
function commitActiveRun(state: TodayState): TodayState {
  const { activeTaskId, elapsedSeconds } = state.timer;
  if (!activeTaskId) return state;
  const minutes = elapsedSeconds / 60;
  const task = state.tasks.find((t) => t.id === activeTaskId);
  let logs = state.logs;
  if (task && minutes > 0) {
    const existing = logs.find((l) => l.taskId === activeTaskId);
    logs = existing
      ? logs.map((l) => (l.taskId === activeTaskId ? { ...l, minutes: l.minutes + minutes } : l))
      : [...logs, { taskId: activeTaskId, areaId: task.areaId, minutes }];
  }
  return { ...state, logs, timer: { activeTaskId: null, startedAt: null, elapsedSeconds: 0 } };
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
        timer: { activeTaskId: null, startedAt: null, elapsedSeconds: 0 },
      };
    case 'TICK': {
      if (!state.timer.activeTaskId) return state;
      return { ...state, timer: { ...state.timer, elapsedSeconds: state.timer.elapsedSeconds + 1 } };
    }
    case 'START_TIMER': {
      const committed = commitActiveRun(state);
      return {
        ...committed,
        tasks: committed.tasks.map((t) =>
          t.id === action.taskId ? { ...t, status: 'in_progress' } : t,
        ),
        timer: { activeTaskId: action.taskId, startedAt: Date.now(), elapsedSeconds: 0 },
      };
    }
    case 'STOP_TIMER':
      return commitActiveRun(state);
    case 'TOGGLE_DONE': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;
      const base =
        task.status !== 'done' && state.timer.activeTaskId === action.taskId
          ? commitActiveRun(state)
          : state;
      return {
        ...base,
        tasks: base.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, status: t.status === 'done' ? 'not_started' : 'done' }
            : t,
        ),
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
      // Committing first keeps any logged time if the timer was on this task.
      const base = state.timer.activeTaskId === action.taskId ? commitActiveRun(state) : state;
      return { ...base, tasks: base.tasks.filter((t) => t.id !== action.taskId) };
    }
    case 'SET_STATUS': {
      const base =
        action.status !== 'in_progress' && state.timer.activeTaskId === action.taskId
          ? commitActiveRun(state)
          : state;
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
    case 'ADD_INTERRUPTION': {
      // Logging an interruption pauses whatever task is running.
      const paused = commitActiveRun(state);
      return { ...paused, interruptions: [...paused.interruptions, action.interruption] };
    }
    default:
      return state;
  }
}

export interface TodayActions {
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  toggleDone: (taskId: string) => void;
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

  // Tick once a second while a timer is running.
  useEffect(() => {
    if (!state.timer.activeTaskId) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.timer.activeTaskId]);

  // Persist the active run as a TimeLog before it's cleared locally.
  function persistRun() {
    const { activeTaskId, elapsedSeconds } = state.timer;
    if (!activeTaskId || elapsedSeconds <= 0) return;
    const task = state.tasks.find((t) => t.id === activeTaskId);
    if (task) {
      void repo.createTimeLog({ taskId: activeTaskId, areaId: task.areaId, minutes: elapsedSeconds / 60 });
    }
  }

  // Actions are rebuilt each render so they read fresh state (no stale closures).
  const actions: TodayActions = {
    startTimer: (taskId) => {
      persistRun();
      dispatch({ type: 'START_TIMER', taskId });
      void repo.updateTask(taskId, { status: 'in_progress' });
    },
    stopTimer: () => {
      persistRun();
      dispatch({ type: 'STOP_TIMER' });
    },
    toggleDone: (taskId) => {
      const task = state.tasks.find((t) => t.id === taskId);
      const completing = !!task && task.status !== 'done';
      if (completing && state.timer.activeTaskId === taskId) persistRun();
      dispatch({ type: 'TOGGLE_DONE', taskId });
      void repo.updateTask(taskId, { status: completing ? 'done' : 'not_started' });
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
      // Pushing to tomorrow removes it from today; commit any running time first.
      if (state.timer.activeTaskId === taskId) persistRun();
      dispatch({ type: 'REMOVE_TASK', taskId });
      void repo.deferTask(taskId);
    },
    deleteTask: (taskId) => {
      if (state.timer.activeTaskId === taskId) persistRun();
      dispatch({ type: 'REMOVE_TASK', taskId });
      void repo.deleteTask(taskId);
    },
    setStatus: (taskId, status) => {
      if (status !== 'in_progress' && state.timer.activeTaskId === taskId) persistRun();
      dispatch({ type: 'SET_STATUS', taskId, status });
      void repo.updateTask(taskId, { status });
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
      persistRun();
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
