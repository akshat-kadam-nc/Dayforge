import type { GoalNode } from '../../goals/tree';
import { PERIOD_LABEL, childPeriodOf } from '../../goals/tree';

export interface GoalTreeProps {
  node: GoalNode;
  depth: number;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onEdit: (node: GoalNode) => void;
  onDelete: (node: GoalNode) => void;
  onAddChild: (node: GoalNode) => void;
  onConclude: (node: GoalNode) => void;
}

/** "due in 3d" / "due today" / "2d overdue" for a timed goal's deadline. */
function deadlineLabel(iso: string): { text: string; overdue: boolean } {
  const due = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - start.getTime()) / 86400000);
  if (days === 0) return { text: 'due today', overdue: false };
  if (days < 0) return { text: `${-days}d overdue`, overdue: true };
  if (days === 1) return { text: 'due tomorrow', overdue: false };
  return { text: `due in ${days}d`, overdue: false };
}

/** One goal row plus its nested children, indented by depth. */
export function GoalTree({ node, depth, collapsed, onToggle, onEdit, onDelete, onAddChild, onConclude }: GoalTreeProps) {
  const { goal, pct, rollup, children } = node;
  const hasChildren = children.length > 0;
  const isOpen = !collapsed[goal.id];
  const childPeriod = childPeriodOf(goal.period);
  const isCount = goal.metric === 'count';

  // count → "3/5 done"; weekly standard → linked-task tally; parent → child count.
  const childLabel = hasChildren ? (PERIOD_LABEL[children[0].goal.period] ?? 'goal').toLowerCase() : '';
  const tally = isCount
    ? `${rollup?.countDone ?? 0}/${goal.targetCount ?? 0} done`
    : goal.period === 'weekly' && rollup
      ? `${rollup.countDone}/${rollup.countTotal} tasks`
      : hasChildren
        ? `${children.length} ${childLabel}`
        : null;
  const deadline = goal.timed && goal.dueAt ? deadlineLabel(goal.dueAt) : null;

  return (
    <div className="goal-node" style={{ marginLeft: depth === 0 ? 0 : 18 }}>
      <div className={`goal-row level-${goal.period}`} style={{ ['--goal-color' as string]: goal.color }}>
        <button
          type="button"
          className={`goal-twist${hasChildren ? '' : ' empty'}`}
          onClick={() => hasChildren && onToggle(goal.id)}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (isOpen ? '▾' : '▸') : '•'}
        </button>
        <span className="goal-row-icon">{goal.icon}</span>
        <div className="goal-row-main">
          <div className="goal-row-top">
            <span className="goal-level-tag">{PERIOD_LABEL[goal.period] ?? goal.period}</span>
            <span className="goal-row-text">{goal.text}</span>
            {tally && <span className="goal-row-tally">{tally}</span>}
            {deadline && (
              <span className={`goal-deadline${deadline.overdue ? ' overdue' : ''}`}>⏳ {deadline.text}</span>
            )}
          </div>
          <div className="goal-row-bar">
            <div className="goal-row-fill" style={{ width: `${pct}%`, background: goal.color }} />
          </div>
        </div>
        <span className="goal-row-pct" style={{ color: goal.color }}>{pct}%</span>
        <div className="goal-row-actions">
          {childPeriod && !isCount && (
            <button type="button" className="goal-act" title={`Add ${PERIOD_LABEL[childPeriod]} child`} onClick={() => onAddChild(node)}>＋</button>
          )}
          <button type="button" className="goal-act" title="Conclude (mark done / close out)" onClick={() => onConclude(node)}>✓</button>
          <button type="button" className="goal-act" title="Edit" onClick={() => onEdit(node)}>✎</button>
          <button type="button" className="goal-act danger" title="Delete" onClick={() => onDelete(node)}>🗑</button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="goal-children">
          {children.map((c) => (
            <GoalTree
              key={c.goal.id}
              node={c}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onConclude={onConclude}
            />
          ))}
        </div>
      )}
    </div>
  );
}
