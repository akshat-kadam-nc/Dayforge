import { useEffect, useState } from 'react';
import { CELEBRATE_EVENT, type CelebrateDetail } from '../../today/celebrate';
import { formatMinutes } from '../../today/format';

interface Shown extends CelebrateDetail {
  key: number;
}

/** Floating reward burst shown when a task is completed. Mounted once at the
 *  cockpit level; listens for the celebrate event and auto-dismisses. */
export function CelebrationLayer() {
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    function onCelebrate(e: Event) {
      const detail = (e as CustomEvent<CelebrateDetail>).detail;
      setShown({ ...detail, key: Date.now() });
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => setShown(null), 1800);
    }
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!shown) return null;

  const { gained } = shown;
  const headline =
    gained > 0
      ? `+${formatMinutes(gained)} under plan`
      : gained < 0
        ? `${formatMinutes(-gained)} over — done!`
        : 'Right on plan';

  return (
    <div className="celebrate-layer" aria-live="polite">
      <div key={shown.key} className="celebrate-badge">
        <span className="celebrate-check">✓</span>
        <span className="celebrate-text">
          <span className="celebrate-headline">{headline}</span>
          <span className="celebrate-title">{shown.title}</span>
        </span>
      </div>
    </div>
  );
}
