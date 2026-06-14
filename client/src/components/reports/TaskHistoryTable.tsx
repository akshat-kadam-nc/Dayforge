import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReportsRepo } from '../../reports/repo';
import type { LifeArea, GoalLite, TaskHistory, TaskHistoryRow } from '../../reports/types';
import { formatMinutes } from '../../today/format';
import { useToast } from '../Toast';
import { PageEmpty } from '../PageEmpty';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  deferred: 'Deferred',
  blocked: 'Blocked',
};

const KIND_LABEL: Record<string, string> = { task: 'Task', chore: 'Chore', chore_session: 'Chores' };

type StatusFilter = 'all' | 'done' | 'open';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Most recent first: by completion, then creation, then planned day. */
function recency(t: TaskHistoryRow): number {
  const stamp = t.completedAt ?? t.createdAt;
  if (stamp) {
    const n = new Date(stamp).getTime();
    if (!isNaN(n)) return n;
  }
  return new Date(`${t.day}T00:00:00`).getTime() || 0;
}

export function TaskHistoryTable({ repo }: { repo: ReportsRepo }) {
  const { toast } = useToast();
  // Default window: the last 7 days (inclusive).
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [history, setHistory] = useState<TaskHistory | null>(null);
  const [loadedRange, setLoadedRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reversingId, setReversingId] = useState<string | null>(null);

  const fetchRange = useCallback(
    (f: string, t: string) => {
      setLoading(true);
      setError(null);
      repo
        .loadTasks(f, t)
        .then((h) => {
          setHistory(h);
          setLoadedRange({ from: f, to: t });
        })
        .catch((e) => setError(e?.message ?? 'Failed to load task history'))
        .finally(() => setLoading(false));
    },
    [repo],
  );

  // Auto-load the default last-7-days window once (and when the repo swaps).
  useEffect(() => {
    fetchRange(daysAgo(6), ymd(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRange]);

  const areaById = useMemo(() => {
    const m = new Map<string, LifeArea>();
    for (const a of history?.areas ?? []) m.set(a.id, a);
    return m;
  }, [history]);
  const goalById = useMemo(() => {
    const m = new Map<string, GoalLite>();
    for (const g of history?.goals ?? []) m.set(g.id, g);
    return m;
  }, [history]);

  const rows = useMemo(() => {
    const all = history?.tasks ?? [];
    const q = query.trim().toLowerCase();
    return all
      .filter((t) => (statusFilter === 'all' ? true : statusFilter === 'done' ? t.status === 'done' : t.status !== 'done'))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .sort((a, b) => recency(b) - recency(a));
  }, [history, query, statusFilter]);

  async function reverse(t: TaskHistoryRow) {
    if (reversingId) return;
    setReversingId(t.id);
    try {
      await repo.reopenTask(t.id);
      setHistory((h) =>
        h
          ? { ...h, tasks: h.tasks.map((x) => (x.id === t.id ? { ...x, status: 'not_started', completedAt: undefined } : x)) }
          : h,
      );
      toast('Task reopened — back in your active list', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not reopen task', 'error');
    } finally {
      setReversingId(null);
    }
  }

  return (
    <div className="rep-history">
      <div className="rep-history-controls">
        <div className="rep-history-range">
          <label className="rep-history-date">
            From
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className="rep-history-date">
            To
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </label>
          <button type="button" className="rep-fetch-btn" disabled={loading} onClick={() => fetchRange(from, to)}>
            {loading ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
        <input
          className="rep-history-search"
          type="search"
          placeholder="Search loaded tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rep-history-filters">
          {(['all', 'done', 'open'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`rep-chip${statusFilter === f ? ' active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'done' ? 'Completed' : 'Open'}
            </button>
          ))}
        </div>
        <span className="rep-history-count">{rows.length} task{rows.length === 1 ? '' : 's'}</span>
      </div>

      {loading && !history ? (
        <div className="rep-loading muted">Loading task history…</div>
      ) : error ? (
        <PageEmpty emoji="⚠️" title="Couldn't load history" message={error} />
      ) : rows.length === 0 ? (
        <PageEmpty
          emoji="🗂️"
          title="No tasks in this range"
          message={
            loadedRange
              ? `Nothing between ${loadedRange.from} and ${loadedRange.to}. Widen the dates and Fetch again.`
              : 'Pick a date range and click Fetch.'
          }
        />
      ) : (
        <div className="rep-history-scroll">
          <table className="rep-history-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Area</th>
                <th>Status</th>
                <th>Goal</th>
                <th>Created</th>
                <th>Completed</th>
                <th className="num">Logged</th>
                <th className="num">Est.</th>
                <th>Deadline</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const area = t.areaId ? areaById.get(t.areaId) : undefined;
                const goal = t.goalId ? goalById.get(t.goalId) : undefined;
                return (
                  <tr key={t.id}>
                    <td className="rh-title">
                      <span className="rh-title-text">{t.title}</span>
                      {t.kind !== 'task' && <span className="rh-kind">{KIND_LABEL[t.kind] ?? t.kind}</span>}
                    </td>
                    <td>
                      {area ? (
                        <span className="rh-area">
                          <span className="rh-dot" style={{ background: area.color }} />
                          {area.icon} {area.name}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`rh-status rh-status-${t.status}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                    </td>
                    <td>{goal ? <span className="rh-goal">{goal.icon} {goal.text}</span> : <span className="muted">—</span>}</td>
                    <td className="rh-date">{fmtDate(t.createdAt)}</td>
                    <td className="rh-date">{fmtDate(t.completedAt)}</td>
                    <td className="num">{formatMinutes(t.loggedMinutes)}</td>
                    <td className="num muted">{t.estimateMinutes > 0 ? formatMinutes(t.estimateMinutes) : '—'}</td>
                    <td>
                      {t.dueAt ? (
                        <span className={`rh-deadline${t.deadlineType === 'hard' ? ' hard' : ''}`}>
                          {fmtDate(t.dueAt)}
                          <span className="rh-deadline-type">{t.deadlineType === 'hard' ? 'hard' : 'soft'}</span>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="rh-action">
                      {t.status === 'done' && (
                        <button
                          type="button"
                          className="rh-reverse"
                          title="Reverse — reopen this task to your active list"
                          disabled={reversingId === t.id}
                          onClick={() => reverse(t)}
                        >
                          ↩ Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
