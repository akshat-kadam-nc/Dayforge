import { useEffect, useState } from 'react';
import { useToday } from '../../today/useToday';
import { AddVentureModal } from './AddVentureModal';

export function Fab() {
  const { state, actions } = useToday();
  const [open, setOpen] = useState(false);
  const [needVenture, setNeedVenture] = useState(false);
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(state.areas[0]?.id ?? '');
  const [minutes, setMinutes] = useState(30);

  // Keep the selected venture valid as areas load/change.
  useEffect(() => {
    if (!state.areas.some((a) => a.id === areaId)) setAreaId(state.areas[0]?.id ?? '');
  }, [state.areas, areaId]);

  function openAdd() {
    // A task needs a venture; route to venture creation first if there are none.
    if (state.areas.length === 0) setNeedVenture(true);
    else setOpen(true);
  }

  function submit() {
    if (!title.trim() || !areaId) return;
    void actions.addTask({ title: title.trim(), areaId, estimateMinutes: minutes });
    setTitle('');
    setMinutes(30);
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
