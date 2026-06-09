import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { WallpaperLayer } from './WallpaperLayer';
import { WallpaperPicker } from './WallpaperPicker';

const NAV = [
  { to: '/', label: 'Today', icon: '🎯', end: true },
  { to: '/calendar', label: 'Calendar', icon: '🗓️' },
  { to: '/goals', label: 'Goals', icon: '🧭' },
  { to: '/team', label: 'Team', icon: '👥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="app-shell">
      <WallpaperLayer />
      <WallpaperPicker />
      {/* Keyed on the route so each navigation replays the page-enter animation. */}
      <main className="app-content page-enter" key={location.pathname}>
        {children}
      </main>
      <nav className="bottom-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
