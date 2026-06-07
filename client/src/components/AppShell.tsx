import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
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
  return (
    <div className="app-shell">
      <WallpaperLayer />
      <WallpaperPicker />
      <main className="app-content">{children}</main>
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
