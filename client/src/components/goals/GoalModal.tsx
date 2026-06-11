import { useMemo, useState } from 'react';
import type { Goal, GoalPeriod, LifeArea } from '../../today/types';
import { GOAL_PERIODS } from '../../today/types';
import { PERIOD_LABEL } from '../../goals/tree';
import type { GoalInput } from '../../goals/api';

const ICONS = ['🎯', '📚', '🤖', '✍️', '💪', '🚀', '📈', '🏆', '🧭', '⚡'];

const PERIOD_RANK: Record<GoalPeriod, number> = { weekly: 0, monthly: 1, half_year: 2, annual: 3 };

// Default deadline when "timed" is toggled on: one period out from today.
const PERIOD_DAYS: Record<GoalPeriod, number> = { weekly: 7, monthly: 30, half_year: 182, annual: 365 };
function defaultDue(period: GoalPeriod): string {
  const d = new Date();
  d.setDate(d.getDate() + PERIOD_DAYS[period]);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dueToDateInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface GoalModalProps {
  areas: LifeArea[];
  goals: Goal[];
  /** Editing an existing goal, or null for a new one. */
  editing?: Goal | null;
  /** Prefill for "add child/goal" affordances. */
  preset?: { areaId?: string; period?: GoalPeriod; parentId?: string };
  /** Whether this goal currently has linked tasks (weekly) or children — hides the manual slider. */
  derived?: boolean;
  onClose: () => void;
  onSave: (id: string | null, input: GoalInput) => Promise<void>;
}

/** Create or edit a goal at any level, with an optional parent one rung up. */
export function GoalModal({ areas, goals, editing, preset, derived, onClose, onSave }: GoalModalProps) {
  const [text, setText] = useState(editing?.text ?? '');
  const [areaId, setAreaId] = useState(editing?.areaId ?? preset?.areaId ?? areas[0]?.id ?? '');
  const [period, setPeriod] = useState<GoalPeriod>(editing?.period ?? preset?.period ?? 'weekly');
  const [icon, setIcon] = useState(editing?.icon ?? ICONS[0]);
  const [pct, setPct] = useState(editing?.pct ?? 0);
  const [parentId, setParentId] = useState<string>(editing?.parentId ?? preset?.parentId ?? '');
  const [isCount, setIsCount] = useState(editing?.metric === 'count');
  const [targetCount, setTargetCount] = useState(editing?.targetCount ?? 5);
  const [timed, setTimed] = useState(editing?.timed ?? false);
  const [dueDate, setDueDate] = useState(dueToDateInput(editing?.dueAt));
  const [busy, setBusy] = useState(false);

  const area = areas.find((a) => a.id === areaId);

  // count/timed are leaf-only: hide them if this goal already has children.
  // A new goal (no editing) never has children — guard so undefined ids don't
  // match every root goal's undefined parentId.
  const hasChildren = useMemo(
    () => !!editing && goals.some((g) => g.parentId === editing.id),
    [goals, editing],
  );

  // A parent must be in the same area and exactly one period-level up.
  const parentOptions = useMemo(() => {
    if (period === 'annual') return [];
    return goals.filter(
      (g) =>
        g.id !== editing?.id &&
        g.areaId === areaId &&
        PERIOD_RANK[g.period] === PERIOD_RANK[period] + 1,
    );
  }, [goals, areaId, period, editing?.id]);

  const parentValid = parentOptions.some((g) => g.id === parentId);
  const effectiveParent = parentValid ? parentId : '';
  // Linking under a parent makes this a leaf of that parent; count/timed still allowed
  // (this goal would be the leaf). They're only blocked when it has its OWN children.
  const showFacets = !hasChildren;

  function toggleTimed(on: boolean) {
    setTimed(on);
    if (on && !dueDate) setDueDate(defaultDue(period));
  }

  async function submit() {
    if (!text.trim() || !areaId || busy) return;
    if (isCount && (!targetCount || targetCount < 1)) return;
    if (timed && !dueDate) return;
    setBusy(true);
    try {
      const dueAt = timed && dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null;
      await onSave(editing?.id ?? null, {
        areaId,
        text: text.trim(),
        icon,
        color: area?.color ?? editing?.color ?? '#8b5cf6',
        period,
        pct: isCount ? undefined : pct,
        parentId: effectiveParent || null,
        metric: isCount ? 'count' : 'standard',
        targetCount: isCount ? targetCount : null,
        timed,
        dueAt,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{editing ? '✎ Edit goal' : '＋ New goal'}</h2>
        <label>
          Goal
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Go to the gym 5 times"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label>
          Life area
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)}>
            {GOAL_PERIODS.map((p) => (
              <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
            ))}
          </select>
        </label>
        {period !== 'annual' && (
          <label>
            Rolls up to
            <select value={effectiveParent} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No parent ({PERIOD_LABEL[period]} stands alone)</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>{g.icon} {g.text}</option>
              ))}
            </select>
          </label>
        )}

        {showFacets && (
          <>
            <label className="goal-facet">
              <span className="goal-facet-head">
                <input type="checkbox" checked={isCount} onChange={(e) => setIsCount(e.target.checked)} />
                Track by repetition (count completed tasks)
              </span>
            </label>
            {isCount && (
              <label>
                Target — complete this many tasks
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Math.max(1, Number(e.target.value)))}
                />
              </label>
            )}
            <label className="goal-facet">
              <span className="goal-facet-head">
                <input type="checkbox" checked={timed} onChange={(e) => toggleTimed(e.target.checked)} />
                Timed — fails if not met by a deadline
              </span>
            </label>
            {timed && (
              <label>
                Deadline
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            )}
          </>
        )}

        <label>
          Icon
          <div className="swatch-row">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                className={`icon-swatch${icon === i ? ' selected' : ''}`}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </label>
        {isCount ? (
          <p className="muted goal-modal-note">Progress counts completed tasks linked to this goal, up to the target.</p>
        ) : derived ? (
          <p className="muted goal-modal-note">
            Progress is derived automatically{period === 'weekly' ? ' from linked tasks.' : ' from child goals.'}
          </p>
        ) : (
          <label>
            Progress (manual): {pct}%
            <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : editing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
