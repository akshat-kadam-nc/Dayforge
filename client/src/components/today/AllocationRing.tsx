import { useToday } from '../../today/useToday';
import {
  RING_RADIUS,
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

  return (
    <div className="card">
      <div className="card-title">24-Hour Allocation</div>
      <div className="ring-body">
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
    </div>
  );
}
