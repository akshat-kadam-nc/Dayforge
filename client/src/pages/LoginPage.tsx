import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

// Every image dropped in src/assets/login is bundled and eligible as a login
// backdrop — no manifest to maintain. One is chosen at random per page load.
const LOGIN_BGS = Object.values(
  import.meta.glob('../assets/login/*.{jpg,jpeg,png,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
) as string[];

export function LoginPage() {
  const bg = useMemo(
    () => (LOGIN_BGS.length ? LOGIN_BGS[Math.floor(Math.random() * LOGIN_BGS.length)] : null),
    [],
  );
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
    <div className={`auth-screen${bg ? ' has-bg' : ''}`}>
      {bg && <div className="auth-bg" style={{ backgroundImage: `url(${bg})` }} />}
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
