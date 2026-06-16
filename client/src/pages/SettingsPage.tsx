import { useState } from 'react';
import { Placeholder } from '../components/Placeholder';
import { useAuth } from '../auth/AuthContext';
import { useToday } from '../today/useToday';
import { useWallpaper, SHUFFLE_INTERVALS } from '../wallpaper/WallpaperContext';
import { PHOTO_URL, isPhotoId } from '../wallpaper/photos';
import { AddVentureModal } from '../components/today/AddVentureModal';
import { TrackManager } from '../components/today/TrackManager';
import { GoogleAccountsSection } from '../components/GoogleAccountsSection';
import { RoutineModal } from '../components/RoutineModal';
import { changePassword, saveAvatar } from '../profile/api';
import {
  AVATAR_PRESETS,
  AVATAR_BG_OPTIONS,
  DEFAULT_AVATAR_BG,
  avatarDataUri,
  parseAvatar,
  buildAvatar,
} from '../profile/avatars';
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

      <AvatarSection />

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

      <WallpaperSection />

      {!isGuest && <PasswordSection />}

      <GoogleAccountsSection isGuest={isGuest} />

      <button className="btn" onClick={logout}>Log out</button>

      {adding && <AddVentureModal onClose={() => setAdding(false)} />}
      {editRoutine && <RoutineModal mode="edit" onClose={() => setEditRoutine(false)} />}
    </Placeholder>
  );
}

/** Pick a profile avatar from a curated DiceBear grid. Saved to the account
 *  (or local-only in demo mode). */
function AvatarSection() {
  const { user, isGuest, updateUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const current = user?.avatar ?? '';
  const parsed = parseAvatar(current);
  const currentUri = avatarDataUri(current);
  const initial = (user?.name ?? user?.email ?? 'You').charAt(0).toUpperCase();

  // The background applies to whichever avatar is (or will be) chosen. Track it
  // separately so picking a color before an avatar still takes effect.
  const [bg, setBg] = useState(parsed?.bg ?? DEFAULT_AVATAR_BG);

  // The seed half of the currently selected preset, for highlighting the grid
  // regardless of the chosen background.
  const currentKey = parsed ? `${parsed.style}:${parsed.seed}` : '';

  async function persist(next: string) {
    if (isGuest) {
      updateUser({ avatar: next });
      toast('Demo mode — avatar not saved.', 'info');
      return;
    }
    setBusy(true);
    try {
      const res = await saveAvatar(next);
      updateUser({ avatar: res.avatar });
      toast(res.avatar ? 'Avatar updated.' : 'Avatar cleared.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save avatar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  // Pick a preset (tap the current one again to clear it), keeping the chosen bg.
  function chooseAvatar(presetKey: string) {
    if (busy) return;
    if (presetKey === currentKey) {
      void persist('');
      return;
    }
    const [style, seed] = presetKey.split(':');
    void persist(buildAvatar(style, seed, bg));
  }

  // Change the background; re-save the current avatar with it if one is set.
  function chooseBg(id: string) {
    if (busy) return;
    setBg(id);
    if (parsed) void persist(buildAvatar(parsed.style, parsed.seed, id));
  }

  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <h3>Avatar</h3>
      </div>
      <div className="avatar-current-row">
        <div className="avatar-current">
          {currentUri ? <img src={currentUri} alt="Current avatar" /> : <span>{initial}</span>}
        </div>
        <p className="muted">Pick an avatar. Tap your current one again to clear it.</p>
      </div>
      <div className="avatar-grid">
        {AVATAR_PRESETS.map((presetKey) => {
          const uri = avatarDataUri(buildAvatar(...(presetKey.split(':') as [string, string]), bg));
          if (!uri) return null;
          return (
            <button
              key={presetKey}
              type="button"
              className={`avatar-option${presetKey === currentKey ? ' selected' : ''}`}
              onClick={() => chooseAvatar(presetKey)}
              disabled={busy}
              aria-pressed={presetKey === currentKey}
            >
              <img src={uri} alt="" />
            </button>
          );
        })}
      </div>
      <div className="avatar-bg-label muted">Background</div>
      <div className="avatar-bg-row">
        {AVATAR_BG_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`avatar-bg-swatch${bg === o.id ? ' selected' : ''}`}
            style={{ background: `#${o.id}` }}
            onClick={() => chooseBg(o.id)}
            disabled={busy}
            title={o.label}
            aria-label={o.label}
            aria-pressed={bg === o.id}
          />
        ))}
      </div>
    </div>
  );
}

/** Wallpaper: a live preview, the picker trigger, and the timed-shuffle switch. */
function WallpaperSection() {
  const { applied, openPicker, shuffle, setShuffle, shuffleMs, setShuffleMs } = useWallpaper();
  const photoUrl = isPhotoId(applied.wp) ? PHOTO_URL[applied.wp] : undefined;
  const imageUrl = applied.image ?? photoUrl;
  const previewStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  // A gradient preset has no image; show it via its preset class for the swatch.
  const previewClass = `wp-setting-preview${imageUrl ? '' : ` ${applied.wp}`}`;

  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <h3>Wallpaper</h3>
        <button type="button" className="btn-ghost btn-sm" onClick={openPicker}>Change</button>
      </div>
      <div className="wp-setting-row">
        <div className={previewClass} style={previewStyle} aria-hidden />
        <div className="wp-setting-main">
          <div className="wp-setting-toggle">
            <div>
              <div className="wp-setting-toggle-label">Shuffle wallpapers</div>
              <p className="muted wp-setting-hint">Rotate through your photo wallpapers automatically.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shuffle}
              className={`switch${shuffle ? ' on' : ''}`}
              onClick={() => setShuffle(!shuffle)}
            >
              <span className="switch-knob" />
            </button>
          </div>
          {shuffle && (
            <label className="wp-setting-interval">
              <span>Change every</span>
              <select
                value={shuffleMs}
                onChange={(e) => setShuffleMs(Number(e.target.value))}
              >
                {SHUFFLE_INTERVALS.map((o) => (
                  <option key={o.ms} value={o.ms}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </div>
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
