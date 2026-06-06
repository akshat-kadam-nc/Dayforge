import { useState } from 'react';
import { useToday } from '../../today/useToday';
import type { LifeArea } from '../../today/types';

const TRACK_COLORS = ['#1d4ed8', '#0891b2', '#15803d', '#b45309', '#be185d', '#7e22ce', '#475569', '#ea580c'];

/** Add / rename / recolor / delete the function tracks under one venture. */
export function TrackManager({ area }: { area: LifeArea }) {
  const { state, actions } = useToday();
  const tracks = state.tracks.filter((t) => t.areaId === area.id);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TRACK_COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await actions.addTrack({ areaId: area.id, name: name.trim(), color });
      setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="track-manager">
      {tracks.length === 0 ? (
        <p className="muted track-empty">No tracks yet.</p>
      ) : (
        <ul className="track-list">
          {tracks.map((t) => (
            <li key={t.id} className="track-row">
              <button
                type="button"
                className="track-dot"
                style={{ background: t.color }}
                aria-label="Change colour"
                onClick={() => {
                  const next = TRACK_COLORS[(TRACK_COLORS.indexOf(t.color) + 1) % TRACK_COLORS.length];
                  void actions.updateTrack(t.id, { color: next });
                }}
              />
              <input
                className="track-name-input"
                defaultValue={t.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== t.name) void actions.updateTrack(t.id, { name: v });
                  else e.target.value = t.name;
                }}
              />
              <button
                type="button"
                className="track-del"
                aria-label="Delete track"
                onClick={() => actions.deleteTrack(t.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="track-add-row">
        <span className="track-dot-pick">
          {TRACK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch sm${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              aria-label={c}
              onClick={() => setColor(c)}
            />
          ))}
        </span>
        <input
          className="track-name-input"
          value={name}
          placeholder="New track"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={add} disabled={busy}>
          ＋ Add
        </button>
      </div>
    </div>
  );
}
