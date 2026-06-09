import { useEffect, useState } from 'react';
import {
  disconnectGoogleAccount,
  getGoogleStatus,
  patchGoogleAccount,
  startGoogleConnect,
  type GoogleAccount,
} from '../google/api';

/** Settings block: connect/manage read-only Google Calendar sources. */
export function GoogleAccountsSection({ isGuest }: { isGuest: boolean }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await getGoogleStatus();
      setConfigured(s.configured);
      setAccounts(s.accounts);
    } catch {
      setConfigured(false);
    }
  }

  useEffect(() => {
    if (isGuest) return;
    // Surface the result of an OAuth round trip, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    const reason = params.get('greason');
    if (g === 'connected') setBanner('Google Calendar connected.');
    else if (g === 'error') setBanner(`Could not connect that account.${reason ? ` (${reason})` : ''} Try again.`);
    if (g) window.history.replaceState({}, '', window.location.pathname);
    void refresh();
  }, [isGuest]);

  async function toggle(a: GoogleAccount) {
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)));
    await patchGoogleAccount(a.id, { enabled: !a.enabled });
  }

  async function disconnect(a: GoogleAccount) {
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    await disconnectGoogleAccount(a.id);
  }

  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <h3>Google Calendar</h3>
        {configured && !isGuest && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => void startGoogleConnect()}>
            ＋ Connect
          </button>
        )}
      </div>

      {banner && <p className="g-banner">{banner}</p>}

      {isGuest ? (
        <p className="muted">Sign in with an account to connect Google Calendar.</p>
      ) : configured === null ? (
        <p className="muted">Checking…</p>
      ) : !configured ? (
        <p className="muted">
          Calendar sync isn't set up on this server yet. Add a Google OAuth client to
          <code> server/.env</code> to enable it.
        </p>
      ) : accounts.length === 0 ? (
        <p className="muted">No calendars connected. Connect one to pull events in as fixed blocks.</p>
      ) : (
        <ul className="g-account-list">
          {accounts.map((a) => (
            <li key={a.id} className="g-account">
              <span className="g-dot" style={{ background: a.color }} />
              <span className="g-email">{a.email}</span>
              <button
                type="button"
                className={`g-toggle${a.enabled ? ' on' : ''}`}
                onClick={() => void toggle(a)}
                aria-label={a.enabled ? 'Disable source' : 'Enable source'}
              >
                {a.enabled ? 'On' : 'Off'}
              </button>
              <button type="button" className="g-disconnect" onClick={() => void disconnect(a)}>
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
