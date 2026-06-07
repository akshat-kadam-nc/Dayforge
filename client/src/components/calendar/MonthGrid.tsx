import type { LifeArea, CalendarEvent } from '../../today/types';
import type { CalendarDay } from '../../calendar/api';
import { allocationSegments, monthMatrix, todayKey, WEEKDAYS } from '../../calendar/grid';

interface MonthGridProps {
  anchor: string;
  days: CalendarDay[];
  events: CalendarEvent[];
  areas: LifeArea[];
  onSelectDay: (key: string) => void;
}

export function MonthGrid({ anchor, days, events, areas, onSelectDay }: MonthGridProps) {
  const cells = monthMatrix(anchor);
  const today = todayKey();
  const dayMap = new Map(days.map((d) => [d.day, d]));
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.start.slice(0, 10);
    if (!key) continue;
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }

  return (
    <div className="cal-grid-wrap">
      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((cell) => {
          const data = dayMap.get(cell.key);
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const segments = data ? allocationSegments(data, areas) : [];
          const isToday = cell.key === today;
          const shown = dayEvents.slice(0, 2);
          const moreEvents = dayEvents.length - shown.length;
          return (
            <div
              key={cell.key}
              className={`day-cell${cell.otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}
              onClick={() => onSelectDay(cell.key)}
            >
              {data?.overflow && <div className="overflow-flag" title="Overflow: allocated beyond available time" />}
              <div className="day-num">
                {isToday ? <span className="num-today">{cell.dayNum}</span> : <span>{cell.dayNum}</span>}
                {data?.followUp && <span className="fu-dot" title="Delegation follow-up">👥</span>}
              </div>
              {shown.map((e) => (
                <div
                  key={e.id}
                  className="evt"
                  style={{ background: hexToTint(e.color), color: e.color }}
                  title={e.title}
                >
                  {e.title}
                </div>
              ))}
              {moreEvents > 0 && <div className="evt-more">+{moreEvents} more</div>}
              {data && data.completedCount > 0 && (
                <div className="evt-more">✓ {data.completedCount} done</div>
              )}
              {segments.length > 0 && (
                <div className="alloc-bar">
                  {segments.map((s, i) => (
                    <div key={i} className="alloc-seg" style={{ width: `${s.pct}%`, background: s.color }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A translucent fill derived from an account/area hex, for the event chip bg. */
function hexToTint(hex: string): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return 'rgba(124,58,237,0.12)';
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.15)`;
}
