import { useAuth } from '../../auth/AuthContext';
import { useWallpaper } from '../../wallpaper/WallpaperContext';

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.ceil((days + start.getDay() + 1) / 7);
}

export function TodayHeader({ streakDays }: { streakDays: number }) {
  const { user } = useAuth();
  const { openPicker } = useWallpaper();
  const now = new Date();
  const initial = (user?.name ?? user?.email ?? 'A').charAt(0).toUpperCase();

  return (
    <header className="t-header">
      <div className="t-logo">
        <img className="t-logo-mark" src="/favicon.svg" alt="" />
        <img className="t-logo-word" src="/brand/wordmark.png" alt="Dayforge" />
      </div>
      <div className="t-header-center">
        <div className="t-header-day">{dayLabel(now)}</div>
        <div className="t-header-sub">Week {weekOfYear(now)} · {now.getFullYear()}</div>
      </div>
      <div className="t-header-right">
        <div className="streak-pill">🔥 {streakDays}-day streak</div>
        <button className="wp-btn" type="button" onClick={openPicker}>🎨 Wallpaper</button>
        <div className="t-avatar">{initial}</div>
      </div>
    </header>
  );
}
