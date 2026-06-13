import { useToday } from '../../today/useToday';
import {
  RING_RADIUS,
  allocatedForArea,
  interruptedMinutes,
  ringSegments,
  toRingDashes,
} from '../../today/budget';
import { formatMinutes, formatMinutesCompact } from '../../today/format';
import { useCountUp } from '../../today/useCountUp';

export function AllocationRing() {
  const { state } = useToday();
  const segments = ringSegments(state);
  const dashes = toRingDashes(segments);
  const interrupted = useCountUp(interruptedMinutes(state));

  // Per-venture split fills the card's right half (moved out of the rail so the
  // donut and the bars — both "where today's time went" — live together).
  const splits = [
    ...state.areas.map((a) => ({
      id: a.id,
      icon: a.icon,
      name: a.name,
      color: a.color,
      minutes: allocatedForArea(state, a.id),
    })),
    {
      id: 'interruptions',
      icon: '🔥',
      name: 'Interruptions',
      color: '#f43f5e',
      minutes: interruptedMinutes(state),
    },
  ].filter((s) => s.minutes > 0);
  const max = Math.max(1, ...splits.map((s) => s.minutes));

  return (
    <div className="card">
      <div className="card-title">24-Hour Allocation</div>
      <div className="ring-body">
        <div className="ring-left">
          <div className="ring-wrap">
            <svg viewBox="0 0 128 128" width="128" height="128">
              <circle cx="64" cy="64" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="13" />
              <g className="ring-anim">
                {dashes.map(({ seg, dasharray, dashoffset }) => (
                  <circle
                    key={seg.id}
                    className="ring-seg"
                    cx="64"
                    cy="64"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    transform="rotate(-90 64 64)"
                  />
                ))}
              </g>
            </svg>
            <div className="ring-center">
              <span className="ring-cv">{formatMinutesCompact(interrupted)}</span>
              <span className="ring-cl">interrupted</span>
            </div>
          </div>
          <div className="ring-legend">
            {segments.map((seg) => (
              <div key={seg.id} className="leg">
                <div className="leg-dot" style={{ background: seg.color }} />
                {seg.label}
                <span className="leg-val">{formatMinutes(seg.minutes)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ring-areas">
          <div className="ring-areas-title">Today by area</div>
          {splits.length === 0 ? (
            <p className="muted ring-areas-empty">Nothing logged yet.</p>
          ) : (
            splits.map((s) => (
              <div key={s.id} className="split-item">
                <span className="split-icon">{s.icon}</span>
                <span className="split-name" style={s.id === 'interruptions' ? { color: '#be123c' } : undefined}>
                  {s.name}
                </span>
                <div className="split-bar">
                  <div className="split-bar-fill" style={{ width: `${(s.minutes / max) * 100}%`, background: s.color }} />
                </div>
                <span className="split-val" style={s.id === 'interruptions' ? { color: '#be123c' } : undefined}>
                  {formatMinutes(s.minutes)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
