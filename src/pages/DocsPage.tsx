import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { MarkdownLink } from '../components/MarkdownLink';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import smartbookDocs from '../../docs/guida.md?raw';

export function DocsPage() {
  useDocumentTitle('Guida');

  return (
    <div className="site-page legal-page docs-page no-print">
      <SiteHeader />
      <main id="main-content"><article className="legal-content docs-content sb-prose">
        <ReactMarkdown components={{ a: MarkdownLink }}>{smartbookDocs}</ReactMarkdown>
      </article></main>
      <Footer />
    </div>
  );
}
