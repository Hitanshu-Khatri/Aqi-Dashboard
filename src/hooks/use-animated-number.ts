import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates a number toward a target value at ~60fps.
 *
 * Key behaviours:
 *  - If a new target arrives mid-animation, it starts from wherever the
 *    display currently is (no jump to the old target first).
 *  - Duration scales with the size of the delta so small changes are
 *    quick and large swings feel dramatic.
 *  - Uses an ease-in-out curve for a natural feel.
 */
export function useAnimatedNumber(target: number): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(0);
  const currentRef = useRef(target); // tracks the live float value

  useEffect(() => {
    const from = currentRef.current;
    const delta = target - from;
    if (delta === 0) return;

    // Reduced-motion: snap immediately
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    // Duration scales with delta size: 300ms–800ms
    const duration = Math.min(800, Math.max(300, Math.abs(delta) * 6));
    let start: number | null = null;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-in-out cubic: smooth acceleration and deceleration
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const value = from + delta * eased;
      currentRef.current = value;
      setDisplay(Math.round(value));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return display;
}
