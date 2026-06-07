import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatMinutes } from '../../today/format';

function fmtStamp(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CompletedFold() {
  const { state } = useToday();
  const [open, setOpen] = useState(false);
  const done = state.tasks.filter((t) => t.status === 'done');
  if (done.length === 0) return null;

  return (
    <div className="completed-fold">
      <div className="fold-head" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} &nbsp; Completed today &nbsp;({done.length}) ✓
      </div>
      {open && (
        <div className="fold-table">
          <div className="fold-row fold-header">
            <span className="fold-name">Task</span>
            <span className="fold-col">Logged</span>
            <span className="fold-col">Δ vs plan</span>
            <span className="fold-col">Created</span>
            <span className="fold-col">Completed</span>
          </div>
          {done.map((t) => {
            const gained = t.estimateMinutes - t.loggedMinutes;
            return (
              <div key={t.id} className="fold-row">
                <span className="fold-name">✓ {t.title}</span>
                <span className="fold-col">{formatMinutes(t.loggedMinutes)}</span>
                <span className="fold-col">
                  {t.estimateMinutes > 0 ? (
                    <span className={gained >= 0 ? 'fold-gain' : 'fold-loss'}>
                      {gained >= 0 ? `+${formatMinutes(gained)}` : `−${formatMinutes(-gained)}`}
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="fold-col fold-stamp">{fmtStamp(t.createdAt)}</span>
                <span className="fold-col fold-stamp">{fmtStamp(t.completedAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
