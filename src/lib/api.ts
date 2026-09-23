import { getReaderConfig } from '../config/readerConfig';
import type { GraficoConfig, IdeSnippet, SectionKey } from '../types/smartbook';
import { withSafeNext } from './safeNext';

function apiBase(): string {
  return getReaderConfig().apiBaseUrl ?? import.meta.env.VITE_API_URL ?? '';
}

type FetchInit = RequestInit & { json?: unknown };

async function apiFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${apiBase()}${path}`, {
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

export function googleLoginUrl(nextPath?: string | null): string {
  return withSafeNext(`${apiBase()}/auth/google/authorize`, nextPath);
}

export interface KeyRedeemResult {
  smartbook_id: string;
  key_type: string;
  license_granted: boolean;
  message: string;
}

export function redeemActivationKey(code: string): Promise<KeyRedeemResult> {
  return apiFetch('/api/keys/redeem', { method: 'POST', json: { code } });
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

export interface CatalogBook {
  id: string;
  title: string;
  subject: string;
  access: string;
  delivery: 'cloud' | 'ptsb';
  chapters?: Array<{ id: string; number: number; title: string; file: string; printable?: boolean }>;
  sections?: Partial<Record<SectionKey, { enabled: boolean; label?: string }>>;
  esercizi?: string;
  esami?: string;
  ide?: IdeSnippet[];
  grafici?: GraficoConfig[];
  assets?: Record<string, string>;
}

export function fetchCatalog(): Promise<{ books: CatalogBook[] }> {
  return apiFetch('/api/catalog');
}

export function fetchBookManifest(smartbookId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/books/${smartbookId}/manifest`);
}

export function fetchChapterMarkdown(
  smartbookId: string,
  chapterId: string,
): Promise<{
  smartbook_id: string;
  chapter_id: string;
  markdown: string;
  assets?: Record<string, string>;
}> {
  return apiFetch(`/api/books/${smartbookId}/chapters/${chapterId}`);
}
