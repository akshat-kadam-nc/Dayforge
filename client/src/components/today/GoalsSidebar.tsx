import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToday } from '../../today/useToday';
import type { Goal } from '../../today/types';
import { AddGoalModal } from './AddGoalModal';

const COLLAPSE_KEY = 'axiom.today.goalsCollapsed';

/**
 * Right rail: this week's active goals as a collapsible group. Rows are
 * read-through to the Goals page (the full editor) — this rail stays a glance
 * surface, not a second goal CRUD.
 */
export function GoalsSidebar() {
  const { state } = useToday();
  const navigate = useNavigate();
  const [addingGoal, setAddingGoal] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  // The rail only surfaces this week's ACTIVE goals; higher levels + concluded
  // goals live on the Goals page.
  const weeklyGoals = state.goals.filter((g) => g.period === 'weekly' && (g.status ?? 'active') === 'active');

  // Count completed linked tasks per goal so count-goal progress is live here.
  const doneByGoal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of state.tasks) {
      if (t.kind !== 'task' || !t.goalId || t.status !== 'done') continue;
      m[t.goalId] = (m[t.goalId] ?? 0) + 1;
    }
    return m;
  }, [state.tasks]);

  function goalProgress(g: Goal): { pct: number; tally?: string } {
    if (g.metric === 'count' && g.targetCount) {
      const done = doneByGoal[g.id] ?? 0;
      return { pct: Math.min(100, Math.round((done / g.targetCount) * 100)), tally: `${done}/${g.targetCount}` };
    }
    return { pct: g.pct };
  }

  // Hide goals already at 100% — a fully done goal still reads as `active` until
  // the server lazily resolves it (and manual-pct goals never flip), so filter
  // on the live computed progress, not just status. Full list stays on Goals.
  const visibleGoals = weeklyGoals.filter((g) => goalProgress(g).pct < 100);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside className="sidebar">
      <div className="goals-group">
        <div className="sidebar-title goals-group-head">
          <button
            type="button"
            className="goals-collapse"
            onClick={toggle}
            aria-label={collapsed ? 'Expand goals' : 'Collapse goals'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
          <span className="goals-group-label">This week's goals</span>
          <span className="goals-count">{visibleGoals.length}</span>
          {state.areas.length > 0 && (
            <button
              type="button"
              className="sidebar-add"
              title="Add a weekly goal"
              onClick={(e) => {
                e.stopPropagation();
                setAddingGoal(true);
              }}
            >
              ＋
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            {visibleGoals.length === 0 && <p className="muted sidebar-empty">No goals yet.</p>}
            {visibleGoals.map((g) => {
              const { pct, tally } = goalProgress(g);
              return (
                <button
                  key={g.id}
                  type="button"
                  className="goal-card goal-card-btn"
                  title="Open in Goals to edit"
                  onClick={() => navigate('/goals')}
                >
                  <div className="goal-top">
                    <span className="goal-icon">{g.icon}</span>
                    <span className="goal-text">{g.text}</span>
                    {tally && <span className="goal-tally">{tally}</span>}
                    <span className="goal-pct" style={{ color: g.color }}>{pct}%</span>
                    <span className="goal-edit-hint" aria-hidden>✎</span>
                  </div>
                  <div className="goal-bar">
                    <div className="goal-bar-fill" style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {addingGoal && <AddGoalModal onClose={() => setAddingGoal(false)} />}
    </aside>
  );
}
