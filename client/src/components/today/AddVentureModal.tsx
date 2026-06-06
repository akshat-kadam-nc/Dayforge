import { useState } from 'react';
import { useToday } from '../../today/useToday';

const COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899', '#ef4444', '#eab308', '#3b82f6'];
const ICONS = ['📚', '🤖', '⚡', '💪', '✍️', '🎯', '🧠', '💼', '🎨', '🏠'];

/** Create a LifeArea (venture). Used from the empty state, FAB, and Settings. */
export function AddVentureModal({ onClose }: { onClose: () => void }) {
  const { actions } = useToday();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await actions.addArea({ name: name.trim(), icon, color });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">＋ New venture</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DeveLearn"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
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
          Color
          <div className="swatch-row">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch${color === c ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
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
