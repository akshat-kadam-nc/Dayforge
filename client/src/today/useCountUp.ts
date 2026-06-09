import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number toward `target` (ease-out cubic). Counts from 0 on first
 * mount and tweens from the previous value on change, so figures feel earned
 * rather than snapping in. Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduce || from === target || duration <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (target - from) * ease(p)));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target; // settle so the next change tweens from here
    };
  }, [target, duration]);

  return value;
}
