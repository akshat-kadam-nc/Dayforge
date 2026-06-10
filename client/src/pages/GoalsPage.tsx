import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { makeInitialState } from '../today/seed';
import type { Goal, GoalPeriod, LifeArea } from '../today/types';
import { apiGoalsRepo, localGoalsRepo, type GoalsRepo } from '../goals/repo';
import { buildForest, type RollupMap, type GoalNode } from '../goals/tree';
import type { GoalInput } from '../goals/api';
import { GoalTree } from '../components/goals/GoalTree';
import { GoalModal } from '../components/goals/GoalModal';
import { PageEmpty } from '../components/PageEmpty';
import '../styles/today.css';
import '../styles/goals.css';

type ModalState = { editing: Goal | null; preset?: { areaId?: string; period?: GoalPeriod; parentId?: string }; derived: boolean };

export function GoalsPage() {
  const { isGuest } = useAuth();
  const repo: GoalsRepo = isGuest ? localGoalsRepo : apiGoalsRepo;

  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rollup, setRollup] = useState<RollupMap>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

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

  // Build a forest per life area. Every area is shown — even with no goals yet —
  // so each venture has a visible card and an add-goal entry point.
  const byArea = useMemo(() => {
    return areas.map((area) => ({
      area,
      forest: buildForest(goals.filter((g) => g.areaId === area.id), rollup),
    }));
  }, [areas, goals, rollup]);

  function toggle(id: string) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }

  async function save(id: string | null, input: GoalInput) {
    if (id) {
      await repo.update(id, input);
      // Merge the saved fields into local state (api and demo agree on values).
      setGoals((gs) =>
        gs.map((g) => (g.id === id ? { ...g, ...input, parentId: input.parentId ?? undefined } : g)),
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

  // A node's progress is derived (hide the manual slider) when it's a weekly with
  // linked tasks or any goal that has children.
  function isDerived(node: GoalNode): boolean {
    return node.children.length > 0 || (node.goal.period === 'weekly' && !!node.rollup && node.rollup.estTotal > 0);
  }

  return (
    <div className="goals-page">
      <div className="goals-topbar">
        <div>
          <h1 className="goals-title">Goals</h1>
          <p className="goals-sub muted">Annual → Half-year → Monthly → Weekly, per life area. Weekly progress tracks linked tasks.</p>
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
          {byArea.map(({ area, forest }) => (
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
    </div>
  );
}

function childPeriod(p: GoalPeriod): GoalPeriod {
  if (p === 'annual') return 'half_year';
  if (p === 'half_year') return 'monthly';
  return 'weekly';
}

/** Areas come from the Today payload (demo seed or API), reused here. */
async function loadAreas(isGuest: boolean): Promise<LifeArea[]> {
  if (isGuest) return makeInitialState().areas;
  const r = await api<{ areas: ({ _id: string } & Omit<LifeArea, 'id'>)[] }>('/areas');
  return r.areas.map((a) => ({ id: a._id, name: a.name, icon: a.icon, color: a.color }));
}
