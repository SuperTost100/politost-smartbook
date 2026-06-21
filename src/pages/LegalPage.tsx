import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import tos from '../legal/tos.it.md?raw';
import privacy from '../legal/privacy.it.md?raw';
import cookie from '../legal/cookie.it.md?raw';

const DOCS = {
  tos: { title: 'Termini di servizio', body: tos },
  privacy: { title: 'Privacy policy', body: privacy },
  cookie: { title: 'Cookie policy', body: cookie },
} as const;

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { title, body } = DOCS[doc];
  return (
    <div className="legal-page">
      <SiteHeader />
      <article className="legal-content">
        <h1>{title}</h1>
        <ReactMarkdown>{body}</ReactMarkdown>
      </article>
      <Footer />
    </div>
  );
}
