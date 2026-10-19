import type { TcData } from './monetization';

type Gtag = (...args: unknown[]) => void;
type TcfCallback = (data: TcData, success: boolean) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __tcfapi?: (command: string, version: number, callback: TcfCallback, parameter?: number) => void;
    googlefc?: { callbackQueue: Array<() => void>; showRevocationMessage?: () => void };
  }
}

export function appendGoogleScript(id: string, src: string, referrerPolicy: ReferrerPolicy = 'no-referrer'): HTMLScriptElement {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLScriptElement) return existing;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  script.referrerPolicy = referrerPolicy;
  document.head.appendChild(script);
  return script;
}

export function startAnalytics(id: string, basePath: string): void {
  if (document.getElementById('politost-ga4')) return;
  window.dataLayer = window.dataLayer ?? [];
  // Google's dispatcher requires a native Arguments object. valueOf preserves its identity.
  window.gtag = function () { window.dataLayer!.push(arguments.valueOf()); };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    cookie_expires: 60 * 60 * 24 * 180, cookie_update: false,
    cookie_prefix: 'politost_reader', cookie_domain: 'none', cookie_path: basePath,
    page_location: `${location.origin}${basePath}`, page_referrer: '', page_title: 'Smartbook',
  });
  appendGoogleScript('politost-ga4', `https://www.googletagmanager.com/gtag/js?id=${id}`);
}

export function analyticsEvent(name: 'page_view' | 'chapter_complete' | 'promotion_click', values: Record<string, string>): void {
  if (!document.getElementById('politost-ga4')) return;
  window.gtag?.('event', name, values);
}

export function clearAnalyticsCookies(basePath: string): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!/^politost_reader_ga(?:_|$)/.test(name)) continue;
    for (const path of new Set([basePath, basePath.replace(/\/$/, '') || '/'])) {
      document.cookie = `${name}=; Max-Age=0; path=${path}`;
    }
  }
}
