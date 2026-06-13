import { useState } from 'react';
import { useToday } from '../../today/useToday';
import type { Task } from '../../today/types';
import { isOnTodayPlate } from '../../today/budget';
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

/** Local YYYY-MM-DD for a deadline timestamp. */
function dueDateKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A task's effective deadline: its explicit `dueAt` date, else its slated
 *  `day` (the de-facto deadline when no deadline is set). */
function effDue(t: Task): string {
  return t.dueAt ? dueDateKey(t.dueAt) || t.day : t.day;
}

/** Tasks that aren't on today's plate. Pending = started but overdue (an earlier
 *  day whose deadline has passed, or an undated carry-over). Scheduled = not yet
 *  started (a future start day). Anything started and still within its deadline
 *  lives in Today's Tasks, not here. */
export function TaskBuckets({ which }: { which: 'pending' | 'upcoming' }) {
  const { state } = useToday();
  const today = state.day;
  const tasks = state.tasks
    .filter((t) => t.kind === 'task' && t.status !== 'done' && !isOnTodayPlate(state, t))
    .filter((t) => (which === 'pending' ? t.day < today : t.day > today))
    .sort((a, b) =>
      which === 'pending'
        ? effDue(a).localeCompare(effDue(b))
        : a.day.localeCompare(b.day),
    );
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
              <span className="bucket-day">{fmtDay(tone === 'pending' ? effDue(t) : t.day)}</span>
              {showCreated && t.createdAt && <span className="bucket-created">added {fmtCreated(t.createdAt)}</span>}
            </div>
            <TaskRow task={t} />
          </div>
        ))}
    </div>
  );
}
