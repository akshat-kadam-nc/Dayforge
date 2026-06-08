import type { CalendarEvent, LifeArea, Task } from '../../today/types';
import type { CalendarDay } from '../../calendar/api';
import { formatMinutes } from '../../today/format';
import { allocationSegments, parseKey, todayKey, weekDays } from '../../calendar/grid';

interface WeekViewProps {
  anchor: string;
  days: CalendarDay[];
  tasks: Task[];
  events: CalendarEvent[];
  areas: LifeArea[];
  onSelectDay: (key: string) => void;
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekView({ anchor, days, tasks, events, areas, onSelectDay }: WeekViewProps) {
  const keys = weekDays(anchor);
  const today = todayKey();
  const dayMap = new Map(days.map((d) => [d.day, d]));
  const colorOf = new Map(areas.map((a) => [a.id, a.color]));

  return (
    <div className="cal-grid-wrap week-wrap">
      <div className="week-cols">
        {keys.map((key, i) => {
          const data = dayMap.get(key);
          const dayTasks = tasks.filter((t) => t.day === key);
          const dayEvents = events.filter((e) => e.start.slice(0, 10) === key);
          const segments = data ? allocationSegments(data, areas) : [];
          const isToday = key === today;
          const dnum = parseKey(key).getDate();
          return (
            <div key={key} className={`week-col${isToday ? ' today' : ''}`}>
              <button className="week-col-head" onClick={() => onSelectDay(key)}>
                <span className="week-col-wd">{WD[i]}</span>
                <span className={`week-col-num${isToday ? ' num-today' : ''}`}>{dnum}</span>
                {data?.overflow && <span className="week-col-flag" title="Overflow">⚠️</span>}
                {data?.followUp && <span className="fu-dot" title="Follow-up">👥</span>}
              </button>

              {data && (
                <div className="week-col-meta">
                  <div className="alloc-bar">
                    {segments.map((s, j) => (
                      <div key={j} className="alloc-seg" style={{ width: `${s.pct}%`, background: s.color }} />
                    ))}
                  </div>
                  <span className="week-col-mins">
                    {formatMinutes(data.allocated)} / {formatMinutes(data.availableMinutes)}
                  </span>
                </div>
              )}

              <div className="week-col-body">
                {dayEvents.map((e) => (
                  <div key={e.id} className="week-item event" style={{ borderColor: e.color }} title={e.title}>
                    <span className="week-item-time">{e.allDay ? 'all day' : e.start.slice(11, 16)}</span>
                    <span className="week-item-title">{e.title}</span>
                  </div>
                ))}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`week-item task${t.status === 'done' ? ' done' : ''}`}
                    style={{ borderColor: colorOf.get(t.areaId) ?? '#94a3b8' }}
                    title={t.title}
                  >
                    <span className="week-item-title">{t.status === 'done' ? '✓ ' : ''}{t.title}</span>
                    <span className="week-item-mins">{formatMinutes(t.estimateMinutes)}</span>
                  </div>
                ))}
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <div className="week-empty">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
