import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { MarkdownLink } from '../components/MarkdownLink';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import versions from '../legal/versions.json';
import tos from '../legal/tos.it.md?raw';
import privacy from '../legal/privacy.it.md?raw';
import cookie from '../legal/cookie.it.md?raw';
import tosPlatform from '../legal/tos.platform.it.md?raw';
import privacyPlatform from '../legal/privacy.platform.it.md?raw';
import cookiePlatform from '../legal/cookie.platform.it.md?raw';

// The platform texts cover accounts, licenses and the API. The others describe the reader alone.
const DOCS = {
  tos: { title: 'Termini di servizio', body: tos, platform: tosPlatform },
  privacy: { title: 'Informativa privacy', body: privacy, platform: privacyPlatform },
  cookie: { title: 'Cookie policy', body: cookie, platform: cookiePlatform },
} as const;

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { auth } = useReaderFeatures();
  const { title } = DOCS[doc];
  const body = auth ? DOCS[doc].platform : DOCS[doc].body;
  useDocumentTitle(title);

  return (
    <div className="site-page legal-page">
      <SiteHeader />
      <main id="main-content"><article className="legal-content sb-prose">
        <ReactMarkdown components={{ a: MarkdownLink }}>{body}</ReactMarkdown>
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
