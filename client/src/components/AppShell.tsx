import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { WallpaperLayer } from './WallpaperLayer';
import { WallpaperPicker } from './WallpaperPicker';
import { ErrorBoundary } from './ErrorBoundary';
import { avatarDataUri } from '../profile/avatars';

const NAV = [
  { to: '/', label: 'Today', icon: '🎯', end: true },
  { to: '/calendar', label: 'Calendar', icon: '🗓️' },
  { to: '/goals', label: 'Goals', icon: '🧭' },
  { to: '/team', label: 'Team', icon: '👥' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const COLLAPSE_KEY = 'dayforge.nav.collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  // Default to the collapsed icon-rail. Click-toggle only (no hover expand).
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) !== '0');
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }
  const closeMobile = () => setMobileOpen(false);

  const name = user?.name ?? user?.email ?? 'You';
  const initial = name.charAt(0).toUpperCase();
  const avatarUri = avatarDataUri(user?.avatar);

  const shellClass = [
    'app-shell',
    collapsed ? 'nav-collapsed' : 'nav-open',
    mobileOpen ? 'nav-mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <WallpaperLayer />
      <WallpaperPicker />

      {/* Mobile-only: opens the rail as an overlay drawer. */}
      <button
        type="button"
        className="nav-burger"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>
      <div className="nav-backdrop" onClick={closeMobile} aria-hidden="true" />

      <nav className={`side-nav${collapsed ? ' collapsed' : ''}`} aria-label="Primary">
        <div className="side-top">
          <img className="side-mark" src="/favicon.svg" alt="" />
          <img className="side-word" src="/brand/wordmark.png" alt="Dayforge" />
          <button
            type="button"
            className="side-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="side-items">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMobile}
              className={({ isActive }) => `side-item${isActive ? ' active' : ''}`}
              title={item.label}
            >
              <span className="side-ic">{item.icon}</span>
              <span className="side-lbl">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="side-foot">
          <div className="side-avatar">
            {avatarUri ? <img src={avatarUri} alt="" /> : initial}
          </div>
          <div className="side-who">
            <b>{user?.name ?? 'You'}</b>
            <span>{user?.email}</span>
          </div>
        </div>
      </nav>

      {/* Keyed on the route so each navigation replays the page-enter animation.
          The ErrorBoundary keeps a single page's crash from blanking the whole
          app — and shows the real error instead of a white screen. */}
      <main className="app-content page-enter" key={location.pathname}>
        <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
