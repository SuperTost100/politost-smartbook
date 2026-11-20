/**
 * Prepares items from `from` on, at least one, and more while the task has run for less than
 * `budgetMs`. Returns the index after the last one prepared. A long page appears in such batches,
 * each in its own task, so the browser can paint and answer the reader in between.
 */
export function prepareBatch(
  from: number,
  total: number,
  prepare: (index: number) => void,
  budgetMs: number,
  now: () => number = () => performance.now(),
): number {
  const start = now();
  let next = from;
  do {
    prepare(next);
    next++;
  } while (next < total && now() - start < budgetMs);
  return next;
}

