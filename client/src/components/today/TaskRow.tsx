import { useEffect, useRef, useState } from 'react';
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
  const isBlocked = task.status === 'blocked';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the kebab menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const duration = task.scheduledAt
    ? `${task.scheduledAt} · ${formatMinutes(task.estimateMinutes)}`
    : formatMinutes(task.estimateMinutes);

  return (
    <div className={`task-item${isBlocked ? ' blocked' : ''}`}>
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
          {task.deferredCount > 0 && (
            <span className="tag tag-carry" title={`Carried over ${task.deferredCount}×`}>
              ⤵ {task.deferredCount}×
            </span>
          )}
          {isBlocked && <span className="tag tag-blocked">⛔ Blocked</span>}
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

      <div className="task-menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="task-kebab"
          aria-label="Task actions"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="task-menu" role="menu">
            <button
              type="button"
              onClick={() => {
                actions.deferTask(task.id);
                setMenuOpen(false);
              }}
            >
              ⤵ Defer to tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                actions.setStatus(task.id, isBlocked ? 'not_started' : 'blocked');
                setMenuOpen(false);
              }}
            >
              {isBlocked ? '✅ Unblock' : '⛔ Mark blocked'}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                actions.deleteTask(task.id);
                setMenuOpen(false);
              }}
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
