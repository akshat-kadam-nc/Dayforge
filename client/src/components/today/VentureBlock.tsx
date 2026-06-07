import { useToday } from '../../today/useToday';
import type { LifeArea } from '../../today/types';
import { allocatedForArea } from '../../today/budget';
import { formatMinutes } from '../../today/format';
import { TaskRow } from './TaskRow';

/** One venture/area group of tasks. Header is clickable to collapse. */
export function VentureBlock({ area }: { area: LifeArea }) {
  const { state, actions } = useToday();
  const tasks = state.tasks.filter(
    (t) => t.areaId === area.id && t.day === state.day && t.status !== 'done',
  );
  if (tasks.length === 0) return null;

  const collapsed = !!state.collapsedAreas[area.id];

  return (
    <div className="venture-block">
      <div className="vent-head" onClick={() => actions.toggleArea(area.id)}>
        <div className="vent-icon" style={{ background: `${area.color}1f` }}>{area.icon}</div>
        <span className="vent-name">{area.name}</span>
        <span className="vent-badge" style={{ background: `${area.color}1f`, color: area.color }}>
          {formatMinutes(allocatedForArea(state, area.id))}
        </span>
        <span className="vent-chev">{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && tasks.map((task) => <TaskRow key={task.id} task={task} />)}
    </div>
  );
}
