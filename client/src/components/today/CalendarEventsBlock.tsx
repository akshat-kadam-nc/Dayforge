import { useToday } from '../../today/useToday';
import { formatMinutes } from '../../today/format';

/** Synced Google Calendar events for today, shown as fixed blocks. Each can be
 *  muted so it stops deducting from the budget (recurring = whole series). */
export function CalendarEventsBlock() {
  const { state, actions } = useToday();
  const events = state.calendarEvents;
  if (events.length === 0) return null;

  function timeOf(e: (typeof events)[number]): string {
    if (e.allDay) return 'All day';
    const d = new Date(e.start);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="venture-block cal-block">
      <div className="vent-head static">
        <div className="vent-icon" style={{ background: 'rgba(66,133,244,0.12)' }}>📅</div>
        <span className="vent-name">Calendar</span>
        <span className="vent-badge cal-badge">{events.length}</span>
      </div>

      {events.map((e) => {
        const recurring = e.seriesKey !== e.id;
        return (
          <div key={e.id} className={`task-item cal-event${e.deduct ? '' : ' muted'}`}>
            <span className="cal-dot" style={{ background: e.color }} />
            <div className="task-info">
              <div className="task-name">{e.title}</div>
              <div className="task-meta">
                <span className="task-dur">
                  {timeOf(e)}
                  {!e.allDay && e.durationMinutes > 0 && <> · {formatMinutes(e.durationMinutes)}</>}
                </span>
                {e.allDay && <span className="tag tag-cal">all-day</span>}
                {recurring && <span className="tag tag-series">↻ series</span>}
              </div>
            </div>

            {!e.allDay && (
              <button
                type="button"
                className={`deduct-toggle${e.deduct ? ' on' : ''}`}
                onClick={() => actions.setEventDeduct(e.seriesKey, !e.deduct)}
                title={e.deduct ? 'Counting toward budget — click to mute' : 'Muted — click to count'}
              >
                {e.deduct ? '− budget' : 'muted'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
