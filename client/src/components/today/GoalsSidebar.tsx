import { useToday } from '../../today/useToday';
import { allocatedForArea, interruptedMinutes } from '../../today/budget';
import { formatMinutes } from '../../today/format';

/**
 * Right rail: this week's goals + an area-time split. The split is derived from
 * today's allocations as a Phase 1 stand-in; Phase 2 backs it with real weekly
 * logs.
 */
export function GoalsSidebar() {
  const { state } = useToday();

  const splits = [
    ...state.areas.map((a) => ({
      id: a.id,
      icon: a.icon,
      name: a.name,
      color: a.color,
      minutes: allocatedForArea(state, a.id),
    })),
    {
      id: 'interruptions',
      icon: '🔥',
      name: 'Interruptions',
      color: '#f43f5e',
      minutes: interruptedMinutes(state),
    },
  ].filter((s) => s.minutes > 0);

  const max = Math.max(1, ...splits.map((s) => s.minutes));

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-title">This week's goals</div>
        <div className="cal-badge">📅 Google Calendar · 3 events today</div>
        {state.goals.map((g) => (
          <div key={g.id} className="goal-card">
            <div className="goal-top">
              <span className="goal-icon">{g.icon}</span>
              <span className="goal-text">{g.text}</span>
              <span className="goal-pct" style={{ color: g.color }}>{g.pct}%</span>
            </div>
            <div className="goal-bar">
              <div className="goal-bar-fill" style={{ width: `${g.pct}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="sidebar-title">Today by area</div>
        {splits.map((s) => (
          <div key={s.id} className="split-item">
            <span className="split-icon">{s.icon}</span>
            <span className="split-name" style={s.id === 'interruptions' ? { color: '#be123c' } : undefined}>
              {s.name}
            </span>
            <div className="split-bar">
              <div className="split-bar-fill" style={{ width: `${(s.minutes / max) * 100}%`, background: s.color }} />
            </div>
            <span className="split-val" style={s.id === 'interruptions' ? { color: '#be123c' } : undefined}>
              {formatMinutes(s.minutes)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
