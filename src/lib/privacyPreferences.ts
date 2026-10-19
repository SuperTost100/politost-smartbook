export const PRIVACY_KEY = 'politost-privacy-v1';
export const PRIVACY_EVENT = 'politost-privacy-change';
export const OPEN_PRIVACY_EVENT = 'politost-open-privacy';
let memoryChoice: string | null = null;
let memoryOnly = false;
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export function parseAnalyticsChoice(raw: string | null, now = Date.now()): boolean | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (typeof value !== 'object' || !value) return null;
    const choice = value as Record<string, unknown>;
    return typeof choice.analytics === 'boolean' && typeof choice.savedAt === 'number'
      && choice.savedAt <= now && now - choice.savedAt < MAX_AGE ? choice.analytics : null;
  } catch { return null; }
}

export function privacySnapshot(): string | null {
  if (memoryOnly) return memoryChoice;
  try { return localStorage.getItem(PRIVACY_KEY); } catch { return memoryChoice; }
}

export function subscribePrivacy(callback: () => void): () => void {
  window.addEventListener(PRIVACY_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(PRIVACY_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function saveAnalyticsChoice(analytics: boolean): void {
  memoryChoice = JSON.stringify({ analytics, savedAt: Date.now() });
  try { localStorage.setItem(PRIVACY_KEY, memoryChoice); memoryOnly = false; }
  catch { memoryOnly = true; }
  window.dispatchEvent(new CustomEvent(PRIVACY_EVENT, { detail: analytics }));
}

export function openPrivacyPreferences(): void {
  window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT));
}
