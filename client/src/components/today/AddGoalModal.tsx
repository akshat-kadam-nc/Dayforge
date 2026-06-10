import { useState } from 'react';
import { useToday } from '../../today/useToday';

const ICONS = ['🎯', '📚', '🤖', '✍️', '💪', '🚀', '📈', '🏆'];

/** Create a weekly Goal tied to a venture. */
export function AddGoalModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useToday();
  const [text, setText] = useState('');
  const [areaId, setAreaId] = useState(state.areas[0]?.id ?? '');
  const [icon, setIcon] = useState(ICONS[0]);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);

  const area = state.areas.find((a) => a.id === areaId);

  async function submit() {
    if (!text.trim() || !areaId || busy) return;
    setBusy(true);
    try {
      await actions.addGoal({ areaId, text: text.trim(), icon, pct, color: area?.color ?? '#8b5cf6' });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">＋ New goal</h2>
        <label>
          Goal
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Ship v1.2 to production"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label>
          Venture
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            {state.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </label>
        <label>
          Icon
          <div className="swatch-row">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                className={`icon-swatch${icon === i ? ' selected' : ''}`}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </label>
        <label>
          Progress: {pct}%
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
