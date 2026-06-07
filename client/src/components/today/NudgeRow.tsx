import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { overflowMinutes } from '../../today/budget';
import { formatMinutes } from '../../today/format';
import type { ReconciliationDue } from '../../today/types';
import { ReconciliationModal } from './ReconciliationModal';

const SCOPE_LABEL: Record<ReconciliationDue['scope'], string> = {
  week: 'Weekly close',
  month: 'Monthly close',
  half_year: 'Half-year checkpoint',
};

export function NudgeRow() {
  const { state } = useToday();
  const overflow = overflowMinutes(state);
  const delegations = state.tasks.filter((t) => t.delegateName).length;
  const due = state.dueReconciliations;
  const [openDue, setOpenDue] = useState<ReconciliationDue | null>(null);

  if (overflow <= 0 && delegations === 0 && due.length === 0) return null;

  return (
    <div className="nudge-row">
      {due.map((d) => (
        <button
          key={`${d.scope}:${d.periodKey}`}
          type="button"
          className="nudge nudge-recon"
          onClick={() => setOpenDue(d)}
        >
          <span className="nudge-emoji">🗓</span> {SCOPE_LABEL[d.scope]} ready — <strong>{d.label}</strong>
        </button>
      ))}

      {overflow > 0 && (
        <div className="nudge nudge-overflow">
          <span className="nudge-emoji">⚠️</span> Over by <strong>{formatMinutes(overflow)}</strong> today
        </div>
      )}
      {delegations > 0 && (
        <div className="nudge nudge-deleg">
          <span className="nudge-emoji">👥</span> Delegation follow-ups due
          <span className="nudge-badge">{delegations}</span>
        </div>
      )}

      {openDue && <ReconciliationModal due={openDue} onClose={() => setOpenDue(null)} />}
    </div>
  );
}
