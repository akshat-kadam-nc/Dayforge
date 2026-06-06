import { useState } from 'react';
import { AddVentureModal } from './AddVentureModal';

/** Shown on Today when the account has no ventures yet. */
export function EmptyState() {
  const [adding, setAdding] = useState(false);
  return (
    <div className="empty-state card">
      <div className="empty-emoji">🧭</div>
      <h2>Set up your first venture</h2>
      <p className="muted">
        AXIOM organises your day by venture (DeveLearn, Zuma AI, and so on). Add one to start
        capturing tasks and tracking where your time goes.
      </p>
      <button type="button" className="btn" onClick={() => setAdding(true)}>
        ＋ Add a venture
      </button>
      {adding && <AddVentureModal onClose={() => setAdding(false)} />}
    </div>
  );
}
