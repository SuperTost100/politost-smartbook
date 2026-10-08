const PROBE_ORIGIN = 'https://reader.invalid';

/**
 * In-app path only. Starting with `/` is not enough: browsers read `//host`, `/\host`
 * and `/<tab>/host` as another host, so the path must also resolve on our own origin.
 */
export function isSafeNextPath(path: string | null | undefined): path is string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return false;
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

export function withSafeNext(url: string, nextPath?: string | null): string {
  if (!isSafeNextPath(nextPath)) return url;
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}${new URLSearchParams({ next: nextPath })}`;
}

const OAUTH_NEXT_KEY = 'politost-oauth-next';

export function rememberOAuthNext(nextPath: string | null | undefined): void {
  if (typeof sessionStorage === 'undefined') return;
  if (isSafeNextPath(nextPath)) sessionStorage.setItem(OAUTH_NEXT_KEY, nextPath);
  else sessionStorage.removeItem(OAUTH_NEXT_KEY);
}

export function consumeOAuthNext(fromQuery: string | null): string | null {
  const stored = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(OAUTH_NEXT_KEY);
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(OAUTH_NEXT_KEY);
  if (isSafeNextPath(fromQuery)) return fromQuery;
  return isSafeNextPath(stored) ? stored : null;
}
