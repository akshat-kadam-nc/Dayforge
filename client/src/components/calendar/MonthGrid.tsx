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

// A series shown on at least this many distinct days in the window reads as a
// background routine (daily standup etc.) and gets quieted to a dot.
const RECURRING_DAY_THRESHOLD = 5;

export function MonthGrid({ anchor, days, events, areas, onSelectDay }: MonthGridProps) {
  const cells = monthMatrix(anchor);
  const today = todayKey();
  const dayMap = new Map(days.map((d) => [d.day, d]));
  const colorOf = new Map(areas.map((a) => [a.id, a.color]));

  // Count distinct days each series spans, so frequent recurrences can be quieted.
  const seriesDays = new Map<string, Set<string>>();
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.start.slice(0, 10);
    if (!key) continue;
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
    const set = seriesDays.get(e.seriesKey) ?? new Set<string>();
    set.add(key);
    seriesDays.set(e.seriesKey, set);
  }
  const isRecurring = (e: CalendarEvent) =>
    (seriesDays.get(e.seriesKey)?.size ?? 0) >= RECURRING_DAY_THRESHOLD;

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
          const recurring = dayEvents.filter(isRecurring);
          const oneOff = dayEvents.filter((e) => !isRecurring(e));
          const segments = data ? allocationSegments(data, areas) : [];
          const isToday = cell.key === today;
          const shown = oneOff.slice(0, 3);
          const moreEvents = oneOff.length - shown.length;

          // Tint the cell toward its dominant life-area so the month reads as
          // colored blocks rather than gray text. Today keeps its accent style.
          const dominant = data?.perArea?.length
            ? [...data.perArea].sort((a, b) => b.minutes - a.minutes)[0]
            : null;
          const tint = !isToday && dominant
            ? hexToTint(colorOf.get(dominant.areaId) ?? '#94a3b8', cell.otherMonth ? 0.05 : 0.1)
            : undefined;

          return (
            <div
              key={cell.key}
              className={`day-cell${cell.otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}
              style={tint ? { background: tint } : undefined}
              onClick={() => onSelectDay(cell.key)}
            >
              {data?.overflow && <div className="overflow-flag" title="Overflow: allocated beyond available time" />}
              <div className="day-num">
                {isToday ? <span className="num-today">{cell.dayNum}</span> : <span>{cell.dayNum}</span>}
                <span className="day-num-marks">
                  {recurring.length > 0 && (
                    <span className="recur-dots" title={recurring.map((e) => e.title).join('\n')}>
                      {recurring.slice(0, 4).map((e) => (
                        <span key={e.id} className="recur-dot" style={{ background: e.color }} />
                      ))}
                    </span>
                  )}
                  {data?.followUp && <span className="fu-dot" title="Delegation follow-up">👥</span>}
                </span>
              </div>
              {shown.map((e) => (
                <div
                  key={e.id}
                  className="evt"
                  style={{ background: hexToTint(e.color, 0.16), color: e.color }}
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

/** A translucent fill derived from an account/area hex. */
function hexToTint(hex: string, alpha = 0.15): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return `rgba(124,58,237,${alpha})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
