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
  DeadlineType,
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
    day: todayKey(),
    availableMinutes: 360,
    streak: 0,
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
  | { type: 'UPDATE_TASK'; taskId: string; patch: Partial<Task> }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'SET_ESTIMATE'; taskId: string; estimateMinutes: number }
  | { type: 'SET_SCHEDULED_AT'; taskId: string; scheduledAt?: string }
  | { type: 'SET_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'MOVE_TO_TODAY'; taskId: string }
  | { type: 'ADD_AREA'; area: LifeArea }
  | { type: 'ADD_TRACK'; track: FunctionTrack }
  | { type: 'UPDATE_TRACK'; id: string; patch: Partial<Pick<FunctionTrack, 'name' | 'color'>> }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'ADD_GOAL'; goal: Goal }
  | { type: 'ADD_INTERRUPTION'; interruption: Interruption }
  | { type: 'UPDATE_INTERRUPTION'; interruption: Interruption }
  | { type: 'REMOVE_INTERRUPTION'; id: string };

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
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, ...action.patch } : t)),
      };
    case 'REMOVE_TASK': {
      // Commit any live run first so the time isn't lost on defer.
      const base = commitRun(state, action.taskId);
      return { ...base, tasks: base.tasks.filter((t) => t.id !== action.taskId) };
    }
    case 'SET_ESTIMATE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, estimateMinutes: action.estimateMinutes } : t,
        ),
      };
    case 'SET_SCHEDULED_AT':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, scheduledAt: action.scheduledAt } : t,
        ),
      };
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
    case 'MOVE_TO_TODAY':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, day: state.day } : t)),
      };
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
    case 'UPDATE_INTERRUPTION':
      return {
        ...state,
        interruptions: state.interruptions.map((i) =>
          i.id === action.interruption.id ? action.interruption : i,
        ),
      };
    case 'REMOVE_INTERRUPTION':
      return {
        ...state,
        interruptions: state.interruptions.filter((i) => i.id !== action.id),
      };
    default:
      return state;
  }
}

/** The full set of fields the task edit modal can change. null clears a ref/deadline. */
export interface EditTaskInput {
  title: string;
  areaId: string;
  estimateMinutes: number;
  trackId: string | null;
  goalId: string | null;
  day: string;
  dueAt: string | null;
  deadlineType: DeadlineType;
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
  /** Edit an existing task's title, area, track, goal, estimate, day, or deadline. */
  editTask: (taskId: string, input: EditTaskInput) => void;
  /** Add a small end-of-day chore (estimate locked to 5/10/15 by the UI). */
  addChore: (input: { title: string; areaId: string; estimateMinutes: number }) => Promise<void>;
  /** Set the chore-session block size for today, creating the session if absent. */
  setChoreAllocation: (minutes: number) => Promise<void>;
  /** Ensure a chore session exists, then start its timer. Returns nothing. */
  startChores: () => Promise<void>;
  deferTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  moveToToday: (taskId: string) => void;
  setStatus: (taskId: string, status: TaskStatus) => void;
  /** Place a task on the day timeline (HH:MM), or pass null to unschedule it. */
  scheduleTask: (taskId: string, scheduledAt: string | null) => void;
  /** Set a task's planned estimate in minutes (used by timeline resize). */
  setTaskEstimate: (taskId: string, estimateMinutes: number) => void;
  /** Correct the time logged against a task (e.g. fix a completed task's total). */
  adjustLogged: (taskId: string, loggedMinutes: number) => void;
  addArea: (input: CreateAreaInput) => Promise<void>;
  addTrack: (input: CreateTrackInput) => Promise<void>;
  updateTrack: (id: string, patch: Partial<Pick<FunctionTrack, 'name' | 'color'>>) => Promise<void>;
  deleteTrack: (id: string) => void;
  addGoal: (input: CreateGoalInput) => Promise<void>;
  logInterruption: (input: CreateInterruptionInput) => Promise<void>;
  editInterruption: (id: string, input: CreateInterruptionInput) => Promise<void>;
  deleteInterruption: (id: string) => void;
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

