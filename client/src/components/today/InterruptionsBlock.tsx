import { useState } from 'react';
import { useToday } from '../../today/useToday';
import type { Interruption, InterruptionType } from '../../today/types';
import { interruptedMinutes } from '../../today/budget';
import { formatMinutes } from '../../today/format';
import { InterruptModal } from './InterruptModal';

export const INTERRUPT_ICON: Record<InterruptionType, string> = {
  fire: '🔥',
  rabbit_hole: '🌀',
  distraction: '😵',
};

export function InterruptionsBlock() {
  const { state, actions } = useToday();
  const [editing, setEditing] = useState<Interruption | null>(null);
  if (state.interruptions.length === 0) return null;

  return (
    <div className="interrupt-block">
      <div className="interrupt-head">
        <div className="interrupt-icon">⚡</div>
        <span className="interrupt-title">Interruptions today</span>
        <span className="interrupt-total">
          {state.interruptions.length} · {formatMinutes(interruptedMinutes(state))}
        </span>
      </div>
      {state.interruptions.map((int) => (
        <div key={int.id} className="interrupt-item">
          <span className="int-type-icon">{INTERRUPT_ICON[int.type]}</span>
          <div className="int-info">
            <div className="int-name">{int.title}</div>
            {int.note && <div className="int-note">{int.note}</div>}
          </div>
          <span className="int-dur">{formatMinutes(int.minutes)}</span>
          <button type="button" className="int-act" title="Edit" onClick={() => setEditing(int)}>✎</button>
          <button
            type="button"
            className="int-act danger"
            title="Delete"
            onClick={() => actions.deleteInterruption(int.id)}
          >
            ✕
          </button>
        </div>
      ))}
      {editing && <InterruptModal editing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
