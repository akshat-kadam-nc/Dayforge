import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatMinutes } from '../../today/format';
import { completedTodayTasks } from '../../today/budget';
import { useToast } from '../Toast';

function fmtStamp(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CompletedFold() {
  const { state, actions } = useToday();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const done = completedTodayTasks(state);
  if (done.length === 0) return null;

  function startEdit(id: string, loggedMinutes: number) {
    setEditingId(id);
    setDraft(String(Math.round(loggedMinutes)));
  }
  function saveEdit(id: string) {
    const mins = Math.round(Number(draft));
    if (Number.isFinite(mins) && mins >= 0) {
      actions.adjustLogged(id, mins);
      toast('Logged time updated', 'success');
    }
    setEditingId(null);
  }
  function reopen(id: string) {
    if (editingId === id) setEditingId(null);
    actions.uncomplete(id);
    toast('Task reopened', 'info');
  }

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
            <span className="fold-col" />
          </div>
          {done.map((t) => {
            const gained = t.estimateMinutes - t.loggedMinutes;
            const editing = editingId === t.id;
            return (
              <div key={t.id} className="fold-row">
                <span className="fold-name">✓ {t.title}</span>
                <span className="fold-col">
                  {editing ? (
                    <input
                      className="fold-log-input"
                      type="number"
                      min="0"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(t.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    formatMinutes(t.loggedMinutes)
                  )}
                </span>
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
                <span className="fold-col fold-acts">
                  {editing ? (
                    <>
                      <button type="button" className="fold-act" title="Save logged time" onClick={() => saveEdit(t.id)}>✓</button>
                      <button type="button" className="fold-act" title="Cancel" onClick={() => setEditingId(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="fold-act" title="Adjust logged time" onClick={() => startEdit(t.id, t.loggedMinutes)}>✎</button>
                      <button type="button" className="fold-act" title="Reopen — move back to today" onClick={() => reopen(t.id)}>↩</button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
