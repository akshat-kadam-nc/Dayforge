import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToday } from '../../today/useToday';
import type { DeadlineType, Task } from '../../today/types';
import { todayKey } from '../../today/repo';

/**
 * Create-or-edit form for a task, shared by the Fab (create) and TaskRow (edit)
 * so the two never drift. Pass `editing` to pre-fill and switch to edit mode.
 */
export function TaskFormModal({ editing, onClose }: { editing?: Task; onClose: () => void }) {
  const { state, actions } = useToday();
  const isEdit = !!editing;

  const initialDue = editing?.dueAt ? new Date(editing.dueAt) : null;
  const pad = (n: number) => String(n).padStart(2, '0');

  const [title, setTitle] = useState(editing?.title ?? '');
  const [areaId, setAreaId] = useState(editing?.areaId || state.areas[0]?.id || '');
  const [trackId, setTrackId] = useState(editing?.trackId ?? '');
  const [goalId, setGoalId] = useState(editing?.goalId ?? '');
  const [minutes, setMinutes] = useState(editing?.estimateMinutes ?? 30);
  const [startDay, setStartDay] = useState(editing?.day ?? todayKey());
  const [dueDate, setDueDate] = useState(
    initialDue ? `${initialDue.getFullYear()}-${pad(initialDue.getMonth() + 1)}-${pad(initialDue.getDate())}` : '',
  );
  const [dueTime, setDueTime] = useState(initialDue ? `${pad(initialDue.getHours())}:${pad(initialDue.getMinutes())}` : '17:00');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>(editing?.deadlineType ?? 'soft');

  const areaTracks = state.tracks.filter((t) => t.areaId === areaId);
  // Link to active weekly goals + any active count goal (e.g. a monthly "blog 4×")
  // in the chosen area, so repetition goals are reachable from the task form.
  const areaGoals = state.goals.filter(
    (g) =>
      g.areaId === areaId &&
      (g.status ?? 'active') === 'active' &&
      (g.period === 'weekly' || g.metric === 'count'),
  );

  // Keep the selected venture valid as areas load/change.
  useEffect(() => {
    if (state.areas.length && !state.areas.some((a) => a.id === areaId)) setAreaId(state.areas[0]?.id ?? '');
  }, [state.areas, areaId]);
  // A track belongs to one venture; clear it whenever it no longer fits the venture.
  useEffect(() => {
    if (trackId && !areaTracks.some((t) => t.id === trackId)) setTrackId('');
  }, [areaTracks, trackId]);
  // Likewise drop a linked goal that doesn't belong to the chosen venture.
  useEffect(() => {
    if (goalId && !areaGoals.some((g) => g.id === goalId)) setGoalId('');
  }, [areaGoals, goalId]);

  // Editing a past-dated task (carried over) must still allow its own day.
  const dayMin = isEdit && startDay < todayKey() ? startDay : todayKey();

  function submit() {
    if (!title.trim() || !areaId) return;
    // Build a local ISO datetime for the deadline if a date was picked.
    const dueAt = dueDate ? new Date(`${dueDate}T${dueTime || '17:00'}`).toISOString() : null;
    if (isEdit && editing) {
      actions.editTask(editing.id, {
        title: title.trim(),
        areaId,
        estimateMinutes: minutes,
        trackId: trackId || null,
        goalId: goalId || null,
        day: startDay,
        dueAt,
        deadlineType: dueAt ? deadlineType : 'soft',
      });
    } else {
      void actions.addTask({
        title: title.trim(),
        areaId,
        estimateMinutes: minutes,
        trackId: trackId || undefined,
        goalId: goalId || undefined,
        day: startDay,
        dueAt: dueAt ?? undefined,
        deadlineType: dueAt ? deadlineType : undefined,
      });
    }
    onClose();
  }

  // Portal to <body> so the fixed overlay escapes any ancestor with transform/
  // backdrop-filter (e.g. a venture block), which would otherwise become its
  // containing block and clip it to that card instead of the viewport.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEdit ? '✎ Edit task' : '＋ New task'}</h2>
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
          Estimate
          <div className="due-row">
            <select
              aria-label="Estimate hours"
              value={Math.floor(minutes / 60)}
              onChange={(e) => setMinutes(Math.max(5, Number(e.target.value) * 60 + (minutes % 60)))}
            >
              {Array.from({ length: 9 }, (_, h) => (
                <option key={h} value={h}>{h} h</option>
              ))}
            </select>
            <select
              aria-label="Estimate minutes"
              value={minutes % 60}
              onChange={(e) => setMinutes(Math.max(5, Math.floor(minutes / 60) * 60 + Number(e.target.value)))}
            >
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                <option key={m} value={m}>{m} m</option>
              ))}
            </select>
          </div>
        </label>
        <label>
          Start day
          <input type="date" value={startDay} min={dayMin} onChange={(e) => setStartDay(e.target.value || todayKey())} />
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
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={submit}>{isEdit ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
