import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import smartbookDocs from '../../docs/SMARTBOOK.md?raw';

export function DocsPage() {
  return (
    <div className="legal-page docs-page no-print">
      <SiteHeader />
      <article className="legal-content docs-content">
        <ReactMarkdown>{smartbookDocs}</ReactMarkdown>
      </article>
      <Footer />
    </div>
  );
}
