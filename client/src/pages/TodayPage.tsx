import { useEffect, useState } from 'react';
import { Placeholder } from '../components/Placeholder';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface Task {
  _id: string;
  title: string;
  status: string;
  estimateMinutes: number;
}

export function TodayPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [note, setNote] = useState<string>('Loading today…');

  useEffect(() => {
    api<{ tasks: Task[] }>('/tasks')
      .then((res) => {
        setTasks(res.tasks);
        setNote(res.tasks.length ? '' : 'No tasks yet. The task model is wired and ready.');
      })
      .catch((err) => {
        setNote(
          err instanceof ApiError && err.status === 503
            ? 'Backend is running without a database. Add MONGODB_URI to server/.env to enable tasks.'
            : 'Could not load tasks.',
        );
      });
  }, []);

  return (
    <Placeholder title={`Hi ${user?.name ?? ''}`} emoji="🎯">
      <p className="muted">
        This is the Today cockpit shell. The locked design lives in <code>mockups/today-v5.html</code>:
        daily budget ring, live timer, ⚡ interruption logging, planned-vs-actual.
      </p>
      {note && <p className="muted">{note}</p>}
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t._id}>
            <span>{t.title}</span>
            <span className="muted">{t.estimateMinutes}m</span>
          </li>
        ))}
      </ul>
    </Placeholder>
  );
}
