import { useToday } from '../../today/useToday';
import { overflowMinutes } from '../../today/budget';
import { formatMinutes } from '../../today/format';

/**
 * Today nudges: only time-of-day signals (overflow, delegation follow-ups).
 * Reconciliation/close-out prompts live on the Goals page now.
 */
export function NudgeRow() {
  const { state } = useToday();
  const overflow = overflowMinutes(state);
  const delegations = state.tasks.filter((t) => t.delegateName).length;

  if (overflow <= 0 && delegations === 0) return null;

  return (
    <div className="nudge-row">
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
    </div>
  );
}
