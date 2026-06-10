import { useState } from 'react';
import { Placeholder } from '../components/Placeholder';
import { useAuth } from '../auth/AuthContext';
import { useToday } from '../today/useToday';
import { AddVentureModal } from '../components/today/AddVentureModal';
import { TrackManager } from '../components/today/TrackManager';
import { GoogleAccountsSection } from '../components/GoogleAccountsSection';
import { RoutineModal } from '../components/RoutineModal';
import { changePassword } from '../profile/api';
import { useToast } from '../components/Toast';

const DAY_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

function fmtH(mins: number): string {
  const h = mins / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export function SettingsPage() {
  const { user, logout, isGuest } = useAuth();
  const { state } = useToday();
  const [adding, setAdding] = useState(false);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [editRoutine, setEditRoutine] = useState(false);
  const routine = user?.routine;

  return (
    <Placeholder title="Settings" emoji="⚙️">
      <p className="muted">
        Signed in as <strong>{user?.email}</strong>
        {isGuest && ' (demo mode — changes are not saved)'}.
      </p>

      {!isGuest && (
        <div className="settings-section">
          <div className="settings-section-head">
            <h3>Daily routine</h3>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditRoutine(true)}>
              {routine && user?.onboarded ? 'Edit' : 'Set up'}
            </button>
          </div>
          {routine && user?.onboarded ? (
            <ul className="routine-summary">
              <li><span>Sleep</span><strong>{fmtH(routine.sleepMinutes)}/day</strong></li>
              <li><span>Commute</span><strong>{routine.commuteMinutes}m/day</strong></li>
              <li><span>Work</span><strong>{fmtH(routine.workMinutes)}/working day</strong></li>
              <li>
                <span>Working days</span>
                <strong>{routine.workdays.length ? [...routine.workdays].sort().map((d) => DAY_ABBR[d]).join(' ') : 'none'}</strong>
              </li>
            </ul>
          ) : (
            <p className="muted">Your day is fully open (24h). Set your routine to see real free time.</p>
          )}
        </div>
      )}

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

      {!isGuest && <PasswordSection />}

      <GoogleAccountsSection isGuest={isGuest} />

      <button className="btn" onClick={logout}>Log out</button>

      {adding && <AddVentureModal onClose={() => setAdding(false)} />}
      {editRoutine && <RoutineModal mode="edit" onClose={() => setEditRoutine(false)} />}
    </Placeholder>
  );
}

/** Set a new account password (new + confirm). */
function PasswordSection() {
  const { toast } = useToast();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await changePassword(pwd);
      setPwd('');
      setConfirm('');
      toast('Password updated', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <h3>Password</h3>
      </div>
      <div className="password-form">
        <label>
          New password
          <input
            type="password"
            value={pwd}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            onChange={(e) => setPwd(e.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirm}
            autoComplete="new-password"
            placeholder="Re-enter new password"
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {error && <p className="password-error">{error}</p>}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={submit}
          disabled={busy || !pwd || !confirm}
        >
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </div>
    </div>
  );
}
