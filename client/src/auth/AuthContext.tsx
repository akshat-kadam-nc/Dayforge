import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True when the session is a local demo (no backend, no token). */
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
}

const GUEST_USER: User = { id: 'guest', email: 'demo@axiom.local', name: 'Akshu' };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // On boot, if a token exists, try to resolve the current user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleAuth(path: string, body: Record<string, unknown>) {
    const res = await api<{ token: string; user: User }>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setToken(res.token);
    setUser(res.user);
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isGuest,
      continueAsGuest: () => {
        setIsGuest(true);
        setUser(GUEST_USER);
      },
      login: (email, password) => handleAuth('/auth/login', { email, password }),
      register: (email, password, name) =>
        handleAuth('/auth/register', { email, password, name }),
      logout: () => {
        setToken(null);
        setUser(null);
        setIsGuest(false);
      },
    }),
    [user, loading, isGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
