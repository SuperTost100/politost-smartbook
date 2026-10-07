import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { openCookiePreferences } from '../lib/cookieConsent';
import versions from '../legal/versions.json';
import tos from '../legal/tos.it.md?raw';
import privacy from '../legal/privacy.it.md?raw';
import cookie from '../legal/cookie.it.md?raw';

const DOCS = {
  tos: { title: 'Termini di servizio', body: tos },
  privacy: { title: 'Informativa privacy', body: privacy },
  cookie: { title: 'Cookie policy', body: cookie },
} as const;

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { title, body } = DOCS[doc];
  useEffect(() => {
    document.title = `${title} · Politost Smartbook`;
  }, [title]);

  return (
    <div className="site-page legal-page">
      <SiteHeader />
      <main id="main-content"><article className="legal-content sb-prose">
        <ReactMarkdown>{body}</ReactMarkdown>
        {doc === 'cookie' && (
          <p className="legal-actions">
            <button type="button" className="sb-btn sb-btn-primary" onClick={openCookiePreferences}>
              Gestisci preferenze
            </button>
          </p>
        )}
        {(doc === 'tos' || doc === 'privacy') && (
          <section className="legal-contact">
            <h2>Recapito del titolare</h2>
            {versions.contactEmail ? (
              <p>
                {versions.controllerName}{' '}
                <a href={`mailto:${versions.contactEmail}`}>{versions.contactEmail}</a>
              </p>
            ) : (
              <p>
                Questa copia del reader non ha ancora un indirizzo email del titolare.
                Invia la richiesta a chi ti ha fornito l&apos;accesso, per esempio il docente o l&apos;istituto.
              </p>
            )}
          </section>
        )}
      </article></main>
      <Footer />
    </div>
  );
}
