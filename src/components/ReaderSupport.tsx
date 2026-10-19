import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, X } from 'lucide-react';
import { getCatalog } from '../lib/loader';
import { analyticsPage, PROMOTIONS } from '../lib/monetization';
import { analyticsEvent } from '../lib/googleServices';
import { openPrivacyPreferences, parseAnalyticsChoice, privacySnapshot } from '../lib/privacyPreferences';

function subscribeAnchor(callback: () => void) {
  window.addEventListener('politost-anchor-change', callback);
  return () => window.removeEventListener('politost-anchor-change', callback);
}

function anchorVisible() { return document.documentElement.dataset.googleAnchorVisible === 'true'; }

function sessionValue(key: string): string | null {
  if (key === 'politost-support-dismissed' && history.state?.politostSupportDismissed === true) return 'true';
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function ReaderSupport({ bookId }: { bookId: string }) {
  const { pathname } = useLocation();
  const nativeAnchor = useSyncExternalStore(subscribeAnchor, anchorVisible);
  const [dismissed, setDismissed] = useState(() => sessionValue('politost-support-dismissed') === 'true');
  const [promotionIndex] = useState(() => {
    const key = sessionValue('politost-support-book') === bookId ? 'politost-support-current' : 'politost-support-next';
    const index = Number(sessionValue(key) ?? 0);
    return Number.isSafeInteger(index) && index >= 0 ? index % PROMOTIONS.length : 0;
  });
  const banner = useRef<HTMLElement>(null);
  const focusInBanner = useRef(false);
  const focusReader = () => {
    const main = document.getElementById('main-content');
    if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
  };
  const promotion = PROMOTIONS[promotionIndex];

  useEffect(() => {
    try {
      sessionStorage.setItem('politost-support-book', bookId);
      sessionStorage.setItem('politost-support-current', String(promotionIndex));
      sessionStorage.setItem('politost-support-next', String((promotionIndex + 1) % PROMOTIONS.length));
    } catch { /* Storage-disabled browsers use the first promotion on the next visit. */ }
  }, [bookId, promotionIndex]);

  const visible = !dismissed && !nativeAnchor;
  useEffect(() => {
    if (!visible || !banner.current) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty('--reader-support-height', `${banner.current?.getBoundingClientRect().height ?? 0}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(banner.current);
    measure();
    root.classList.add('has-reader-support');
    return () => {
      observer.disconnect();
      if (focusInBanner.current) focusReader();
      root.classList.remove('has-reader-support');
      root.style.removeProperty('--reader-support-height');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <aside ref={banner} className="reader-support no-print" aria-label="Promozione PoliTost"
      onFocusCapture={() => { focusInBanner.current = true; }}
      onBlurCapture={(event) => { focusInBanner.current = event.currentTarget.contains(event.relatedTarget); }}
    >
      <div className="reader-support-inner">
        <div className="reader-support-copy">
          <span className="reader-support-label">Promozione PoliTost</span>
          <strong>{promotion.title}</strong>
          <span className="reader-support-description">{promotion.text}</span>
        </div>
        <a className="reader-support-link" href={promotion.href} target="_blank" rel="noopener noreferrer" onClick={() => {
          if (parseAnalyticsChoice(privacySnapshot()) !== true) return;
          const page = analyticsPage(pathname, getCatalog());
          if (page) analyticsEvent('promotion_click', { promotion_id: promotion.id, page_path: page.page_path });
        }}>
          {promotion.action}<ArrowUpRight size={16} aria-hidden />
        </a>
        <button className="reader-support-close" type="button" aria-label="Chiudi la promozione per questa sessione" onClick={() => {
          try { sessionStorage.setItem('politost-support-dismissed', 'true'); }
          catch {
            // History state survives the reload needed to unload a late Google anchor.
            history.replaceState({ ...history.state, politostSupportDismissed: true }, '');
          }
          focusReader();
          setDismissed(true);
          // A late anchor must not appear after the first-party banner was dismissed.
          if (document.getElementById('politost-adsense')) window.location.reload();
        }}><X size={18} aria-hidden /></button>
      </div>
      <button className="reader-support-privacy" type="button" onClick={openPrivacyPreferences}>Preferenze privacy</button>
    </aside>
  );
}
