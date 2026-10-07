import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import smartbookDocs from '../../docs/guida.md?raw';

export function DocsPage() {
  useEffect(() => {
    document.title = 'Guida · Politost Smartbook';
  }, []);

  return (
    <div className="site-page legal-page docs-page no-print">
      <SiteHeader />
      <main id="main-content"><article className="legal-content docs-content sb-prose">
        <ReactMarkdown>{smartbookDocs}</ReactMarkdown>
      </article></main>
      <Footer />
    </div>
  );
}
