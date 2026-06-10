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
}

/** One goal row plus its nested children, indented by depth. */
export function GoalTree({ node, depth, collapsed, onToggle, onEdit, onDelete, onAddChild }: GoalTreeProps) {
  const { goal, pct, rollup, children } = node;
  const hasChildren = children.length > 0;
  const isOpen = !collapsed[goal.id];
  const childPeriod = childPeriodOf(goal.period);

  // Weekly leaves show their linked-task tally; parents show a child count.
  // Guard the period lookup so a legacy goal with a missing/unknown period can
  // never throw and blank the page.
  const childLabel = hasChildren ? (PERIOD_LABEL[children[0].goal.period] ?? 'goal').toLowerCase() : '';
  const tally = goal.period === 'weekly' && rollup
    ? `${rollup.countDone}/${rollup.countTotal} tasks`
    : hasChildren
      ? `${children.length} ${childLabel}`
      : null;

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
          </div>
          <div className="goal-row-bar">
            <div className="goal-row-fill" style={{ width: `${pct}%`, background: goal.color }} />
          </div>
        </div>
        <span className="goal-row-pct" style={{ color: goal.color }}>{pct}%</span>
        <div className="goal-row-actions">
          {childPeriod && (
            <button type="button" className="goal-act" title={`Add ${PERIOD_LABEL[childPeriod]} child`} onClick={() => onAddChild(node)}>＋</button>
          )}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
