import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

// Every image dropped in src/assets/login is bundled and eligible as a login
// backdrop — no manifest to maintain. They cross-fade on a slow timer.
const LOGIN_BGS = Object.values(
  import.meta.glob('../assets/login/*.{jpg,jpeg,png,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
) as string[];

const FADE_MS = 9000;

export function LoginPage() {
  // Randomise the starting frame so two loads rarely open on the same image.
  const start = useMemo(
    () => (LOGIN_BGS.length ? Math.floor(Math.random() * LOGIN_BGS.length) : 0),
    [],
  );
  const [active, setActive] = useState(start);

  useEffect(() => {
    if (LOGIN_BGS.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % LOGIN_BGS.length),
      FADE_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const { login, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-screen${LOGIN_BGS.length ? ' has-bg' : ''}`}>
      {LOGIN_BGS.length > 0 && (
        <div className="auth-bg" aria-hidden="true">
          {LOGIN_BGS.map((src, i) => (
            <div
              key={src}
              className={`auth-bg-layer${i === active ? ' is-active' : ''}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
          <div className="auth-scrim" />
        </div>
      )}
      <form className="glass-card auth-card" onSubmit={onSubmit}>
        <div className="brand">
          <img className="brand-mark-img" src="/favicon.svg" alt="" />
          <img className="brand-wordmark" src="/brand/wordmark.png" alt="Dayforge" />
        </div>
        <p className="muted">Know where your time actually goes.</p>

        {mode === 'register' && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
        </button>

        <div className="auth-divider"><span>or</span></div>
        <button type="button" className="link-btn" onClick={continueAsGuest}>
          Explore in demo mode (no account)
        </button>
      </form>
    </div>
  );
}
