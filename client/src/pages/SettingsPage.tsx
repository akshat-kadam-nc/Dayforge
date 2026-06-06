import { useState } from 'react';
import { Placeholder } from '../components/Placeholder';
import { useAuth } from '../auth/AuthContext';
import { useToday } from '../today/useToday';
import { AddVentureModal } from '../components/today/AddVentureModal';
import { TrackManager } from '../components/today/TrackManager';

export function SettingsPage() {
  const { user, logout, isGuest } = useAuth();
  const { state } = useToday();
  const [adding, setAdding] = useState(false);
  const [openArea, setOpenArea] = useState<string | null>(null);

  return (
    <Placeholder title="Settings" emoji="⚙️">
      <p className="muted">
        Signed in as <strong>{user?.email}</strong>
        {isGuest && ' (demo mode — changes are not saved)'}.
      </p>

      <div className="settings-section">
        <div className="settings-section-head">
          <h3>Ventures</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setAdding(true)}>＋ Add</button>
        </div>
        {state.areas.length === 0 ? (
          <p className="muted">No ventures yet. Add one to start organising your day.</p>
        ) : (
          <ul className="venture-settings-list">
            {state.areas.map((a) => {
              const open = openArea === a.id;
              const count = state.tracks.filter((t) => t.areaId === a.id).length;
              return (
                <li key={a.id} className="vs-item">
                  <button
                    type="button"
                    className="vs-head"
                    onClick={() => setOpenArea(open ? null : a.id)}
                  >
                    <span className="vs-icon" style={{ background: `${a.color}1f` }}>{a.icon}</span>
                    <span className="vs-name">{a.name}</span>
                    <span className="vs-tracks-count">{count} track{count === 1 ? '' : 's'}</span>
                    <span className="vs-dot" style={{ background: a.color }} />
                    <span className="vs-chev">{open ? '▾' : '▸'}</span>
                  </button>
                  {open && <TrackManager area={a} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="muted">Wallpaper picker and Google Calendar accounts come later.</p>

      <button className="btn" onClick={logout}>Log out</button>

      {adding && <AddVentureModal onClose={() => setAdding(false)} />}
    </Placeholder>
  );
}
