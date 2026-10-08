import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

interface FooterProps {
  showCatalogLink?: boolean;
  compact?: boolean;
  /** Inside a book: copyright on the left edge, links on the right, no centred column. */
  wide?: boolean;
}

export function Footer({ showCatalogLink = false, compact = false, wide = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="site-footer site-footer--compact no-print">
        {showCatalogLink && <Link to="/" className="site-footer-compact-catalog">← Catalogo</Link>}
        <span className="site-footer-compact-copy">© Politost</span>
      </footer>
    );
  }

  return (
    <footer className={`site-footer no-print${wide ? ' site-footer--wide' : ''}`}>
      <div className="site-footer-inner">
        <span>© Politost Smartbook</span>
        <nav className="site-footer-links" aria-label="Informazioni">
          {showCatalogLink && <Link to="/">← Catalogo</Link>}
          <Link to="/docs" className="site-footer-link-with-icon">
            <FileText size={14} strokeWidth={1.75} aria-hidden />
            Documentazione
          </Link>
          <Link to="/termini">Termini</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookie">Cookie</Link>
        </nav>
      </div>
    </footer>
  );
}
