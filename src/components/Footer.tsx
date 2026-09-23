import { Link } from 'react-router-dom';
import { Icon } from './Icon';

interface FooterProps {
  showCatalogLink?: boolean;
  compact?: boolean;
}

export function Footer({ showCatalogLink = false, compact = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="site-footer site-footer--compact no-print">
        {showCatalogLink && (
          <Link to="/" className="site-footer-compact-catalog">
            ← Catalogo
          </Link>
        )}
        <span className="site-footer-compact-copy">© Politost</span>
      </footer>
    );
  }

  return (
    <footer className="site-footer no-print">
      <div className="site-footer-inner">
        <span>© Politost Smartbook</span>
        <nav className="site-footer-links">
          {showCatalogLink && <Link to="/">← Catalogo</Link>}
          <Link to="/docs" className="site-footer-link-with-icon">
            <Icon name="fileText" size={14} />
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
