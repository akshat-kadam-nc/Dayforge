import { useToday } from '../../today/useToday';
import type { Task } from '../../today/types';
import { formatMinutes } from '../../today/format';

export function TaskRow({ task }: { task: Task }) {
  const { state, actions } = useToday();
  const track = task.trackId ? state.tracks.find((t) => t.id === task.trackId) : undefined;
  const goal = task.goalId ? state.goals.find((g) => g.id === task.goalId) : undefined;
  const isDone = task.status === 'done';
  const isActive = state.timer.activeTaskId === task.id;
  const isCalendar = task.source === 'calendar';

  const duration = task.scheduledAt
    ? `${task.scheduledAt} · ${formatMinutes(task.estimateMinutes)}`
    : formatMinutes(task.estimateMinutes);

  return (
    <div className="task-item">
      <button
        type="button"
        className={`task-check${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}
        aria-label={isDone ? 'Mark not done' : 'Mark done'}
        onClick={() => actions.toggleDone(task.id)}
      >
        {isDone ? '✓' : ''}
      </button>

      <div className="task-info">
        <div className={`task-name${isDone ? ' done' : ''}`}>{task.title}</div>
        <div className="task-meta">
          {track && (
            <span className="tag-track" style={{ background: `${track.color}1f`, color: track.color }}>
              {track.name}
            </span>
          )}
          {goal && <span className="tag tag-goal">↗ {goal.text}</span>}
          {isCalendar && <span className="tag tag-cal">📅 Calendar</span>}
          {task.delegateName && <span className="tag tag-deleg">👤 {task.delegateName}</span>}
          <span className="task-dur">{duration}</span>
        </div>
      </div>

      <button
        type="button"
        className={`play-btn${isActive ? ' running' : ''}`}
        aria-label={isActive ? 'Stop timer' : 'Start timer'}
        disabled={isCalendar || isDone}
        onClick={() => (isActive ? actions.stopTimer() : actions.startTimer(task.id))}
      >
        {isActive ? '■' : '▶'}
      </button>
    </div>
  );
}
