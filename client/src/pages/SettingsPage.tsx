import { Placeholder } from '../components/Placeholder';
import { useAuth } from '../auth/AuthContext';

export function SettingsPage() {
  const { user, logout } = useAuth();
  return (
    <Placeholder title="Settings" emoji="⚙️">
      <p className="muted">
        Signed in as <strong>{user?.email}</strong>.
      </p>
      <p className="muted">Wallpaper picker, Google Calendar accounts, and life areas live here.</p>
      <button className="btn" onClick={logout}>
        Log out
      </button>
    </Placeholder>
  );
}
