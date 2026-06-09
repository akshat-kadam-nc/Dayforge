import { useState } from 'react';
import type { DelegationInput } from '../../team/api';
import { DELEGATION_STATUSES, STATUS_LABEL, type Delegation, type DelegationStatus, type Person } from '../../team/types';

const VENTURE_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#22c55e', '#3b82f6'];

/** ISO datetime -> yyyy-mm-dd for a date input. */
function toDateInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** date input value -> ISO at local noon (avoids day-slip across timezones). */
function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(`${v}T12:00:00`).toISOString();
}

export interface AssignModalProps {
  people: Person[];
  defaultPersonId?: string;
  editing?: Delegation;
  onClose: () => void;
  onSave: (editing: Delegation | undefined, input: DelegationInput) => Promise<void>;
}

/** Create or edit a delegated piece of work (the "Assign work" / Quick-assign flow). */
export function AssignModal({ people, defaultPersonId, editing, onClose, onSave }: AssignModalProps) {
  const [personId, setPersonId] = useState(editing?.personId ?? defaultPersonId ?? people[0]?.id ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [ventureLabel, setVentureLabel] = useState(editing?.ventureLabel ?? '');
  const [ventureColor, setVentureColor] = useState(editing?.ventureColor ?? VENTURE_COLORS[0]);
  const [status, setStatus] = useState<DelegationStatus>(editing?.status ?? 'pending');
  const [dueAt, setDueAt] = useState(toDateInput(editing?.dueAt));
  const [followUpAt, setFollowUpAt] = useState(toDateInput(editing?.followUpAt));
  const [recurrence, setRecurrence] = useState(editing?.recurrence ?? '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !personId || busy) return;
    setBusy(true);
    try {
      await onSave(editing, {
        personId,
        title: title.trim(),
        ventureLabel: ventureLabel.trim(),
        ventureColor,
        status,
        dueAt: fromDateInput(dueAt),
        followUpAt: fromDateInput(followUpAt),
        recurrence: recurrence.trim(),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? '✎ Edit delegation' : '＋ Assign work'}</h2>
        <label>
          To
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.role ? ` · ${p.role}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Task
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Final QA pass before deploy"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label>
          Context (venture / project)
          <input value={ventureLabel} onChange={(e) => setVentureLabel(e.target.value)} placeholder="e.g. Zuma AI" />
        </label>
        <label>
          Tag color
          <div className="swatch-row">
            {VENTURE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch${ventureColor === c ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setVentureColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as DelegationStatus)}>
            {DELEGATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-row">
          <label>
            Due date
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
          <label>
            Follow-up
            <input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
          </label>
        </div>
        <label>
          Recurring (optional)
          <input
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            placeholder="e.g. Weekly · Fri (leave blank for one-off)"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : editing ? 'Save' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
