import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiReportsRepo, localReportsRepo, type ReportsRepo } from '../reports/repo';
import { presetRange, customRange, rangeLabel, type Range, type RangePreset } from '../reports/range';
import type { ReportsPayload, LifeArea } from '../reports/types';
import { formatMinutes } from '../today/format';
import { PageEmpty } from '../components/PageEmpty';
import '../styles/today.css';
import '../styles/reports.css';

const PRESETS: { preset: RangePreset; label: string }[] = [
  { preset: 'this_week', label: 'This week' },
  { preset: 'this_month', label: 'This month' },
  { preset: 'last_month', label: 'Last month' },
  { preset: 'last_3_months', label: 'Last 3 months' },
];

const PERIOD_LABEL: Record<string, string> = {
  weekly: 'Weekly', monthly: 'Monthly', half_year: 'Half-year', annual: 'Annual',
};

export function ReportsPage() {
  const { isGuest } = useAuth();
  const repo: ReportsRepo = isGuest ? localReportsRepo : apiReportsRepo;

  const [range, setRange] = useState<Range>(() => presetRange('this_month'));
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    repo
      .load(range.from, range.to)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? 'Failed to load reports'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repo, range.from, range.to]);

  const areaById = useMemo(() => {
    const m = new Map<string, LifeArea>();
    for (const a of data?.areas ?? []) m.set(a.id, a);
    return m;
  }, [data]);

  const hasData = !!data && data.totals.doneCount > 0;

  return (
    <div className="reports">
      <header className="rep-head">
        <div className="rep-title-wrap">
          <div className="rep-title">📊 Reports</div>
          <div className="rep-sub">Look back at where your time actually went. {rangeLabel(range.from, range.to)}</div>
        </div>
      </header>

      <div className="rep-range">
        <div className="rep-presets">
          {PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              className={`rep-chip${range.preset === p.preset ? ' active' : ''}`}
              onClick={() => setRange(presetRange(p.preset))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="rep-custom">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && setRange((r) => customRange(e.target.value, r.to))}
          />
          <span className="rep-dash">→</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && setRange((r) => customRange(r.from, e.target.value))}
          />
        </div>
      </div>

      {loading ? (
        <div className="rep-loading muted">Crunching your history…</div>
      ) : error ? (
        <PageEmpty emoji="⚠️" title="Couldn't load reports" message={error} />
      ) : !hasData ? (
        <PageEmpty
          emoji="📊"
          title="Nothing completed in this window yet"
          message="Finish a few tasks, then come back to see where your time went. Try a wider range or check that tasks are marked done."
        />
      ) : (
        <div className="rep-sections">
          <Overview data={data!} />
          <TimeByArea data={data!} areaById={areaById} />
          <Pace data={data!} />
          <Deadlines data={data!} />
          <CompletedGoals data={data!} areaById={areaById} />
          <TeamHistory data={data!} />
          <Trend data={data!} />
        </div>
      )}
    </div>
  );
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

