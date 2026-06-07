import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatMinutes } from '../../today/format';

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
      {open &&
        done.map((t) => {
          const gained = t.estimateMinutes - t.loggedMinutes;
          return (
            <div key={t.id} className="fold-item">
              <span className="fold-check">✓</span>
              <span className="fold-name">{t.title}</span>
              <span className="fold-logged">{formatMinutes(t.loggedMinutes)}</span>
              {t.estimateMinutes > 0 && (
                <span className={gained >= 0 ? 'fold-gain' : 'fold-loss'}>
                  {gained >= 0 ? `+${formatMinutes(gained)}` : `−${formatMinutes(-gained)}`}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}
