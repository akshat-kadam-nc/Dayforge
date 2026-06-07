import type { GoogleAccount } from '../../google/api';

/** Read-only legend of connected Google accounts (colored sources). Toggle
 *  wiring lands with the Week view; for now it mirrors the synced accounts. */
export function CalendarLegend({ accounts }: { accounts: GoogleAccount[] }) {
  if (accounts.length === 0) return null;
  return (
    <div className="cal-legend">
      <span className="cal-legend-label">CALENDARS:</span>
      {accounts.map((a) => (
        <span key={a.id} className={`cal-src${a.enabled ? '' : ' off'}`}>
          <span className="cal-src-dot" style={{ background: a.color }} />
          {a.email}
        </span>
      ))}
    </div>
  );
}
