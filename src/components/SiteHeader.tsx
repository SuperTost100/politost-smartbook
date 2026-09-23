import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from './ThemeToggle';
import { Icon } from './Icon';

function truncateEmail(email: string, max = 20): string {
  if (email.length <= max) return email;
  const [local, domain] = email.split('@');
  if (!domain) return `${email.slice(0, max - 1)}…`;
  const keep = Math.max(4, max - domain.length - 2);
  return `${local.slice(0, keep)}…@${domain}`;
}

export function SiteHeader() {
  const { user } = useAuth();
  const { auth: authEnabled } = useReaderFeatures();

  return (
    <header className="home-header">
      <Link to="/" className="brand-link">
        <img src="/logo.svg" alt="Politost" className="brand-logo-img" width={36} height={36} />
        <div className="brand-text">
          <span className="brand-logo">Politost</span>
          <span className="brand-sub">Smartbook</span>
        </div>
      </Link>
      <div className="home-header-actions">
        {authEnabled && (
          <>
            <Link to="/redeem" className="header-auth-link header-auth-link--redeem" aria-label="Riscatta codice">
              <span className="header-redeem-long">Riscatta codice</span>
              <span className="header-redeem-short">Codice</span>
            </Link>
            {user ? (
              <Link to="/auth" className="header-auth-link header-auth-link--user" aria-label="Account">
                <Icon name="user" size={16} />
                <span className="header-auth-email">{truncateEmail(user.email)}</span>
              </Link>
            ) : (
              <Link to="/auth" className="header-auth-link header-auth-link--login" aria-label="Accedi">
                <Icon name="logIn" size={16} />
                <span className="header-login-label">Accedi</span>
              </Link>
            )}
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
