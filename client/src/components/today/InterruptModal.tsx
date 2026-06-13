import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToday } from '../../today/useToday';
import type { Interruption, InterruptionType } from '../../today/types';
import { INTERRUPT_ICON } from './InterruptionsBlock';

const TYPES: { type: InterruptionType; label: string }[] = [
  { type: 'fire', label: 'Fire' },
  { type: 'rabbit_hole', label: 'Rabbit Hole' },
  { type: 'distraction', label: 'Distraction' },
];

/** Logs a one-tap interruption, or edits an existing one when `editing` is set. */
export function InterruptModal({ editing, onClose }: { editing?: Interruption; onClose: () => void }) {
  const { actions } = useToday();
  const [type, setType] = useState<InterruptionType>(editing?.type ?? 'fire');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [minutes, setMinutes] = useState(editing?.minutes ?? 15);

  function submit() {
    const input = {
      type,
      title: title.trim() || TYPES.find((t) => t.type === type)!.label,
      note: note.trim() || undefined,
      minutes,
    };
    if (editing) void actions.editInterruption(editing.id, input);
    else void actions.logInterruption(input);
    onClose();
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? '✎ Edit interruption' : '⚡ Log interruption'}</h2>

        <div className="int-type-picker">
          {TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              className={`int-type-btn${type === t.type ? ' selected' : ''}`}
              onClick={() => setType(t.type)}
            >
              <span className="int-type-emoji">{INTERRUPT_ICON[t.type]}</span>
              {t.label}
            </button>
          ))}
        </div>

        <label>
          What pulled you away?
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" autoFocus />
        </label>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Minutes
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))}
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={submit}>{editing ? 'Save' : 'Log it'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
