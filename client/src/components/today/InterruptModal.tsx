import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToday } from '../../today/useToday';
import type { Interruption, InterruptionType } from '../../today/types';
import { INTERRUPT_ICON } from './InterruptionsBlock';
import { useToast } from '../Toast';
import { ApiError } from '../../api/client';

const TYPES: { type: InterruptionType; label: string }[] = [
  { type: 'fire', label: 'Fire' },
  { type: 'rabbit_hole', label: 'Rabbit Hole' },
  { type: 'distraction', label: 'Distraction' },
];

// Fixed duration buckets so logging is a single tap, no typing.
const DURATIONS = [15, 30, 45, 60, 90, 120];

// Preset distraction categories. Logging the title as the category lets us
// aggregate time lost to Games / Social Media etc. later. "Other" reveals a
// free-text box for anything outside the list.
const DISTRACTION_PRESETS = ['Games', 'Social Media', 'People', 'Other'] as const;

/** Logs a one-tap interruption, or edits an existing one when `editing` is set. */
export function InterruptModal({ editing, onClose }: { editing?: Interruption; onClose: () => void }) {
  const { actions } = useToday();
  const { toast } = useToast();
  const [type, setType] = useState<InterruptionType>(editing?.type ?? 'fire');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [minutes, setMinutes] = useState(editing?.minutes ?? 30);
  const [submitting, setSubmitting] = useState(false);

  // For a distraction, the title doubles as the category. Pre-select the matching
  // preset when editing; anything off-list lands in "Other" with its text kept.
  const editPreset = editing?.type === 'distraction'
    ? (DISTRACTION_PRESETS.find((p) => p === editing.title) ?? 'Other')
    : 'Games';
  const [preset, setPreset] = useState<(typeof DISTRACTION_PRESETS)[number]>(editPreset);
  const [otherText, setOtherText] = useState(
    editing?.type === 'distraction' && editPreset === 'Other' ? editing.title : '',
  );

  // Keep the duration buckets list valid even if an edited item has an off-list value.
  const durationOptions = DURATIONS.includes(minutes) ? DURATIONS : [...DURATIONS, minutes].sort((a, b) => a - b);

  function failureMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return 'Session expired. Log in again, then retry.';
      if (err.status === 503) return 'Server has no database connection. Not saved.';
      if (err.status === 400 || err.status === 422) return err.message || 'The server rejected the details.';
      return err.message || `Server error (${err.status}). Not saved.`;
    }
    if (err instanceof TypeError) return 'Network error. Check your connection — not saved.';
    return err instanceof Error && err.message ? err.message : 'Could not log the interruption.';
  }

  async function submit() {
    if (submitting) return;

    // Resolve the title. Distractions use the category (or the custom "Other" text);
    // fire/rabbit-hole fall back to the type label when left blank.
    let resolvedTitle: string;
    if (type === 'distraction') {
      if (preset === 'Other') {
        if (!otherText.trim()) {
          toast('Describe the distraction before saving.', 'error');
          return;
        }
        resolvedTitle = otherText.trim();
      } else {
        resolvedTitle = preset;
      }
    } else {
      resolvedTitle = title.trim() || TYPES.find((t) => t.type === type)!.label;
    }

    if (!DURATIONS.includes(minutes) && !(editing && minutes > 0)) {
      toast('Pick a duration before saving.', 'error');
      return;
    }

    const input = { type, title: resolvedTitle, note: note.trim() || undefined, minutes };
    setSubmitting(true);
    try {
      if (editing) {
        await actions.editInterruption(editing.id, input);
        toast('Interruption updated.', 'success');
      } else {
        await actions.logInterruption(input);
        toast('Interruption logged.', 'success');
      }
      onClose();
    } catch (err) {
      console.error('[today] interruption save failed', err);
      toast(failureMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? '✎ Edit interruption' : '⚡ Log interruption'}</h2>

        <div className="int-type-picker">
          {TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              className={`int-type-btn${type === t.type ? ' selected' : ''}`}
              onClick={() => setType(t.type)}
            >
              <span className="int-type-emoji">{INTERRUPT_ICON[t.type]}</span>
              {t.label}
            </button>
          ))}
        </div>

        {type === 'distraction' ? (
          <label>
            What kind?
            <div className="toggle-pills inline int-preset-pills">
              {DISTRACTION_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={preset === p ? 'active' : ''}
                  onClick={() => setPreset(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>
        ) : (
          <label>
            What pulled you away?
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" autoFocus />
          </label>
        )}

        {type === 'distraction' && preset === 'Other' && (
          <label>
            Describe it
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="e.g. Noise, Errand"
              autoFocus
            />
          </label>
        )}

        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Duration
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {durationOptions.map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="btn" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save' : 'Log it'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
