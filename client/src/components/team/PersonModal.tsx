import { useState } from 'react';
import type { PersonInput } from '../../team/api';
import type { Person } from '../../team/types';

const PERSON_COLORS = ['#3b82f6', '#ec4899', '#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#f43f5e', '#a855f7', '#d97706'];

export interface PersonModalProps {
  editing?: Person;
  onClose: () => void;
  onSave: (editing: Person | undefined, input: PersonInput) => Promise<void>;
  onDelete?: (person: Person) => Promise<void>;
}

/** Add or edit a direct report. */
export function PersonModal({ editing, onClose, onSave, onDelete }: PersonModalProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [role, setRole] = useState(editing?.role ?? '');
  const [color, setColor] = useState(editing?.color ?? PERSON_COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onSave(editing, { name: name.trim(), role: role.trim(), color });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || !onDelete || busy) return;
    if (!window.confirm(`Delete ${editing.name}? Their delegated tasks will be removed too.`)) return;
    setBusy(true);
    try {
      await onDelete(editing);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? '✎ Edit report' : '＋ Add report'}</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Carter"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label>
          Role / context
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Developer" />
        </label>
        <label>
          Color
          <div className="swatch-row">
            {PERSON_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch${color === c ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <div className="modal-actions">
          {editing && onDelete && (
            <button type="button" className="btn-danger person-delete" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : editing ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
