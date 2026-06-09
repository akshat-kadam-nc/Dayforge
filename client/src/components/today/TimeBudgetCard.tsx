import { useToday } from '../../today/useToday';
import type { BudgetScope } from '../../today/types';
import {
  allocatedMinutes,
  budgetBarSegments,
  completedTodayTasks,
  effectiveAvailable,
  interruptedMinutes,
  loggedMinutes,
  timeGainedMinutes,
  toBarPercents,
  type Segment,
} from '../../today/budget';
import { formatMinutes } from '../../today/format';
import { useCountUp } from '../../today/useCountUp';

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
  const gained = timeGainedMinutes(state);
  const hasCompleted = completedTodayTasks(state).some((t) => t.estimateMinutes > 0);
  return (
    <>
      <div className="budget-stats">
        <Stat minutes={effectiveAvailable(state)} label="Available" />
        <Stat minutes={allocatedMinutes(state)} label="Allocated" color="var(--warning)" />
        <Stat minutes={interruptedMinutes(state)} label="Interrupted" color="var(--fire)" />
        <Stat minutes={loggedMinutes(state)} label="Logged" color="var(--success)" />
      </div>
      <BudgetBar segments={pcts} />
      <SegmentLabels segments={segments} />
      {hasCompleted && (
        <div className={`time-delta ${gained >= 0 ? 'gain' : 'loss'}`}>
          {gained >= 0
            ? `⏱ ${formatMinutes(gained)} gained vs plan today`
            : `⏱ ${formatMinutes(-gained)} over plan today`}
        </div>
      )}
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
        <Stat minutes={sum.availableMinutes} label="Available" />
        <Stat minutes={sum.allocated} label="Allocated" color="var(--warning)" />
        <Stat minutes={sum.interrupted} label="Interrupted" color="var(--fire)" />
        <Stat minutes={sum.logged} label="Logged" color="var(--success)" />
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

function Stat({ minutes, label, color }: { minutes: number; label: string; color?: string }) {
  const animated = useCountUp(minutes);
  return (
    <div className="stat-pill">
      <span className="stat-pill-val" style={color ? { color } : undefined}>{formatMinutes(animated)}</span>
      <span className="stat-pill-lbl">{label}</span>
    </div>
  );
}
