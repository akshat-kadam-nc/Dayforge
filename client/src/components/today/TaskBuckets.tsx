import { useState } from 'react';
import { useToday } from '../../today/useToday';
import type { Task } from '../../today/types';
import { TaskRow } from './TaskRow';

function fmtDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtCreated(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Overdue (past-day, unfinished) or Scheduled (future-day) tasks in a
 *  collapsible section. They share the tasks array but sit outside Today. */
export function TaskBuckets({ which }: { which: 'pending' | 'upcoming' }) {
  const { state } = useToday();
  const tasks = state.tasks
    .filter((t) => (which === 'pending' ? t.day < state.day : t.day > state.day) && t.status !== 'done')
    .sort((a, b) => a.day.localeCompare(b.day));
  if (tasks.length === 0) return null;

  return which === 'pending' ? (
    <Bucket title="Pending" emoji="📌" tone="pending" tasks={tasks} defaultOpen showCreated />
  ) : (
    <Bucket title="Scheduled" emoji="🗓" tone="upcoming" tasks={tasks} />
  );
}

function Bucket({
  title,
  emoji,
  tone,
  tasks,
  defaultOpen = false,
  showCreated = false,
}: {
  title: string;
  emoji: string;
  tone: 'pending' | 'upcoming';
  tasks: Task[];
  defaultOpen?: boolean;
  showCreated?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`venture-block bucket-block bucket-${tone}`}>
      <div className="vent-head" onClick={() => setOpen((v) => !v)}>
        <div className="vent-icon bucket-icon">{emoji}</div>
        <span className="vent-name">{title}</span>
        <span className="vent-badge bucket-badge">{tasks.length}</span>
        <span className="vent-chev">{open ? '▾' : '▸'}</span>
      </div>
      {open &&
        tasks.map((t) => (
          <div key={t.id} className="bucket-item">
            <div className="bucket-meta">
              <span className="bucket-day">{fmtDay(t.day)}</span>
              {showCreated && t.createdAt && <span className="bucket-created">added {fmtCreated(t.createdAt)}</span>}
            </div>
            <TaskRow task={t} />
          </div>
        ))}
    </div>
  );
}
