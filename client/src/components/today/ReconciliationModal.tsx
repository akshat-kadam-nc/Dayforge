import { useState } from 'react';
import { useToday } from '../../today/useToday';
import type { ReconciliationDue, ReconScope } from '../../today/types';
import { formatMinutes } from '../../today/format';

/** Structured close-out prompts per scope (not a blank journal). */
const PROMPTS: Record<ReconScope, { key: string; question: string }[]> = {
  week: [
    { key: 'wins', question: 'What went well this week?' },
    { key: 'drag', question: 'What pulled you off track?' },
    { key: 'next', question: 'Top priority for next week?' },
  ],
  month: [
    { key: 'wins', question: 'Biggest wins this month?' },
    { key: 'drag', question: 'What consistently ate your time?' },
    { key: 'next', question: 'What will you change next month?' },
  ],
  half_year: [
    { key: 'wins', question: 'Major progress this half?' },
    { key: 'drag', question: 'What stalled or slipped?' },
    { key: 'next', question: 'Focus for the next half?' },
  ],
};

const SCOPE_TITLE: Record<ReconScope, string> = {
  week: 'Weekly close',
  month: 'Monthly close',
  half_year: 'Half-year checkpoint',
};

export function ReconciliationModal({ due, onClose }: { due: ReconciliationDue; onClose: () => void }) {
  const { state, actions } = useToday();
  const prompts = PROMPTS[due.scope];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);

  const { stats } = due;
  const adherence = stats.allocated > 0 ? Math.round((stats.logged / stats.allocated) * 100) : 0;
  const topAreas = [...stats.perArea]
    .filter((p) => p.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 4)
    .map((p) => ({ name: state.areas.find((a) => a.id === p.areaId)?.name ?? 'Area', color: state.areas.find((a) => a.id === p.areaId)?.color ?? '#94a3b8', minutes: p.minutes }));

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await actions.saveReconciliation({
        scope: due.scope,
        periodKey: due.periodKey,
        periodStart: due.start,
        periodEnd: due.end,
        label: due.label,
        rating: rating || undefined,
        responses: prompts.map((p) => ({ key: p.key, question: p.question, answer: answers[p.key] ?? '' })),
        stats: due.stats,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card recon-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">🗓 {SCOPE_TITLE[due.scope]} · {due.label}</h2>
        <p className="recon-range">{due.start} → {due.end}</p>

        <div className="recon-stats">
          <ReconStat value={formatMinutes(stats.allocated)} label="Planned" />
          <ReconStat value={formatMinutes(stats.logged)} label="Tracked" color="var(--success)" />
          <ReconStat value={formatMinutes(stats.interrupted)} label="Interrupted" color="var(--fire)" />
          <ReconStat value={`${adherence}%`} label="Plan adherence" />
        </div>

        {topAreas.length > 0 && (
          <div className="recon-areas">
            {topAreas.map((a) => (
              <span key={a.name} className="recon-area-chip" style={{ background: `${a.color}1f`, color: a.color }}>
                {a.name} {formatMinutes(a.minutes)}
              </span>
            ))}
          </div>
        )}

        {prompts.map((p) => (
          <label key={p.key} className="recon-q">
            {p.question}
            <textarea
              rows={2}
              value={answers[p.key] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [p.key]: e.target.value }))}
              placeholder="…"
            />
          </label>
        ))}

        <div className="recon-rating">
          <span>How did it go?</span>
          <div className="recon-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`recon-star${rating >= n ? ' on' : ''}`}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Later</button>
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : 'Save close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReconStat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-val" style={color ? { color } : undefined}>{value}</span>
      <span className="stat-pill-lbl">{label}</span>
    </div>
  );
}
