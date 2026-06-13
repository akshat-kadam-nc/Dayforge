import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { useToday } from '../today/useToday';
import { makeInitialState } from '../today/seed';
import type { Goal, GoalPeriod, LifeArea, ReconciliationDue } from '../today/types';
import { apiGoalsRepo, localGoalsRepo, type GoalsRepo } from '../goals/repo';
import { buildForest, isTerminal, type RollupMap, type GoalNode } from '../goals/tree';
import type { GoalInput } from '../goals/api';
import { GoalTree } from '../components/goals/GoalTree';
import { GoalModal } from '../components/goals/GoalModal';
import { ReconciliationModal } from '../components/today/ReconciliationModal';
import { PageEmpty } from '../components/PageEmpty';
import '../styles/today.css';
import '../styles/goals.css';

const RECON_LABEL: Record<ReconciliationDue['scope'], string> = {
  week: 'Weekly close',
  month: 'Monthly close',
  half_year: 'Half-year checkpoint',
};

type ModalState = { editing: Goal | null; preset?: { areaId?: string; period?: GoalPeriod; parentId?: string }; derived: boolean };

export function GoalsPage() {
  const { isGuest } = useAuth();
  const repo: GoalsRepo = isGuest ? localGoalsRepo : apiGoalsRepo;

  // Reconciliation prompts moved here from Today; the period-close review is a
  // goals concern. Data + save action come from the app-wide Today context.
  const { state: todayState } = useToday();
  const dueReviews = todayState.dueReconciliations;
  const [openDue, setOpenDue] = useState<ReconciliationDue | null>(null);

  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rollup, setRollup] = useState<RollupMap>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [conclude, setConclude] = useState<{ goal: Goal; pct: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([repo.load(), loadAreas(isGuest)])
      .then(([data, a]) => {
        if (cancelled) return;
        setGoals(data.goals);
        setRollup(data.rollup);
        setAreas(a);
      })
      .catch((e) => !cancelled && setError(e?.message ?? 'Failed to load goals'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repo, isGuest]);

  // Build a forest per life area from ACTIVE goals only; concluded/missed goals
  // are listed separately in a Closed section. Every area is shown — even with no
  // goals yet — so each venture has a visible card and an add-goal entry point.
  const byArea = useMemo(() => {
    const active = goals.filter((g) => !isTerminal(g));
    const closed = goals.filter((g) => isTerminal(g));
    return areas.map((area) => ({
      area,
      forest: buildForest(active.filter((g) => g.areaId === area.id), rollup),
      closed: closed
        .filter((g) => g.areaId === area.id)
        .sort((a, b) => (b.completedAt ?? b.resolvedAt ?? '').localeCompare(a.completedAt ?? a.resolvedAt ?? '')),
    }));
  }, [areas, goals, rollup]);

  function toggle(id: string) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }

  async function save(id: string | null, input: GoalInput) {
    if (id) {
      await repo.update(id, input);
      // Merge the saved fields into local state (api and demo agree on values).
      // Normalise nullable inputs to the Goal type's optional (undefined) shape.
      setGoals((gs) =>
        gs.map((g) =>
          g.id === id
            ? {
                ...g,
                ...input,
                pct: input.pct ?? g.pct,
                parentId: input.parentId ?? undefined,
                targetCount: input.targetCount ?? undefined,
                dueAt: input.dueAt ?? undefined,
              }
            : g,
        ),
      );
    } else {
      const created = await repo.create(input);
      setGoals((gs) => [...gs, created]);
    }
  }

  async function remove(node: GoalNode) {
    const id = node.goal.id;
    if (!window.confirm(`Delete "${node.goal.text}"? Child goals will be detached.`)) return;
    await repo.remove(id);
    setGoals((gs) => gs.filter((g) => g.id !== id).map((g) => (g.parentId === id ? { ...g, parentId: undefined } : g)));
  }

  // Manually conclude a goal at a chosen pct — moves it to Closed, keeps history.
  async function doConclude() {
    if (!conclude) return;
    const { goal, pct } = conclude;
    setConclude(null);
    setGoals((gs) =>
      gs.map((g) => (g.id === goal.id ? { ...g, status: 'completed', pct, completedAt: new Date().toISOString() } : g)),
    );
    await repo.update(goal.id, { status: 'completed', pct });
  }

  async function removeGoal(goal: Goal) {
    if (!window.confirm(`Delete "${goal.text}"?`)) return;
    await repo.remove(goal.id);
    setGoals((gs) => gs.filter((g) => g.id !== goal.id));
  }

  async function reopen(goal: Goal) {
    setGoals((gs) =>
      gs.map((g) => (g.id === goal.id ? { ...g, status: 'active', completedAt: undefined, resolvedAt: undefined } : g)),
    );
    await repo.update(goal.id, { status: 'active' });
  }

  async function duplicate(goal: Goal) {
    const created = await repo.duplicate(goal.id);
    // Demo returns a stub id only; build the real copy from the source either way.
    const copy: Goal = {
      ...goal,
      id: created.id,
      pct: 0,
      status: 'active',
      completedAt: undefined,
      resolvedAt: undefined,
      dueAt: goal.timed && goal.dueAt ? shiftByPeriodIso(goal.dueAt, goal.period) : undefined,
    };
    setGoals((gs) => [...gs, isGuest ? copy : created]);
  }

  // A node's progress is derived (hide the manual slider) when it's a weekly with
  // linked tasks or any goal that has children.
  function isDerived(node: GoalNode): boolean {
    return node.children.length > 0 || (node.goal.period === 'weekly' && !!node.rollup && node.rollup.estTotal > 0);
  }

  return (
    <div className="goals-page">
      <div className="goals-topbar">
        <div className="goals-titlewrap">
          <h1 className="goals-title">Goals</h1>
          <p className="goals-sub">Annual → Half-year → Monthly → Weekly, per life area. Weekly progress tracks linked tasks.</p>
        </div>
        <button
          type="button"
          className="btn"
          disabled={areas.length === 0}
          onClick={() => setModal({ editing: null, preset: { period: 'annual' }, derived: false })}
        >
          ＋ New goal
        </button>
      </div>

      {dueReviews.length > 0 && (
        <section className="goals-reviews">
          <div className="goals-reviews-head">
            <span className="goals-reviews-title">🗓 Reviews due</span>
            <span className="goals-reviews-sub muted">Close out the period and reconcile progress against plan.</span>
          </div>
          <div className="goals-reviews-grid">
            {dueReviews.map((d) => (
              <button
                key={`${d.scope}:${d.periodKey}`}
                type="button"
                className={`review-card review-${d.scope}`}
                onClick={() => setOpenDue(d)}
              >
                <span className="review-scope">{RECON_LABEL[d.scope]}</span>
                <span className="review-period">{d.label}</span>
                <span className="review-cta">Review →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <div className="goals-error">{error}</div>}

      {loading ? (
        <p className="muted goals-empty">Loading…</p>
      ) : byArea.length === 0 ? (
        <PageEmpty
          emoji="🧭"
          title="No goals yet"
          message={
            areas.length === 0
              ? 'Set up a life area first (on Today), then create an annual goal and break it down to the week.'
              : 'Create an annual goal and break it down: half-year → monthly → weekly. Weekly progress tracks your linked tasks.'
          }
          action={
            areas.length > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={() => setModal({ editing: null, preset: { period: 'annual' }, derived: false })}
              >
                ＋ New goal
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="goals-areas">
          {byArea.map(({ area, forest, closed }) => (
            <section key={area.id} className="goal-area-card" style={{ ['--area-color' as string]: area.color }}>
              <div className="goal-area-head">
                <span className="goal-area-icon">{area.icon}</span>
                <span className="goal-area-name">{area.name}</span>
                <button
                  type="button"
                  className="goal-area-add"
                  title="Add goal to this area"
                  onClick={() => setModal({ editing: null, preset: { areaId: area.id, period: 'annual' }, derived: false })}
                >
                  ＋
                </button>
              </div>
              <div className="goal-forest">
                {forest.length === 0 ? (
                  <button
                    type="button"
                    className="goal-area-empty"
                    onClick={() => setModal({ editing: null, preset: { areaId: area.id, period: 'annual' }, derived: false })}
                  >
                    No goals yet — add the first goal for {area.name}.
                  </button>
                ) : (
                  forest.map((node) => (
                    <GoalTree
                      key={node.goal.id}
                      node={node}
                      depth={0}
                      collapsed={collapsed}
                      onToggle={toggle}
                      onEdit={(n) => setModal({ editing: n.goal, derived: isDerived(n) })}
                      onDelete={remove}
                      onConclude={(n) => setConclude({ goal: n.goal, pct: n.pct })}
                      onAddChild={(n) =>
                        setModal({
                          editing: null,
                          preset: { areaId: n.goal.areaId, period: childPeriod(n.goal.period), parentId: n.goal.id },
                          derived: false,
                        })
                      }
                    />
                  ))
                )}
              </div>

              {closed.length > 0 && <ClosedGoals goals={closed} onReopen={reopen} onDuplicate={duplicate} onDelete={removeGoal} />}
            </section>
          ))}
        </div>
      )}

      {modal && (
        <GoalModal
          areas={areas}
          goals={goals}
          editing={modal.editing}
          preset={modal.preset}
          derived={modal.derived}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}

      {conclude && (
        <div className="modal-overlay" onClick={() => setConclude(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">✓ Conclude goal</h2>
            <p className="muted goal-modal-note">
              Mark “{conclude.goal.text}” done and move it to Closed. Set the final progress to record honestly — even partial.
            </p>
            <label>
              Final progress: {conclude.pct}%
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={conclude.pct}
                onChange={(e) => setConclude((c) => (c ? { ...c, pct: Number(e.target.value) } : c))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setConclude(null)}>Cancel</button>
              <button type="button" className="btn" onClick={doConclude}>Conclude</button>
            </div>
          </div>
        </div>
      )}

      {openDue && <ReconciliationModal due={openDue} onClose={() => setOpenDue(null)} />}
    </div>
  );
}

/** Collapsed list of concluded/missed goals for one area, with frozen pct. */
function ClosedGoals({
  goals,
  onReopen,
  onDuplicate,
  onDelete,
}: {
  goals: Goal[];
  onReopen: (g: Goal) => void;
  onDuplicate: (g: Goal) => void;
  onDelete: (g: Goal) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="goal-closed">
      <button type="button" className="goal-closed-head" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Closed · {goals.length}
      </button>
      {open && (
        <div className="goal-closed-list">
          {goals.map((g) => (
            <div key={g.id} className={`goal-closed-row ${g.status}`}>
              <span className="goal-closed-icon">{g.icon}</span>
              <span className="goal-closed-text">{g.text}</span>
              <span className={`goal-closed-badge ${g.status}`}>
                {g.status === 'completed' ? `✓ Done — ${g.pct}%` : `✗ Missed — ${g.pct}%`}
              </span>
              <div className="goal-closed-actions">
                <button type="button" className="goal-act" title="Reopen" onClick={() => onReopen(g)}>↩</button>
                <button type="button" className="goal-act" title="Duplicate for next period" onClick={() => onDuplicate(g)}>⧉</button>
                <button type="button" className="goal-act danger" title="Delete" onClick={() => onDelete(g)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function childPeriod(p: GoalPeriod): GoalPeriod {
  if (p === 'annual') return 'half_year';
  if (p === 'half_year') return 'monthly';
  return 'weekly';
}

/** Shift a deadline forward one period (demo-only; the API does this server-side). */
function shiftByPeriodIso(iso: string, period: GoalPeriod): string {
  const d = new Date(iso);
  if (period === 'weekly') d.setDate(d.getDate() + 7);
  else if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (period === 'half_year') d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/** Areas come from the Today payload (demo seed or API), reused here. */
async function loadAreas(isGuest: boolean): Promise<LifeArea[]> {
  if (isGuest) return makeInitialState().areas;
  const r = await api<{ areas: ({ _id: string } & Omit<LifeArea, 'id'>)[] }>('/areas');
  return r.areas.map((a) => ({ id: a._id, name: a.name, icon: a.icon, color: a.color }));
}
