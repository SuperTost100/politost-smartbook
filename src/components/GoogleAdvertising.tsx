import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { advertisingAllowed, googleConfig, type TcData } from '../lib/monetization';
import { getCatalog, loadSmartbook } from '../lib/loader';
import { appendGoogleScript } from '../lib/googleServices';

const { publisherId } = googleConfig(import.meta.env);

export function GoogleAdvertising() {
  const { pathname } = useLocation();
  const match = /^\/libro\/([^/]+)\/(capitolo\/([^/]+)|formulario|esercizi|esami|laboratorio|grafici)\/?$/.exec(pathname);
  const entry = match ? getCatalog().find((book) => encodeURIComponent(book.id) === match[1]) : undefined;
  const book = entry ? loadSmartbook(entry.id) : null;
  const inBook = !!entry && (!match?.[3] || !!book?.config.chapters.some((chapter) => chapter.id === match[3]));

  useEffect(() => {
    if (inBook) return;
    try { sessionStorage.removeItem('politost-support-book'); }
    catch { /* Rotation still works without persisted session state. */ }
  }, [inBook, pathname]);

  useLayoutEffect(() => {
    if (!inBook && (document.getElementById('politost-adsense') || document.getElementById('politost-google-cmp'))) {
      // AdSense has no supported SPA teardown. A fresh document unloads ads, timers and anchors.
      window.location.reload();
    }
  }, [inBook, pathname]);

  return null;
}

/** Mounted only in a successfully opened book shell. */
export function BookAdvertising() {
  useEffect(() => {
    if (!publisherId) return;
    window.googlefc = window.googlefc ?? { callbackQueue: [] };
    appendGoogleScript('politost-google-cmp', `https://fundingchoicesmessages.google.com/i/${publisherId.replace('ca-', '')}?ers=1`, 'origin');
    let listenerId: number | undefined;
    let registered = false;
    let disposed = false;
    const onConsent = (data: TcData, success: boolean) => {
      if (disposed) return;
      listenerId = data.listenerId ?? listenerId;
      if (!success || data.cmpStatus !== 'loaded' || !['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '')) return;
      const allowed = advertisingAllowed(data, success);
      if (!allowed) {
        if (document.getElementById('politost-adsense')) window.location.reload();
        return;
      }
      if (history.state?.politostSupportDismissed === true) return;
      try { if (sessionStorage.getItem('politost-support-dismissed') === 'true') return; }
      catch { /* Lack of storage does not grant consent. */ }
      if (document.getElementById('politost-adsense')) return;
      const script = document.createElement('script');
      script.id = 'politost-adsense';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.overlays = 'collapsed-bottom';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      document.head.appendChild(script);
    };
    const connect = () => {
      if (!registered && window.__tcfapi) {
        registered = true;
        window.__tcfapi('addEventListener', 2, onConsent);
      }
    };
    connect();
    const timer = window.setInterval(connect, 250);
    const timeout = window.setTimeout(() => window.clearInterval(timer), 15000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.clearTimeout(timeout);
      if (listenerId !== undefined) window.__tcfapi?.('removeEventListener', 2, () => undefined, listenerId);
    };
  }, []);

  useEffect(() => {
    if (!publisherId) return;
    let frame = 0;
    let served = document.documentElement.dataset.googleAnchorServed === 'true';
    const measure = () => {
      frame = 0;
      // shortcut: Google exposes no anchor fill event. Observe its fixed ad container;
      // recheck this selector when AdSense changes its generated markup. Never modify its ads.
      const visible = [...document.querySelectorAll<HTMLElement>('ins.adsbygoogle')].some((ad) => {
        let element: HTMLElement | null = ad;
        for (let level = 0; element && level < 3; level++, element = element.parentElement) {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (style.position === 'fixed' && style.visibility !== 'hidden' && style.display !== 'none'
            && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0
            && rect.top < window.innerHeight && rect.bottom >= window.innerHeight - 2
            && ad.querySelector('iframe')) return true;
        }
        return false;
      });
      const root = document.documentElement;
      if (visible) {
        served = true;
        root.dataset.googleAnchorServed = 'true';
      }
      const suppressPromotion = visible || served;
      if (root.dataset.googleAnchorVisible !== String(suppressPromotion)) {
        root.dataset.googleAnchorVisible = String(suppressPromotion);
        window.dispatchEvent(new Event('politost-anchor-change'));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'data-anchor-status', 'data-ad-status'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      delete document.documentElement.dataset.googleAnchorVisible;
    };
  }, []);

  return null;
}
