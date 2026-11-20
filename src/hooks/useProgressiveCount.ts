import { startTransition, useEffect, useRef, useState } from 'react';
import { prepareBatch } from '../lib/progressive';

/**
 * Parsing per task before the page shows what it prepared. The showing takes a task of its own, so
 * each stays well under the 50 ms that make a page feel stuck on a fast computer, with few enough
 * batches that their overhead stays small on a slow one.
 */
const BUDGET_MS = 24;

/**
 * How many of `total` items to show: `initial` at once, then the rest in batches, each prepared in
 * its own task (`prepare(index)`, such as parsing its text) and shown in a transition, so a long page
 * never blocks the reader for long. A new `resetKey` (a new list) starts again from `initial`.
 */
export function useProgressiveCount(total: number, initial: number, prepare: (index: number) => void, resetKey: unknown): number {
  const [state, setState] = useState({ key: resetKey, count: initial });
  // `initial` can grow for the same list, when a link asks for an item further down.
  const count = Math.min(total, state.key === resetKey ? Math.max(initial, state.count) : initial);
  const prepareRef = useRef(prepare);
  useEffect(() => {
    prepareRef.current = prepare;
  });

  useEffect(() => {
    if (count >= total) return;
    const timer = setTimeout(() => {
      const next = prepareBatch(count, total, (index) => prepareRef.current(index), BUDGET_MS);
      startTransition(() => setState({ key: resetKey, count: next }));
    }, 0);
    return () => clearTimeout(timer);
  }, [count, total, resetKey]);

  return count;
}
