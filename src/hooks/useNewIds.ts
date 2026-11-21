import { useLayoutEffect, useRef, useState } from 'react';

/** How long an id stays flagged as new; covers the `item-enter` animation. */
const FRESH_MS = 1400;

/**
 * Returns the ids that appeared since the list was first shown, so callers can
 * animate genuinely added items without replaying the animation on initial
 * load, refreshes, reorders, or moves between sections.
 *
 * `ready` should be false while the list is still loading; the first ready
 * render becomes the baseline.
 */
export function useNewIds(ids: readonly string[], ready = true): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const key = ids.join('\u0000');

  useLayoutEffect(() => {
    if (!ready) return;
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !seen.current!.has(id));
    if (added.length === 0) return;
    added.forEach((id) => seen.current!.add(id));
    setFresh((current) => new Set([...current, ...added]));
    window.setTimeout(() => {
      setFresh((current) => {
        const next = new Set(current);
        added.forEach((id) => next.delete(id));
        return next;
      });
    }, FRESH_MS);
    // `key` captures the id list's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return fresh;
}
