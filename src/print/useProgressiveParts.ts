import { startTransition, useEffect, useState } from 'react';

/**
 * The keys of `keys` mounted so far: the first `initial` at once, then one per macrotask in a
 * transition, so the browser paints and answers input between two parts. A key stays mounted when
 * the options change, so only new parts wait.
 */
export function useProgressiveParts(keys: string[], initial = 2): { mounted: ReadonlySet<string>; pending?: string } {
  const [mounted, setMounted] = useState<ReadonlySet<string>>(() => new Set(keys.slice(0, initial)));
  const pending = keys.find((key) => !mounted.has(key));
  useEffect(() => {
    if (pending === undefined) return;
    const timer = setTimeout(() => {
      startTransition(() => setMounted((prev) => new Set(prev).add(pending)));
    }, 0);
    return () => clearTimeout(timer);
  }, [pending]);
  return { mounted, pending };
}
