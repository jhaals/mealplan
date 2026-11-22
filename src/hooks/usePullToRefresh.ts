import { useEffect, useState } from 'react';

/** Pull distance (px, after resistance) that triggers a reload. */
export const PULL_THRESHOLD = 72;
const MAX_PULL = 110;
const RESISTANCE = 0.5;
/** A touch that rests longer than this before pulling is a long-press (drag-and-drop), not a pull. */
const LONG_PRESS_MS = 200;

/** Home-screen apps have no browser chrome, so they get no native pull-to-refresh. */
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** True when the touch began inside something that should keep the gesture: a field or an inner scroller. */
function startsInsideScrollableOrField(target: EventTarget | null) {
  for (let node = target instanceof Element ? target : null; node && node !== document.body; node = node.parentElement) {
    if (node.matches('input, textarea, select, [contenteditable="true"], [popover]')) return true;
    if (node.scrollTop > 0) return true;
  }
  return false;
}

/**
 * Pull down from the top of the page to reload it. A full reload fetches the
 * current index.html, so a new deploy's styles and scripts load too.
 */
export function usePullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isStandalone()) return;

    let startY = 0;
    let startTime = 0;
    let tracking = false;
    let distance = 0;

    const reset = () => {
      tracking = false;
      distance = 0;
      setPull(0);
    };

    const onStart = (event: TouchEvent) => {
      tracking =
        event.touches.length === 1 &&
        window.scrollY <= 0 &&
        !startsInsideScrollableOrField(event.target);
      startY = event.touches[0]?.clientY ?? 0;
      startTime = event.timeStamp;
      distance = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const delta = (event.touches[0]?.clientY ?? startY) - startY;
      if (distance === 0 && delta > 4 && event.timeStamp - startTime > LONG_PRESS_MS) {
        reset();
        return;
      }
      if (delta <= 0 || window.scrollY > 0) {
        if (distance > 0) reset();
        return;
      }
      distance = Math.min(MAX_PULL, delta * RESISTANCE);
      setPull(distance);
    };

    const onEnd = () => {
      if (!tracking) return;
      if (distance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPull(PULL_THRESHOLD);
        window.location.reload();
        return;
      }
      reset();
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, []);

  return { pull, refreshing };
}
