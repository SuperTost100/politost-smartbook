import ReactMarkdown from 'react-markdown';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { MarkdownLink } from '../components/MarkdownLink';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import guide from '../../docs/guida.md?raw';

/** Parts of the guide about accounts and licenses sit between these markers and only show when the platform is on. */
const PLATFORM_ONLY = /<!-- platform -->\n[\s\S]*?<!-- \/platform -->\n/g;
const MARKERS = /<!-- \/?platform -->\n/g;

export function DocsPage() {
  useDocumentTitle('Guida');
  const { auth: platformEnabled } = useReaderFeatures();
  const text = platformEnabled ? guide.replace(MARKERS, '') : guide.replace(PLATFORM_ONLY, '');

  return (
    <div className="site-page legal-page docs-page no-print">
      <SiteHeader />
      <main id="main-content"><article className="legal-content docs-content sb-prose">
        <ReactMarkdown components={{ a: MarkdownLink }}>{text}</ReactMarkdown>
      </article></main>
      <Footer />
    </div>
  );
}
