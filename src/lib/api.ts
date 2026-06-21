const API_BASE = import.meta.env.VITE_API_URL ?? '';

type FetchInit = RequestInit & { json?: unknown };

async function apiFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
}

export interface ConsentStatus {
  has_consent: boolean;
  tos_version?: string;
  privacy_version?: string;
}

export interface ContentKeyResult {
  cek: string;
  smartbook_id: string;
}

export function fetchMe(): Promise<AuthUser> {
  return apiFetch('/api/auth/me');
}

export function login(email: string, password: string): Promise<{ access_token?: string }> {
  const body = new URLSearchParams({ username: email, password });
  return apiFetch('/auth/jwt/login', { method: 'POST', body });
}

export function register(data: {
  email: string;
  password: string;
  tos_version: string;
  privacy_version: string;
}): Promise<AuthUser> {
  return apiFetch('/auth/register', { method: 'POST', json: data });
}

export function logout(): Promise<void> {
  return apiFetch('/auth/jwt/logout', { method: 'POST' });
}

export function fetchConsentStatus(): Promise<ConsentStatus> {
  return apiFetch('/api/consent/status');
}

export function recordConsent(tos_version: string, privacy_version: string): Promise<ConsentStatus> {
  return apiFetch('/api/consent', { method: 'POST', json: { tos_version, privacy_version } });
}

export function googleLoginUrl(): string {
  return `${API_BASE}/auth/google/authorize`;
}

export function fetchContentKey(
  smartbookId: string,
  keys: { bookId: string; wrapIv: string; wrappedKey: string },
): Promise<ContentKeyResult> {
  return apiFetch(`/api/books/${smartbookId}/content-key`, { method: 'POST', json: keys });
}

export function auditChapterOpen(smartbookId: string, chapterId?: string): Promise<void> {
  return apiFetch('/api/audit/chapter-open', {
    method: 'POST',
    json: { smartbook_id: smartbookId, chapter_id: chapterId },
  }).then(() => undefined);
}

export function fetchBookAccess(smartbookId: string): Promise<{
  has_license: boolean;
  authenticated: boolean;
}> {
  return apiFetch(`/api/books/${smartbookId}/access`);
}
