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

/**
 * Runs `tasks` while the browser is idle, as many per idle period as fit and at least one, and
 * returns a function that stops the rest. While `isBusy()` says so (the reader is scrolling), the
 * tasks wait, because one long task between two frames would make the page stutter. Browsers
 * without requestIdleCallback (Safari) run one task every 50 ms instead.
 */
export function runWhenIdle(tasks: (() => void)[], isBusy: () => boolean = () => false): () => void {
  let next = 0;
  let idleHandle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = typeof requestIdleCallback === 'function';
  const step = (deadline?: IdleDeadline) => {
    idleHandle = undefined;
    timer = undefined;
    if (isBusy()) {
      timer = setTimeout(schedule, 300);
      return;
    }
    do tasks[next++]();
    while (next < tasks.length && deadline && deadline.timeRemaining() > 1 && !isBusy());
    if (next < tasks.length) schedule();
  };
  const schedule = () => {
    if (idle) idleHandle = requestIdleCallback(step);
    else timer = setTimeout(step, 50);
  };
  if (tasks.length > 0) schedule();
  return () => {
    if (idleHandle !== undefined) cancelIdleCallback(idleHandle);
    clearTimeout(timer);
    next = tasks.length;
  };
}
