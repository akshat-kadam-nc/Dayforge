import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { CHORE_ESTIMATES } from '../../today/types';
import {
  choreSession, activeChores, isCarriedChore, choresPlannedMinutes, choresLoggedMinutes,
  isRunning, taskLoggedSeconds, CHORES_COLOR,
} from '../../today/budget';
import { formatClock, formatMinutes } from '../../today/format';

const ALLOC_OPTIONS = [30, 60, 90];

/**
 * Right-rail Chores card. Chores are small end-of-day items batched into one
 * timed session: set a block of time, start it, and tick chores off a checklist
 * while the timer runs. Time logs to the session (one Chores budget block), not
 * per chore.
 */
export function ChoresCard() {
  const { state, actions } = useToday();
  const session = choreSession(state);
  const chores = activeChores(state);
  const open = chores.filter((c) => c.status !== 'done');
  const done = chores.filter((c) => c.status === 'done');
  const carriedCount = open.filter((c) => isCarriedChore(state, c)).length;
  const planned = choresPlannedMinutes(state);
  const logged = choresLoggedMinutes(state);
  const running = session ? isRunning(state, session.id) : false;
  const sessionDone = session?.status === 'done';
  const colorOf = new Map(state.areas.map((a) => [a.id, a.color]));

  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState('');
  const [est, setEst] = useState<number>(CHORE_ESTIMATES[0]);

  const firstArea = state.areas[0]?.id ?? '';
  const chosenArea = areaId || firstArea;

  function addChore(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !chosenArea) return;
    void actions.addChore({ title: t, areaId: chosenArea, estimateMinutes: est });
    setTitle('');
  }

  return (
    <div className="chores-card">
      <div className="chores-head">
        <span className="chores-title">
          <span className="chores-dot" style={{ background: CHORES_COLOR }} /> Chores
        </span>
        <span className="chores-count">
          {open.length} left{done.length > 0 ? ` · ${done.length} done` : ''}
          {carriedCount > 0 && <span className="chores-carried" title="Carried over from earlier days"> · {carriedCount} carried</span>}
        </span>
      </div>

      {/* Session: allocate a block, then run the timer while ticking chores off. */}
      <div className="chore-session">
        <div className="chore-session-top">
          <span className="chore-session-clock" style={running ? { color: CHORES_COLOR } : undefined}>
            {session ? formatClock(taskLoggedSeconds(state, session)) : '00:00:00'}
          </span>
          <span className="chore-session-meta">
            {formatMinutes(logged)} / {planned > 0 ? formatMinutes(planned) : '—'} planned
          </span>
        </div>

        <div className="chore-alloc">
          {ALLOC_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              className={`chore-alloc-pill${planned === m ? ' active' : ''}`}
              onClick={() => void actions.setChoreAllocation(m)}
            >
              {m}m
            </button>
          ))}
        </div>

        {sessionDone ? (
          <button type="button" className="chore-btn ghost" onClick={() => session && actions.uncomplete(session.id)}>
            ✓ Done for today — reopen
          </button>
        ) : running ? (
          <div className="chore-session-controls">
            <button type="button" className="chore-btn pause" onClick={() => session && actions.pause(session.id)}>⏸ Pause</button>
            <button type="button" className="chore-btn stop" onClick={() => session && actions.stopComplete(session.id)}>⏹ Done</button>
          </div>
        ) : (
          <button type="button" className="chore-btn start" onClick={() => void actions.startChores()}>
            ▶ {session && logged > 0 ? 'Resume chores' : 'Start chores'}
          </button>
        )}
      </div>

      {/* Checklist */}
      <div className="chore-list">
        {chores.length === 0 && <p className="chore-empty">No chores yet. Add the small stuff below.</p>}
        {[...open, ...done].map((c) => (
          <div key={c.id} className={`chore-item${c.status === 'done' ? ' done' : ''}`}>
            <button
              type="button"
              className={`chore-check${c.status === 'done' ? ' checked' : ''}`}
              onClick={() => (c.status === 'done' ? actions.uncomplete(c.id) : actions.setStatus(c.id, 'done'))}
              aria-label={c.status === 'done' ? 'Reopen chore' : 'Complete chore'}
            >
              {c.status === 'done' ? '✓' : ''}
            </button>
            <span className="chore-area-dot" style={{ background: colorOf.get(c.areaId) ?? '#94a3b8' }} />
            <span className="chore-item-title">{c.title}</span>
            {c.status !== 'done' && isCarriedChore(state, c) && (
              <span className="chore-carry" title={`Carried over from ${c.day}`}>↩</span>
            )}
            <span className="chore-item-est">{c.estimateMinutes}m</span>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <form className="chore-add" onSubmit={addChore}>
        <input
          className="chore-add-input"
          placeholder="Add a chore…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="chore-add-row">
          <select className="chore-add-area" value={chosenArea} onChange={(e) => setAreaId(e.target.value)}>
            {state.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
          <div className="chore-est-pills">
            {CHORE_ESTIMATES.map((m) => (
              <button
                key={m}
                type="button"
                className={`chore-est-pill${est === m ? ' active' : ''}`}
                onClick={() => setEst(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <button type="submit" className="chore-add-btn" disabled={!title.trim()}>＋</button>
        </div>
      </form>
    </div>
  );
}
