export const PROMOTIONS = [
  { id: 'pyxis', title: 'Pyxis', text: 'Scopri l’altro progetto di PoliTost.', action: 'Scopri Pyxis', href: 'https://politost.it/pyxis/' },
  { id: 'telegram', title: 'La community PoliTost', text: 'Entra nel gruppo Telegram.', action: 'Apri Telegram', href: 'https://t.me/politost_community' },
  { id: 'tiktok', title: '@politost su TikTok', text: 'Segui PoliTost anche su TikTok.', action: 'Apri TikTok', href: 'https://www.tiktok.com/@politost' },
] as const;

export function googleConfig(env: { VITE_GA4_ID?: string; VITE_ADSENSE_CLIENT?: string; VITE_GOOGLE_CMP_ENABLED?: string }) {
  return {
    analyticsId: /^G-[A-Z0-9]+$/.test(env.VITE_GA4_ID ?? '') ? env.VITE_GA4_ID! : '',
    publisherId: /^ca-pub-\d{16}$/.test(env.VITE_ADSENSE_CLIENT ?? '') && env.VITE_GOOGLE_CMP_ENABLED === 'true'
      ? env.VITE_ADSENSE_CLIENT! : '',
  };
}

interface AnalyticsBook { id: string; source: string; access?: string }

/** Only catalogued public books have identifying analytics. Queries, hashes and titles never leave here. */
export function analyticsPage(pathname: string, books: AnalyticsBook[]): { page_path: string; page_title: string } | null {
  if (pathname === '/') return { page_path: '/', page_title: 'Catalogo' };
  const match = /^\/libro\/([^/]+)\/(capitolo\/[^/]+|formulario|esercizi|esami|laboratorio|grafici)\/?$/.exec(pathname);
  if (!match) return null;
  let id: string;
  try { id = decodeURIComponent(match[1]); } catch { return null; }
  const book = books.find((entry) => entry.id === id);
  if (!book || !['builtin', 'remote'].includes(book.source) || book.access === 'licensed') return null;
  return { page_path: `/libro/${encodeURIComponent(id)}/${match[2]}`, page_title: 'Libro pubblico' };
}

export interface TcData {
  gdprApplies?: boolean;
  eventStatus?: string;
  cmpStatus?: string;
  listenerId?: number;
  vendor?: { consents?: Record<number, boolean> };
  purpose?: { consents?: Record<number, boolean>; legitimateInterests?: Record<number, boolean> };
}

/** Conservative opt-in: a loaded certified CMP and explicit storage/Google consent. Google interprets personalization and publisher restrictions. */
export function advertisingAllowed(data: TcData, success: boolean): boolean {
  return success && data.gdprApplies === true && data.cmpStatus === 'loaded'
    && ['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '')
    && data.vendor?.consents?.[755] === true
    && data.purpose?.consents?.[1] === true
    && [2, 7, 9, 10].every((purpose) => data.purpose?.consents?.[purpose] === true
      || data.purpose?.legitimateInterests?.[purpose] === true);
}
