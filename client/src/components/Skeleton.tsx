/** Shimmering placeholder block. Width/height accept any CSS length. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** Loading stand-in for the Today cockpit main column — mirrors its rhythm
 *  (budget card, ring, a couple of task blocks) so the swap to real data
 *  doesn't jump the layout. */
export function CockpitSkeleton() {
  return (
    <div className="cockpit-skeleton" aria-busy="true" aria-label="Loading your day">
      <div className="skel-card">
        <Skeleton width={120} height={11} />
        <Skeleton width="100%" height={48} radius={12} />
        <Skeleton width="70%" height={11} />
      </div>
      <div className="skel-ring">
        <Skeleton width={148} height={148} radius="50%" />
        <div className="skel-ring-legend">
          <Skeleton width="80%" height={12} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="70%" height={12} />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div className="skel-card" key={i}>
          <Skeleton width={140} height={13} />
          <Skeleton width="100%" height={34} radius={10} />
          <Skeleton width="100%" height={34} radius={10} />
        </div>
      ))}
    </div>
  );
}
