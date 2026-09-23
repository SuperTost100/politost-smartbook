export interface BundleCacheEntry<T> {
  bundle: object;
  data: T;
}

/** Reuse `data` while `bundle` is the same object. A replaced bundle parses again. */
export function cachedByBundle<T>(
  cache: Map<string, BundleCacheEntry<T>>,
  id: string,
  bundle: object,
  build: () => T,
): T {
  const hit = cache.get(id);
  if (hit && hit.bundle === bundle) return hit.data;
  const data = build();
  cache.set(id, { bundle, data });
  return data;
}
