import { Link } from 'react-router-dom';
import { LogIn, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from './ThemeToggle';
import { Lockup } from './shell/Lockup';

function truncateEmail(email: string, max = 20): string {
  if (email.length <= max) return email;
  const [local, domain] = email.split('@');
  if (!domain) return `${email.slice(0, max - 1)}…`;
  const keep = Math.max(4, max - domain.length - 2);
  return `${local.slice(0, keep)}…@${domain}`;
}

/** Header for pages outside the reader (library, account, legal, docs): lockup, account links, theme. */
export function SiteHeader() {
  const { user } = useAuth();
  const { auth: authEnabled } = useReaderFeatures();

  return (
    <header className="site-header">
      <Link to="/" className="site-header-brand" aria-label="Smartbook, catalogo">
        <Lockup />
      </Link>
      <div className="site-header-actions">
        {authEnabled && (
          <>
            <Link to="/redeem" className="sb-btn sb-btn-ghost sb-btn-sm" aria-label="Riscatta codice">
              <span className="site-header-long">Riscatta codice</span>
              <span className="site-header-short">Codice</span>
            </Link>
            {user ? (
              <Link to="/auth" className="sb-btn sb-btn-secondary sb-btn-sm" aria-label="Account">
                <User size={16} strokeWidth={1.75} aria-hidden />
                <span className="site-header-long">{truncateEmail(user.email)}</span>
              </Link>
            ) : (
              <Link to="/auth" className="sb-btn sb-btn-secondary sb-btn-sm" aria-label="Accedi">
                <LogIn size={16} strokeWidth={1.75} aria-hidden />
                <span className="site-header-label">Accedi</span>
              </Link>
            )}
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
