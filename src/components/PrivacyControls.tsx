import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Modal, Switch } from 'antd';
import { getCatalog, whenRemoteBooksReady } from '../lib/loader';
import { analyticsPage, googleConfig } from '../lib/monetization';
import { analyticsEvent, clearAnalyticsCookies, startAnalytics } from '../lib/googleServices';
import { OPEN_PRIVACY_EVENT, parseAnalyticsChoice, privacySnapshot, saveAnalyticsChoice, subscribePrivacy } from '../lib/privacyPreferences';

const config = googleConfig(import.meta.env);

export function PrivacyControls() {
  const { pathname } = useLocation();
  const rawChoice = useSyncExternalStore(subscribePrivacy, privacySnapshot);
  const choice = parseAnalyticsChoice(rawChoice);
  const [requested, setRequested] = useState(false);
  const [adMessage, setAdMessage] = useState('');
  const [analytics, setAnalytics] = useState(choice === true);
  const lastPage = useRef('');
  const [, setRemoteReady] = useState(false);
  const catalog = getCatalog();
  const page = analyticsPage(pathname, catalog);
  const safePath = page?.page_path;
  // The book index redirects to its first chapter. Keep the runtime through that public redirect.
  const keepRuntime = !!safePath || (/^\/libro\/[^/]+\/?$/.test(pathname)
    && analyticsPage(`${pathname.replace(/\/$/, '')}/formulario`, catalog) !== null);

  useEffect(() => {
    let active = true;
    void whenRemoteBooksReady().then(() => { if (active) setRemoteReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const open = () => {
      setAnalytics(parseAnalyticsChoice(privacySnapshot()) === true);
      setRequested(true);
    };
    window.addEventListener(OPEN_PRIVACY_EVENT, open);
    return () => window.removeEventListener(OPEN_PRIVACY_EVENT, open);
  }, []);

  useLayoutEffect(() => {
    if (!document.getElementById('politost-ga4') || (choice === true && keepRuntime)) return;
    // Unload the Google runtime on withdrawal or entry into a private/print/account page.
    Object.assign(window, { [`ga-disable-${config.analyticsId}`]: true });
    if (choice !== true) clearAnalyticsCookies(import.meta.env.BASE_URL);
    window.location.reload();
  }, [choice, keepRuntime]);

  useEffect(() => {
    if (!config.analyticsId || choice !== true || !safePath) return;
    startAnalytics(config.analyticsId, import.meta.env.BASE_URL);
    if (lastPage.current === safePath) return;
    lastPage.current = safePath;
    const location = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}${safePath}`, window.location.origin).href;
    analyticsEvent('page_view', { page_path: safePath, page_location: location, page_title: safePath === '/' ? 'Catalogo' : 'Libro pubblico', page_referrer: '' });
  }, [choice, safePath]);

  useEffect(() => {
    if (choice === null || !rawChoice) return;
    const savedAt = (JSON.parse(rawChoice) as { savedAt: number }).savedAt;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = savedAt + 180 * 86400000 - Date.now();
      if (remaining <= 0) window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT));
      else timer = setTimeout(check, Math.min(2_147_483_647, remaining));
    };
    check();
    return () => clearTimeout(timer);
  }, [choice, rawChoice]);

  const save = (enabled: boolean) => {
    saveAnalyticsChoice(enabled);
    setRequested(false);
  };

  return (
    <Modal
      title="Le tue preferenze privacy"
      open={requested || (!!config.analyticsId && choice === null)}
      onCancel={() => choice === null ? save(false) : setRequested(false)}
      footer={null}
      centered
    >
      <p>Puoi leggere tutti i libri anche senza accettare statistiche o pubblicità di Google.</p>
      <div className="privacy-option">
        <div>
          <label htmlFor="analytics-consent">Statistiche con Google Analytics</label>
          <p>{config.analyticsId ? 'Misuriamo le visite e l’uso dei libri pubblici. Escludiamo i contenuti e i titoli dei libri importati.' : 'Non attive in questa copia del reader.'}</p>
        </div>
        <Switch id="analytics-consent" checked={analytics} disabled={!config.analyticsId} onChange={setAnalytics} />
      </div>
      <div className="privacy-option">
        <div>
          <strong>Pubblicità</strong>
          <p>Le promozioni di PoliTost non usano tracciamento. {config.publisherId ? 'Le scelte sugli annunci Google si gestiscono separatamente nel messaggio di consenso di Google, dentro un libro.' : 'Gli annunci Google non sono ancora attivi.'}</p>
        </div>
      </div>
      {config.publisherId && (
        <>
          <Button block onClick={() => {
            if (window.googlefc?.showRevocationMessage) {
              setRequested(false);
              window.googlefc.showRevocationMessage();
            } else setAdMessage('Apri un libro e attendi il messaggio Google. Se è bloccato, gli annunci non vengono caricati.');
          }}>Gestisci il consenso pubblicitario Google</Button>
          {adMessage && <p role="status">{adMessage}</p>}
        </>
      )}
      <p className="privacy-note">Puoi cambiare scelta dal link "Preferenze privacy" in fondo alla pagina. Dettagli nella Cookie policy.</p>
      <div className="privacy-actions">
        <Button onClick={() => save(false)}>Rifiuta statistiche</Button>
        <Button onClick={() => save(analytics)}>Salva le preferenze</Button>
        {!!config.analyticsId && <Button onClick={() => save(true)}>Accetta statistiche</Button>}
      </div>
    </Modal>
  );
}
