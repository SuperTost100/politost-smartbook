import { useEffect, useState } from 'react';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

const SNOOZE_KEY = 'pwa-install-snooze-until';
const SNOOZE_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZE_KEY);
  return until ? Date.now() < Number(until) : false;
}

function snooze(days = SNOOZE_DAYS) {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86_400_000));
}

export function InstallBanner() {
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const [snoozed, setSnoozed] = useState(isSnoozed);
  const [revealed, setRevealed] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  const eligible = isMobile && !snoozed && !isStandalone();

  useEffect(() => {
    if (!eligible) return;

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    setShowIosHint(isIos());

    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, [eligible]);

  useEffect(() => {
    if (!eligible) {
      setRevealed(false);
      setAnimated(false);
      return;
    }

    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      setRevealed(true);
    };

    const timer = window.setTimeout(reveal, 4500);
    const onScroll = () => {
      if (window.scrollY > 160) reveal();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [eligible]);

  useEffect(() => {
    if (!revealed) {
      setAnimated(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setAnimated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealed]);

  if (!eligible || !revealed) return null;
  if (!installEvent && !showIosHint) return null;

  const dismissLater = () => {
    snooze();
    setSnoozed(true);
    setRevealed(false);
    setAnimated(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === 'accepted') {
      setRevealed(false);
      setAnimated(false);
    } else {
      dismissLater();
    }
  };

  return (
    <div
      className={`install-banner${animated ? ' install-banner--in' : ''}`}
      role="region"
      aria-label="Installa l'app"
    >
      <div className="install-banner-glow" aria-hidden />
      <div className="install-banner-body">
        <img src="/logo.svg" alt="" className="install-banner-icon" width={44} height={44} />
        <div className="install-banner-copy">
          <p className="install-banner-kicker">Sul telefono</p>
          <h2 className="install-banner-title">Tieni Smartbook a portata di mano</h2>
          <p className="install-banner-text">
            Un tap dalla schermata Home — lettura a tutto schermo, senza barra del browser.
          </p>
        </div>
      </div>

      {installEvent ? (
        <button type="button" className="install-banner-install" onClick={() => void install()}>
          Aggiungi alla Home
        </button>
      ) : (
        <p className="install-banner-ios">
          <span className="install-banner-ios-step">
            <span className="install-banner-ios-num">1</span>
            Tocca
            {' '}
            <svg className="install-banner-share-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 3v10M8 7l4-4 4 4M5 21h14a2 2 0 0 0 2-2v-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {' '}
            in basso
          </span>
          <span className="install-banner-ios-step">
            <span className="install-banner-ios-num">2</span>
            Scegli «Aggiungi alla schermata Home»
          </span>
        </p>
      )}

      <button type="button" className="install-banner-later" onClick={dismissLater}>
        Più tardi
      </button>
    </div>
  );
}
