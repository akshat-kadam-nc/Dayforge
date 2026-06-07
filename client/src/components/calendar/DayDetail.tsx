import { Link } from 'react-router-dom';
import type { CalendarEvent, LifeArea, Task } from '../../today/types';
import { formatMinutes } from '../../today/format';
import { parseKey, todayKey } from '../../calendar/grid';

interface DayDetailProps {
  day: string;
  tasks: Task[];
  events: CalendarEvent[];
  areas: LifeArea[];
}

function fmtClock(min: number): string {
  const s = Math.max(0, Math.round(min)) * 60;
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

function longDate(key: string): string {
  return parseKey(key).toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function DayDetail({ day, tasks, events, areas }: DayDetailProps) {
  const isToday = day === todayKey();
  const areaOf = new Map(areas.map((a) => [a.id, a]));
  const completed = tasks.filter((t) => t.status === 'done');
  const planned = tasks.filter((t) => t.status !== 'done');
  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);

  return (
    <div className="day-detail">
      <div className="day-detail-head">
        <h2>{longDate(day)}</h2>
        {isToday && <Link to="/" className="open-today-btn">Open in Today →</Link>}
      </div>

      <section className="dd-section">
        <h3>Events</h3>
        {events.length === 0 ? (
          <p className="muted">No calendar events.</p>
        ) : (
          <div className="dd-events">
            {timed.map((e) => (
              <div key={e.id} className="dd-event" style={{ borderColor: e.color }}>
                <span className="dd-event-dot" style={{ background: e.color }} />
                <span className="dd-event-title">{e.title}</span>
                <span className="dd-event-time">{e.start.slice(11, 16)} · {formatMinutes(e.durationMinutes)}</span>
              </div>
            ))}
            {allDay.map((e) => (
              <div key={e.id} className="dd-event" style={{ borderColor: e.color }}>
                <span className="dd-event-dot" style={{ background: e.color }} />
                <span className="dd-event-title">{e.title}</span>
                <span className="dd-event-time">All day</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dd-section">
        <h3>Completed ({completed.length})</h3>
        {completed.length === 0 ? (
          <p className="muted">Nothing completed this day.</p>
        ) : (
          <div className="fold-table">
            <div className="fold-row fold-header">
              <span className="fold-name">Task</span>
              <span className="fold-col">Area</span>
              <span className="fold-col">Logged</span>
              <span className="fold-col">Δ vs plan</span>
            </div>
            {completed.map((t) => {
              const gained = t.estimateMinutes - t.loggedMinutes;
              const area = areaOf.get(t.areaId);
              return (
                <div key={t.id} className="fold-row">
                  <span className="fold-name">✓ {t.title}</span>
                  <span className="fold-col" style={{ color: area?.color }}>{area?.icon} {area?.name ?? '—'}</span>
                  <span className="fold-col">{fmtClock(t.loggedMinutes)}</span>
                  <span className="fold-col">
                    {t.estimateMinutes > 0 ? (
                      <span className={gained >= 0 ? 'fold-gain' : 'fold-loss'}>
                        {gained >= 0 ? `+${formatMinutes(gained)}` : `−${formatMinutes(-gained)}`}
                      </span>
                    ) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {planned.length > 0 && (
        <section className="dd-section">
          <h3>Planned ({planned.length})</h3>
          <div className="dd-planned">
            {planned.map((t) => {
              const area = areaOf.get(t.areaId);
              return (
                <div key={t.id} className="dd-task">
                  <span className="dd-task-dot" style={{ background: area?.color ?? '#94a3b8' }} />
                  <span className="dd-task-title">{t.title}</span>
                  {t.delegateName && <span className="dd-task-tag">👥 {t.delegateName}</span>}
                  <span className="dd-task-est">{formatMinutes(t.estimateMinutes)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
