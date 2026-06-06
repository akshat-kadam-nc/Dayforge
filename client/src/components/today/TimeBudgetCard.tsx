import { useToday } from '../../today/useToday';
import type { BudgetScope } from '../../today/types';
import {
  allocatedMinutes,
  budgetBarSegments,
  interruptedMinutes,
  loggedMinutes,
  toBarPercents,
} from '../../today/budget';
import { formatMinutes } from '../../today/format';

const SCOPES: BudgetScope[] = ['day', 'week', 'month'];

export function TimeBudgetCard() {
  const { state, actions } = useToday();
  const segments = toBarPercents(budgetBarSegments(state));

  return (
    <div className="card">
      <div className="card-title">
        Time Budget
        <div className="toggle-pills">
          {SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              className={state.budgetScope === s ? 'active' : ''}
              onClick={() => actions.setScope(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="budget-stats">
        <Stat value={formatMinutes(state.availableMinutes)} label="Available" />
        <Stat value={formatMinutes(allocatedMinutes(state))} label="Allocated" color="var(--warning)" />
        <Stat value={formatMinutes(interruptedMinutes(state))} label="Interrupted" color="var(--fire)" />
        <Stat value={formatMinutes(loggedMinutes(state))} label="Logged" color="var(--success)" />
      </div>

      <div className="budget-bar-track">
        <div className="budget-bar-fill">
          {segments.map(({ seg, pct }) => (
            <div key={seg.id} className="budget-seg" style={{ width: `${pct}%`, background: seg.color }} />
          ))}
        </div>
      </div>

      <div className="bar-labels">
        {budgetBarSegments(state).map((seg) => (
          <div key={seg.id} className="bar-lbl">
            <div className="bar-lbl-dot" style={{ background: seg.color }} />
            {seg.label}
            {seg.id !== 'untracked' && <> {formatMinutes(seg.minutes)}</>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-val" style={color ? { color } : undefined}>{value}</span>
      <span className="stat-pill-lbl">{label}</span>
    </div>
  );
}
