import { useToday } from '../../today/useToday';
import type { BudgetScope } from '../../today/types';
import {
  allocatedMinutes,
  budgetBarSegments,
  interruptedMinutes,
  loggedMinutes,
  toBarPercents,
  type Segment,
} from '../../today/budget';
import { formatMinutes } from '../../today/format';

const SCOPES: BudgetScope[] = ['day', 'week', 'month'];
const FREE_COLOR = 'rgba(148,163,184,0.4)';
const OVER_COLOR = '#f43f5e';

export function TimeBudgetCard() {
  const { state, actions } = useToday();
  const { budgetScope: scope, scopeSummary } = state;
  const isScoped = scope !== 'day';

  return (
    <div className="card">
      <div className="card-title">
        Time Budget
        <div className="toggle-pills">
          {SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              className={scope === s ? 'active' : ''}
              onClick={() => actions.setScope(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isScoped ? (
        <ScopedBudget />
      ) : (
        <DayBudget />
      )}

      {isScoped && scopeSummary && (
        <div className="scope-range">{scopeSummary.start} → {scopeSummary.end}</div>
      )}
    </div>
  );
}

function DayBudget() {
  const { state } = useToday();
  const segments = budgetBarSegments(state);
  const pcts = toBarPercents(segments);
  return (
    <>
      <div className="budget-stats">
        <Stat value={formatMinutes(state.availableMinutes)} label="Available" />
        <Stat value={formatMinutes(allocatedMinutes(state))} label="Allocated" color="var(--warning)" />
        <Stat value={formatMinutes(interruptedMinutes(state))} label="Interrupted" color="var(--fire)" />
        <Stat value={formatMinutes(loggedMinutes(state))} label="Logged" color="var(--success)" />
      </div>
      <BudgetBar segments={pcts} />
      <SegmentLabels segments={segments} />
    </>
  );
}

function ScopedBudget() {
  const { state } = useToday();
  const sum = state.scopeSummary;
  if (!sum) {
    return <div className="scope-loading">Loading {state.budgetScope} budget…</div>;
  }

  // Allocation segments per area, plus a free/over remainder, scaled to the
  // larger of available vs allocated so an overflow visibly spills past full.
  const areaSegs: Segment[] = sum.perArea
    .map((p) => {
      const area = state.areas.find((a) => a.id === p.areaId);
      return { id: p.areaId, label: area?.name ?? 'Area', minutes: p.minutes, color: area?.color ?? '#94a3b8' };
    })
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const free = sum.availableMinutes - sum.allocated;
  const remainder: Segment[] =
    free > 0
      ? [{ id: 'free', label: 'Free', minutes: free, color: FREE_COLOR }]
      : free < 0
        ? [{ id: 'over', label: 'Over', minutes: -free, color: OVER_COLOR }]
        : [];
  const segments = [...areaSegs, ...remainder];
  const total = segments.reduce((s, x) => s + x.minutes, 0) || 1;
  const pcts = segments.map((seg) => ({ seg, pct: (seg.minutes / total) * 100 }));

  return (
    <>
      <div className="budget-stats">
        <Stat value={formatMinutes(sum.availableMinutes)} label="Available" />
        <Stat value={formatMinutes(sum.allocated)} label="Allocated" color="var(--warning)" />
        <Stat value={formatMinutes(sum.interrupted)} label="Interrupted" color="var(--fire)" />
        <Stat value={formatMinutes(sum.logged)} label="Logged" color="var(--success)" />
      </div>
      <BudgetBar segments={pcts} />
      <SegmentLabels segments={segments} hideMinutesFor={['free']} />
    </>
  );
}

function BudgetBar({ segments }: { segments: { seg: Segment; pct: number }[] }) {
  return (
    <div className="budget-bar-track">
      <div className="budget-bar-fill">
        {segments.map(({ seg, pct }) => (
          <div key={seg.id} className="budget-seg" style={{ width: `${pct}%`, background: seg.color }} />
        ))}
      </div>
    </div>
  );
}

function SegmentLabels({ segments, hideMinutesFor = ['untracked'] }: { segments: Segment[]; hideMinutesFor?: string[] }) {
  return (
    <div className="bar-labels">
      {segments.map((seg) => (
        <div key={seg.id} className="bar-lbl">
          <div className="bar-lbl-dot" style={{ background: seg.color }} />
          {seg.label}
          {!hideMinutesFor.includes(seg.id) && <> {formatMinutes(seg.minutes)}</>}
        </div>
      ))}
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
