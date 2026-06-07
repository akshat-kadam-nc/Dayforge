import { useRef, useState } from 'react';
import { useToday } from '../../today/useToday';
import type { Task } from '../../today/types';
import { formatClock, formatMinutes } from '../../today/format';
import { isRunning, taskLoggedSeconds } from '../../today/budget';
import { PortalMenu } from './PortalMenu';

export function TaskRow({ task }: { task: Task }) {
  const { state, actions } = useToday();
  const track = task.trackId ? state.tracks.find((t) => t.id === task.trackId) : undefined;
  const goal = task.goalId ? state.goals.find((g) => g.id === task.goalId) : undefined;
  const isDone = task.status === 'done';
  const running = isRunning(state, task.id);
  const isCalendar = task.source === 'calendar';
  const isBlocked = task.status === 'blocked';

  const loggedSecs = taskLoggedSeconds(state, task);
  const showClock = loggedSecs > 0 || running;
  const gained = task.estimateMinutes - task.loggedMinutes; // for done tasks
  const isToday = task.day === state.day;
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = !!due && !isDone && due.getTime() < Date.now();
  const dueLabel = due
    ? due.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  const [menuOpen, setMenuOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [customMin, setCustomMin] = useState(task.estimateMinutes || 30);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);

  const schedule = task.scheduledAt ? `${task.scheduledAt} · ` : '';

  function onCheck() {
    if (isDone) actions.uncomplete(task.id);
    else setCompleteOpen(true);
  }

  return (
    <div className={`task-item${isBlocked ? ' blocked' : ''}${running ? ' running-row' : ''}`}>
      <button
        ref={checkRef}
        type="button"
        className={`task-check${isDone ? ' done' : ''}${running ? ' active' : ''}`}
        aria-label={isDone ? 'Reopen task' : 'Complete task'}
        onClick={onCheck}
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
          {due && (
            <span
              className={`tag ${overdue ? (task.deadlineType === 'hard' ? 'tag-overdue-hard' : 'tag-overdue-soft') : 'tag-due'}`}
              title={`${task.deadlineType === 'hard' ? 'Hard' : 'Soft'} deadline`}
            >
              {overdue ? '⚠ ' : '⏳ '}{dueLabel}{task.deadlineType === 'hard' ? ' · hard' : ''}
            </span>
          )}
          {goal && <span className="tag tag-goal">↗ {goal.text}</span>}
          {isCalendar && <span className="tag tag-cal">📅 Calendar</span>}
          {task.delegateName && <span className="tag tag-deleg">👤 {task.delegateName}</span>}
          <span className="task-dur">
            {schedule}
            {showClock && (
              <>
                <span className={running ? 'logged-live' : ''}>{formatClock(loggedSecs)}</span>
                {' / '}
              </>
            )}
            {formatMinutes(task.estimateMinutes)}
          </span>
          {isDone && task.estimateMinutes > 0 && (
            <span className={`tag ${gained >= 0 ? 'tag-gain' : 'tag-loss'}`}>
              {gained >= 0 ? `+${formatMinutes(gained)} gained` : `${formatMinutes(-gained)} over`}
            </span>
          )}
        </div>
      </div>

      {/* Timer controls: Play, or Pause + Stop&Complete while running. */}
      {!isCalendar && !isDone && (
        running ? (
          <>
            <button
              type="button"
              className="play-btn pause"
              aria-label="Pause"
              title="Pause (keep logged time)"
              onClick={() => actions.pause(task.id)}
            >
              ⏸
            </button>
            <button
              type="button"
              className="play-btn stop-complete"
              aria-label="Stop and complete"
              title="Stop & complete"
              onClick={() => actions.stopComplete(task.id)}
            >
              ⏹
            </button>
          </>
        ) : (
          <button
            type="button"
            className="play-btn"
            aria-label="Start timer"
            onClick={() => actions.play(task.id)}
          >
            ▶
          </button>
        )
      )}

      <button
        ref={kebabRef}
        type="button"
        className="task-kebab"
        aria-label="Task actions"
        onClick={() => setMenuOpen((v) => !v)}
      >
        ⋯
      </button>

      <PortalMenu anchorRef={kebabRef} open={menuOpen} onClose={() => setMenuOpen(false)}>
        {!isToday && (
          <button type="button" onClick={() => { actions.moveToToday(task.id); setMenuOpen(false); }}>
            📅 Move to today
          </button>
        )}
        <button type="button" onClick={() => { actions.deferTask(task.id); setMenuOpen(false); }}>
          ⤵ Defer to tomorrow
        </button>
        <button
          type="button"
          onClick={() => { actions.setStatus(task.id, isBlocked ? 'not_started' : 'blocked'); setMenuOpen(false); }}
        >
          {isBlocked ? '✅ Unblock' : '⛔ Mark blocked'}
        </button>
        <button type="button" className="danger" onClick={() => { actions.deleteTask(task.id); setMenuOpen(false); }}>
          🗑 Delete
        </button>
      </PortalMenu>

      {/* Complete-with-logging chooser, opened from the checkbox. */}
      <PortalMenu anchorRef={checkRef} open={completeOpen} onClose={() => setCompleteOpen(false)} align="left">
        <div className="pm-label">Log time for this task</div>
        <button
          type="button"
          onClick={() => { actions.completeWithLog(task.id, 'allocated'); setCompleteOpen(false); }}
        >
          ✓ Log allocated ({formatMinutes(task.estimateMinutes)})
        </button>
        <div className="pm-custom">
          <input
            type="number"
            min={0}
            step={5}
            value={customMin}
            onChange={(e) => setCustomMin(Math.max(0, Number(e.target.value)))}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => { actions.completeWithLog(task.id, 'custom', customMin); setCompleteOpen(false); }}
          >
            Log custom
          </button>
        </div>
        <button
          type="button"
          onClick={() => { actions.completeWithLog(task.id, 'none'); setCompleteOpen(false); }}
        >
          ∅ Don't log time
        </button>
      </PortalMenu>
    </div>
  );
}