// ── Overview stat strip ──
function Overview({ data }: { data: ReportsPayload }) {
  const { totals, pace } = data;
  const util = pct(totals.loggedMinutes, totals.availableMinutes);
  const paceRatio = pace.estimateMinutes > 0 ? Math.round((pace.loggedMinutes / pace.estimateMinutes) * 100) : 100;
  const stats = [
    { label: 'Time logged', value: formatMinutes(totals.loggedMinutes) },
    { label: 'Tasks done', value: String(totals.doneCount) },
    { label: 'Of available', value: `${util}%`, hint: `${formatMinutes(totals.availableMinutes)} free` },
    { label: 'Pace vs plan', value: `${paceRatio}%`, hint: paceRatio <= 100 ? 'faster than planned' : 'slower than planned', tone: paceRatio <= 100 ? 'good' : 'warn' },
  ];
  return (
    <div className="rep-overview">
      {stats.map((s) => (
        <div className="rep-stat" key={s.label}>
          <div className={`rep-stat-val${s.tone ? ' ' + s.tone : ''}`}>{s.value}</div>
          <div className="rep-stat-lbl">{s.label}</div>
          {s.hint && <div className="rep-stat-hint">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Time by life area ──
function TimeByArea({ data, areaById }: { data: ReportsPayload; areaById: Map<string, LifeArea> }) {
  const rows = [...data.perArea].sort((a, b) => b.loggedMinutes - a.loggedMinutes);
  const max = Math.max(1, ...rows.map((r) => r.loggedMinutes));
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">⏱ Time by life area</h2>
      {rows.length === 0 ? (
        <p className="muted">No completed work in this window.</p>
      ) : (
        <div className="rep-bars">
          {rows.map((r) => {
            const area = areaById.get(r.areaId);
            const color = area?.color ?? '#7c3aed';
            return (
              <div className="rep-bar-row" key={r.areaId}>
                <div className="rep-bar-label">
                  <span>{area?.icon} {area?.name ?? 'Unknown'}</span>
                  <span className="rep-bar-meta">{formatMinutes(r.loggedMinutes)} · {r.doneCount} done</span>
                </div>
                <div className="rep-bar-track">
                  <div className="rep-bar-fill" style={{ width: `${pct(r.loggedMinutes, max)}%`, background: color }} />
                  {/* Faint marker for the planned estimate, to compare actual vs planned. */}
                  <div className="rep-bar-plan" style={{ left: `${Math.min(100, pct(r.estimateMinutes, max))}%` }} title={`Planned ${formatMinutes(r.estimateMinutes)}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="rep-bar-legend"><span className="rep-plan-key" /> tick marks show planned (estimated) time</div>
    </section>
  );
}

// ── Pace ──
function Pace({ data }: { data: ReportsPayload }) {
  const { pace } = data;
  const total = pace.faster + pace.onEstimate + pace.slower;
  const ratio = pace.estimateMinutes > 0 ? pace.loggedMinutes / pace.estimateMinutes : 1;
  const deltaMin = pace.loggedMinutes - pace.estimateMinutes;
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">⚡ Pace — logged vs estimated</h2>
      <div className="rep-pace">
        <div className="rep-pace-big">
          <div className={`rep-pace-ratio${ratio <= 1 ? ' good' : ' warn'}`}>{Math.round(ratio * 100)}%</div>
          <div className="rep-pace-cap">
            {deltaMin === 0 ? 'exactly on estimate' : deltaMin < 0 ? `${formatMinutes(-deltaMin)} under estimate` : `${formatMinutes(deltaMin)} over estimate`}
          </div>
          <div className="rep-pace-tot muted">{formatMinutes(pace.loggedMinutes)} logged · {formatMinutes(pace.estimateMinutes)} planned</div>
        </div>
        <div className="rep-pace-split">
          <PaceSplit label="Beat estimate" n={pace.faster} total={total} tone="good" />
          <PaceSplit label="On estimate" n={pace.onEstimate} total={total} tone="neutral" />
          <PaceSplit label="Over estimate" n={pace.slower} total={total} tone="warn" />
        </div>
      </div>
    </section>
  );
}
function PaceSplit({ label, n, total, tone }: { label: string; n: number; total: number; tone: string }) {
  return (
    <div className="rep-split-row">
      <div className="rep-split-head"><span>{label}</span><b>{n}</b></div>
      <div className="rep-split-track"><div className={`rep-split-fill ${tone}`} style={{ width: `${pct(n, total)}%` }} /></div>
    </div>
  );
}

// ── Deadlines ──
function Deadlines({ data }: { data: ReportsPayload }) {
  const d = data.deadlines;
  if (d.withDeadline === 0) {
    return (
      <section className="rep-card">
        <h2 className="rep-card-title">🎯 Deadline adherence</h2>
        <p className="muted">No completed tasks carried a deadline in this window.</p>
      </section>
    );
  }
  const onTimePct = pct(d.onTime, d.withDeadline);
  // Donut geometry.
  const R = 52, C = 2 * Math.PI * R;
  const onLen = (d.onTime / d.withDeadline) * C;
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">🎯 Deadline adherence</h2>
      <div className="rep-deadline">
        <div className="rep-donut">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(244,63,94,0.25)" strokeWidth="16" />
            <circle
              cx="70" cy="70" r={R} fill="none" stroke="#16a34a" strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${onLen} ${C - onLen}`} transform="rotate(-90 70 70)"
            />
            <text x="70" y="66" textAnchor="middle" className="rep-donut-num">{onTimePct}%</text>
            <text x="70" y="86" textAnchor="middle" className="rep-donut-cap">on time</text>
          </svg>
        </div>
        <div className="rep-deadline-stats">
          <div className="rep-dl-line"><span className="dot good" /> On time <b>{d.onTime}</b></div>
          <div className="rep-dl-line"><span className="dot bad" /> Late <b>{d.late}</b></div>
          <div className="rep-dl-line muted">Avg lateness when late: <b>{formatMinutes(d.avgLatenessMin)}</b></div>
          <div className="rep-dl-types">
            <span className="rep-dl-chip">Soft: {d.byType.soft.onTime} on time / {d.byType.soft.late} late</span>
            <span className="rep-dl-chip hard">Hard: {d.byType.hard.onTime} on time / {d.byType.hard.late} late</span>
          </div>
        </div>
      </div>
      {d.worstLate.length > 0 && (
        <div className="rep-late-list">
          <div className="rep-late-title">Most overdue</div>
          {d.worstLate.map((w, i) => (
            <div className="rep-late-row" key={i}>
              <span className="rep-late-name">{w.title}</span>
              <span className="rep-late-by">{formatMinutes(w.latenessMin)} late</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Completed + missed goals ──
function CompletedGoals({ data, areaById }: { data: ReportsPayload; areaById: Map<string, LifeArea> }) {
  const { completed, missed, legacyCount } = data.goals;
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">🧭 Goals completed <span className="rep-count">{completed.length}</span></h2>
      {completed.length === 0 ? (
        <p className="muted">No goals were completed in this window.</p>
      ) : (
        <div className="rep-goals">
          {completed.map((g) => {
            const area = areaById.get(g.areaId);
            return (
              <div className="rep-goal" key={g.id}>
                <span className="rep-goal-ico">{g.icon || '🎯'}</span>
                <span className="rep-goal-text">{g.text}</span>
                <span className="rep-goal-meta">
                  {area && <span className="rep-goal-area" style={{ color: area.color }}>{area.name}</span>}
                  <span className="rep-goal-period">{PERIOD_LABEL[g.period] ?? g.period}</span>
                  {g.completedAt && <span className="rep-goal-date">{new Date(g.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {legacyCount > 0 && <div className="rep-goal-legacy muted">+ {legacyCount} more at 100% completed earlier (before completion dates were tracked)</div>}

      {missed.length > 0 && (
        <div className="rep-missed">
          <div className="rep-missed-title">✗ Missed <span className="rep-count bad">{missed.length}</span></div>
          {missed.map((g) => {
            const area = areaById.get(g.areaId);
            return (
              <div className="rep-goal" key={g.id}>
                <span className="rep-goal-ico">{g.icon || '🎯'}</span>
                <span className="rep-goal-text">{g.text}</span>
                <span className="rep-goal-meta">
                  {area && <span className="rep-goal-area" style={{ color: area.color }}>{area.name}</span>}
                  <span className="rep-goal-missed">{g.pct}%</span>
                  {g.resolvedAt && <span className="rep-goal-date">{new Date(g.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Team delegation history ──
function TeamHistory({ data }: { data: ReportsPayload }) {
  const { team } = data;
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">👥 Delegated work completed</h2>
      {team.length === 0 ? (
        <p className="muted">No delegated work was completed in this window.</p>
      ) : (
        <div className="rep-team">
          {team.map((p) => (
            <div className="rep-team-row" key={p.personId}>
              <span className="rep-team-ava" style={{ background: p.color }}>{p.name.charAt(0).toUpperCase()}</span>
              <div className="rep-team-info">
                <div className="rep-team-name">{p.name} <span className="rep-team-count">{p.doneCount} done</span></div>
                <div className="rep-team-recent">
                  {p.recent.map((r, i) => (
                    <span className="rep-team-item" key={i}>{r.title}{r.ventureLabel ? ` · ${r.ventureLabel}` : ''}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Trend (daily logged minutes) ──
function Trend({ data }: { data: ReportsPayload }) {
  // Bucket to weeks when the range is long, else show days.
  const points = data.series;
  const buckets = points.length > 31 ? toWeeks(points) : points.map((p) => ({ key: p.day, label: shortDay(p.day), minutes: p.loggedMinutes }));
  const max = Math.max(1, ...buckets.map((b) => b.minutes));
  return (
    <section className="rep-card">
      <h2 className="rep-card-title">📈 Daily effort</h2>
      <div className="rep-trend">
        {buckets.map((b) => (
          <div className="rep-trend-col" key={b.key} title={`${b.label}: ${formatMinutes(b.minutes)}`}>
            <div className="rep-trend-bar" style={{ height: `${Math.max(2, pct(b.minutes, max))}%` }} />
            <div className="rep-trend-lbl">{b.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
function shortDay(key: string): string {
  const [, , d] = key.split('-');
  return String(Number(d));
}
function toWeeks(points: { day: string; loggedMinutes: number }[]): { key: string; label: string; minutes: number }[] {
  const out: { key: string; label: string; minutes: number }[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    out.push({ key: chunk[0].day, label: shortDay(chunk[0].day), minutes: chunk.reduce((x, p) => x + p.loggedMinutes, 0) });
  }
  return out;
}
