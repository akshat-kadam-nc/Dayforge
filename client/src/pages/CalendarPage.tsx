import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiCalendarRepo, localCalendarRepo, type CalendarRepo } from '../calendar/repo';
import type { CalendarPayload } from '../calendar/api';
import type { CalendarEvent } from '../today/types';
import {
  monthGridRange, monthTitle, shiftMonth, todayKey, parseKey, addDaysKey, weekRangeLabel,
} from '../calendar/grid';
import { getGoogleStatus, type GoogleAccount } from '../google/api';
import { ViewToggle, type CalendarView } from '../components/calendar/ViewToggle';
import { MonthGrid } from '../components/calendar/MonthGrid';
import { DayDetail } from '../components/calendar/DayDetail';
import { CalendarLegend } from '../components/calendar/CalendarLegend';
import { WeekView } from '../components/calendar/WeekView';
import '../styles/today.css';
import '../styles/calendar.css';

export function CalendarPage() {
  const { isGuest } = useAuth();
  const repo: CalendarRepo = isGuest ? localCalendarRepo : apiCalendarRepo;

  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState<string>(todayKey());
  const [selectedDay, setSelectedDay] = useState<string>(todayKey());
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The day-key window to fetch. Month/Day both load the full month grid so the
  // detail and the grid share one payload.
  const range = useMemo(() => monthGridRange(anchor), [anchor]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([repo.load(range.from, range.to), repo.loadEvents(range.from, range.to)])
      .then(([p, ev]) => {
        if (!alive) return;
        setPayload(p);
        setEvents(ev);
      })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load calendar'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repo, range.from, range.to]);

  // Google account legend (real accounts only; silently skip if unconfigured).
  useEffect(() => {
    if (isGuest) return;
    getGoogleStatus().then((s) => setAccounts(s.accounts)).catch(() => setAccounts([]));
  }, [isGuest]);

  function goToday() {
    const t = todayKey();
    setAnchor(t);
    setSelectedDay(t);
  }

  function selectDay(key: string) {
    setSelectedDay(key);
    setAnchor(key);
    setView('day');
  }

  // Prev/next steps by the active unit: month / week / day.
  function step(dir: -1 | 1) {
    if (view === 'month') {
      setAnchor((a) => shiftMonth(a, dir));
    } else if (view === 'week') {
      setAnchor((a) => addDaysKey(a, dir * 7));
    } else {
      const next = addDaysKey(selectedDay, dir);
      setSelectedDay(next);
      setAnchor(next);
    }
  }

  // Keyboard navigation, GCal-style: ←/→ step the active unit, t jumps to today.
  // Ignored while typing in a field so it never hijacks form input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        goToday();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // step/goToday close over view + selectedDay; re-bind when those change.
  }, [view, selectedDay]);

  const dayTasks = payload?.tasks.filter((t) => t.day === selectedDay) ?? [];
  const dayEvents = events.filter((e) => e.start.slice(0, 10) === selectedDay);
  const title = view === 'day'
    ? parseKey(selectedDay).toLocaleDateString([], { month: 'long', day: 'numeric' })
    : view === 'week'
      ? weekRangeLabel(anchor)
      : monthTitle(anchor);

  return (
    <div className="calendar-page">
      <div className="cal-topbar">
        <ViewToggle view={view} onChange={setView} />
        <div className="month-nav">
          <button onClick={() => step(-1)} aria-label="Previous" title="Previous (←)">‹</button>
          <span className="month-title">{title}</span>
          <button onClick={() => step(1)} aria-label="Next" title="Next (→)">›</button>
        </div>
        <button className="today-btn" onClick={goToday} title="Jump to today (T)">Today</button>
        <CalendarLegend accounts={accounts} />
      </div>

      {error && <div className="cal-error">{error}</div>}
      {loading && !payload ? (
        <div className="cal-grid-wrap"><p className="muted" style={{ margin: 'auto' }}>Loading…</p></div>
      ) : view === 'week' ? (
        <WeekView
          anchor={anchor}
          days={payload?.days ?? []}
          tasks={payload?.tasks ?? []}
          events={events}
          areas={payload?.areas ?? []}
          onSelectDay={selectDay}
        />
      ) : view === 'day' ? (
        <DayDetail
          day={selectedDay}
          tasks={dayTasks}
          events={dayEvents}
          areas={payload?.areas ?? []}
        />
      ) : (
        <MonthGrid
          anchor={anchor}
          days={payload?.days ?? []}
          events={events}
          areas={payload?.areas ?? []}
          onSelectDay={selectDay}
        />
      )}
    </div>
  );
}
