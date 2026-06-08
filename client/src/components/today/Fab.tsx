import { useEffect, useState } from 'react';
import { useToday } from '../../today/useToday';
import type { DeadlineType } from '../../today/types';
import { todayKey } from '../../today/repo';
import { AddVentureModal } from './AddVentureModal';

export function Fab() {
  const { state, actions } = useToday();
  const [open, setOpen] = useState(false);
  const [needVenture, setNeedVenture] = useState(false);
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(state.areas[0]?.id ?? '');
  const [trackId, setTrackId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [startDay, setStartDay] = useState(todayKey());
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('soft');

  const areaTracks = state.tracks.filter((t) => t.areaId === areaId);
  // Daily tasks link to weekly goals only; scope the picker to the chosen area.
  const areaGoals = state.goals.filter((g) => g.period === 'weekly' && g.areaId === areaId);

  // Keep the selected venture valid as areas load/change.
  useEffect(() => {
    if (!state.areas.some((a) => a.id === areaId)) setAreaId(state.areas[0]?.id ?? '');
  }, [state.areas, areaId]);

  // A track belongs to one venture; clear it whenever it no longer fits the venture.
  useEffect(() => {
    if (trackId && !areaTracks.some((t) => t.id === trackId)) setTrackId('');
  }, [areaTracks, trackId]);

  // Likewise drop a linked goal that doesn't belong to the chosen venture.
  useEffect(() => {
    if (goalId && !areaGoals.some((g) => g.id === goalId)) setGoalId('');
  }, [areaGoals, goalId]);

  function openAdd() {
    // A task needs a venture; route to venture creation first if there are none.
    if (state.areas.length === 0) setNeedVenture(true);
    else setOpen(true);
  }

  function submit() {
    if (!title.trim() || !areaId) return;
    // Build a local ISO datetime for the deadline if a date was picked.
    const dueAt = dueDate ? new Date(`${dueDate}T${dueTime || '17:00'}`).toISOString() : undefined;
    void actions.addTask({
      title: title.trim(),
      areaId,
      estimateMinutes: minutes,
      trackId: trackId || undefined,
      goalId: goalId || undefined,
      day: startDay,
      dueAt,
      deadlineType: dueAt ? deadlineType : undefined,
    });
    setTitle('');
    setTrackId('');
    setGoalId('');
    setMinutes(30);
    setStartDay(todayKey());
    setDueDate('');
    setDueTime('17:00');
    setDeadlineType('soft');
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="fab" aria-label="Add task" onClick={openAdd}>
        +
      </button>

      {needVenture && <AddVentureModal onClose={() => setNeedVenture(false)} />}

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">＋ New task</h2>
            <label>
              Task
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </label>
            <label>
              Area
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                {state.areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </label>
            {areaTracks.length > 0 && (
              <label>
                Track
                <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                  <option value="">No track</option>
                  {areaTracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            )}
            {areaGoals.length > 0 && (
              <label>
                Weekly goal
                <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">No goal</option>
                  {areaGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.icon} {g.text}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Estimate (minutes)
              <input
                type="number"
                min={5}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(5, Number(e.target.value)))}
              />
            </label>
            <label>
              Start day
              <input type="date" value={startDay} min={todayKey()} onChange={(e) => setStartDay(e.target.value || todayKey())} />
            </label>
            <label>
              Deadline (optional)
              <div className="due-row">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <input type="time" value={dueTime} disabled={!dueDate} onChange={(e) => setDueTime(e.target.value)} />
              </div>
            </label>
            {dueDate && (
              <label>
                Deadline type
                <div className="toggle-pills inline">
                  <button type="button" className={deadlineType === 'soft' ? 'active' : ''} onClick={() => setDeadlineType('soft')}>Soft</button>
                  <button type="button" className={deadlineType === 'hard' ? 'active' : ''} onClick={() => setDeadlineType('hard')}>Hard</button>
                </div>
              </label>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn" onClick={submit}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
