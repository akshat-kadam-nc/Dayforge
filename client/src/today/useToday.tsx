import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { BudgetScope, InterruptionType, TodayState } from './types';
import { makeInitialState } from './seed';

type Action =
  | { type: 'TICK' }
  | { type: 'START_TIMER'; taskId: string }
  | { type: 'STOP_TIMER' }
  | { type: 'TOGGLE_DONE'; taskId: string }
  | { type: 'TOGGLE_AREA'; areaId: string }
  | { type: 'SET_SCOPE'; scope: BudgetScope }
  | { type: 'LOG_INTERRUPTION'; payload: { type: InterruptionType; title: string; note?: string; minutes: number } }
  | { type: 'ADD_TASK'; payload: { title: string; areaId: string; estimateMinutes: number } };

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
    case 'TICK': {
      if (!state.timer.activeTaskId) return state;
      return { ...state, timer: { ...state.timer, elapsedSeconds: state.timer.elapsedSeconds + 1 } };
    }
    case 'START_TIMER': {
      // Commit any current run, then start the new task fresh and mark it in progress.
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
      // Stop the timer first if we're completing the active task.
      const base = task.status !== 'done' && state.timer.activeTaskId === action.taskId
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
      return { ...state, budgetScope: action.scope };
    case 'LOG_INTERRUPTION': {
      // Logging an interruption pauses whatever task is running.
      const paused = commitActiveRun(state);
      return {
        ...paused,
        interruptions: [
          ...paused.interruptions,
          { id: `i${Date.now()}`, ...action.payload },
        ],
      };
    }
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: `t${Date.now()}`,
            title: action.payload.title,
            areaId: action.payload.areaId,
            estimateMinutes: action.payload.estimateMinutes,
            status: 'not_started',
            source: 'manual',
          },
        ],
      };
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
  logInterruption: (p: { type: InterruptionType; title: string; note?: string; minutes: number }) => void;
  addTask: (p: { title: string; areaId: string; estimateMinutes: number }) => void;
}

const TodayContext = createContext<{ state: TodayState; actions: TodayActions } | null>(null);

export function TodayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  // Tick once a second while a timer is running.
  useEffect(() => {
    if (!state.timer.activeTaskId) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.timer.activeTaskId]);

  const actions = useMemo<TodayActions>(
    () => ({
      startTimer: (taskId) => dispatch({ type: 'START_TIMER', taskId }),
      stopTimer: () => dispatch({ type: 'STOP_TIMER' }),
      toggleDone: (taskId) => dispatch({ type: 'TOGGLE_DONE', taskId }),
      toggleArea: (areaId) => dispatch({ type: 'TOGGLE_AREA', areaId }),
      setScope: (scope) => dispatch({ type: 'SET_SCOPE', scope }),
      logInterruption: (p) => dispatch({ type: 'LOG_INTERRUPTION', payload: p }),
      addTask: (p) => dispatch({ type: 'ADD_TASK', payload: p }),
    }),
    [],
  );

  return <TodayContext.Provider value={{ state, actions }}>{children}</TodayContext.Provider>;
}

export function useToday() {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used within TodayProvider');
  return ctx;
}