  // Midnight crossover: if the wall-clock day moves past the loaded day, reload
  // so finished-day tasks roll into Pending and the budget resets. Checks on a
  // timer and whenever the tab regains focus.
  useEffect(() => {
    function check() {
      if (todayKey() !== state.day) {
        const day = todayKey();
        void repo.load(day).then((slices) => dispatch({ type: 'HYDRATE', slices })).catch(() => {});
        void repo.loadDueReconciliations(day).then((due) => dispatch({ type: 'SET_DUE_RECONCILIATIONS', due })).catch(() => {});
        void repo.loadCalendarEvents(day).then((events) => dispatch({ type: 'SET_CALENDAR_EVENTS', events })).catch(() => {});
      }
    }
    const id = setInterval(check, 30_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [state.day, repo]);

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
    editTask: (taskId, input) => {
      const prev = state.tasks.find((t) => t.id === taskId);
      // Optimistic local patch: a cleared ref/deadline (null) reads as undefined on Task.
      const patch: Partial<Task> = {
        title: input.title,
        areaId: input.areaId,
        estimateMinutes: input.estimateMinutes,
        trackId: input.trackId ?? undefined,
        goalId: input.goalId ?? undefined,
        day: input.day,
        dueAt: input.dueAt ?? undefined,
        deadlineType: input.deadlineType,
      };
      dispatch({ type: 'UPDATE_TASK', taskId, patch });
      // Persist; null reaches the server so it can actually unset the field.
      void repo.updateTask(taskId, input).catch((err) => {
        console.error('[today] failed to edit task', err);
        if (prev) dispatch({ type: 'UPDATE_TASK', taskId, patch: prev });
      });
    },
    addChore: async ({ title, areaId, estimateMinutes }) => {
      // Chores always fall due at end of the shown day; they can overflow like tasks.
      const [y, m, d] = state.day.split('-').map(Number);
      const dueAt = new Date(y, m - 1, d, 23, 59, 0).toISOString();
      const task = await repo.createTask({
        title, areaId, estimateMinutes, kind: 'chore', day: state.day, dueAt, deadlineType: 'soft',
      });
      dispatch({ type: 'ADD_TASK', task });
    },
    setChoreAllocation: async (minutes) => {
      const session = state.tasks.find((t) => t.kind === 'chore_session' && t.day === state.day);
      if (session) {
        dispatch({ type: 'SET_ESTIMATE', taskId: session.id, estimateMinutes: minutes });
        void repo.updateTask(session.id, { estimateMinutes: minutes });
      } else {
        const task = await repo.createTask({
          title: 'Chores', kind: 'chore_session', estimateMinutes: minutes, day: state.day,
        });
        dispatch({ type: 'ADD_TASK', task });
      }
    },
    startChores: async () => {
      let session = state.tasks.find((t) => t.kind === 'chore_session' && t.day === state.day);
      if (!session) {
        session = await repo.createTask({
          title: 'Chores', kind: 'chore_session', estimateMinutes: 60, day: state.day,
        });
        dispatch({ type: 'ADD_TASK', task: session });
      }
      dispatch({ type: 'PLAY', taskId: session.id });
      void repo.updateTask(session.id, { status: 'in_progress' });
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
    moveToToday: (taskId) => {
      dispatch({ type: 'MOVE_TO_TODAY', taskId });
      void repo.updateTask(taskId, { day: state.day });
    },
    scheduleTask: (taskId, scheduledAt) => {
      // null clears the slot; the server stores '' which parses back as unscheduled.
      dispatch({ type: 'SET_SCHEDULED_AT', taskId, scheduledAt: scheduledAt ?? undefined });
      void repo.updateTask(taskId, { scheduledAt: scheduledAt ?? '' });
    },
    setTaskEstimate: (taskId, estimateMinutes) => {
      dispatch({ type: 'SET_ESTIMATE', taskId, estimateMinutes });
      void repo.updateTask(taskId, { estimateMinutes });
    },
    adjustLogged: (taskId, loggedMinutes) => {
      const mins = Math.max(0, loggedMinutes);
      dispatch({ type: 'UPDATE_TASK', taskId, patch: { loggedMinutes: mins } });
      void repo.updateTask(taskId, { loggedMinutes: mins });
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
    editInterruption: async (id, input) => {
      const interruption = await repo.updateInterruption(id, input);
      dispatch({ type: 'UPDATE_INTERRUPTION', interruption });
    },
    deleteInterruption: (id) => {
      dispatch({ type: 'REMOVE_INTERRUPTION', id });
      void repo.deleteInterruption(id);
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
