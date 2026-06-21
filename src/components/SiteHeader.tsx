import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';
import { ThemeToggle } from './ThemeToggle';
import { Icon } from './Icon';

function truncateEmail(email: string, max = 28): string {
  if (email.length <= max) return email;
  const [local, domain] = email.split('@');
  if (!domain) return `${email.slice(0, max - 1)}…`;
  const keep = Math.max(4, max - domain.length - 2);
  return `${local.slice(0, keep)}…@${domain}`;
}

export function SiteHeader() {
  const { user } = useAuth();
  const { auth } = useReaderFeatures();

  return (
    <header className="home-header">
      <Link to="/" className="brand-link">
        <img src="/logo.svg" alt="Politost" className="brand-logo-img" width={44} height={44} />
        <div className="brand-text">
          <span className="brand-logo">Politost</span>
          <span className="brand-sub">Smartbook</span>
        </div>
      </Link>
      <div className="home-header-actions">
        {auth && (
          user ? (
            <Link to="/auth" className="header-auth-link header-auth-link--user">
              <Icon name="user" size={16} />
              <span className="header-auth-email">{truncateEmail(user.email)}</span>
            </Link>
          ) : (
            <Link to="/auth" className="header-auth-link header-auth-link--login">
              <Icon name="logIn" size={16} />
              Accedi
            </Link>
          )
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
