import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recordConsent } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import versions from '../legal/versions.json';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icon';

export function AcceptTermsPage() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) {
      setError('Devi accettare Termini e Privacy per continuare.');
      return;
    }
    setLoading(true);
    try {
      await recordConsent(versions.tos, versions.privacy);
      await refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="auth-page">
        <SiteHeader />
        <div className="auth-shell">
          <div className="auth-body auth-body--centered">
            <p>Devi prima accedere.</p>
            <Link to="/auth" className="btn-primary auth-btn-inline">Vai al login</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <SiteHeader />
      <div className="auth-shell">
        <div className="auth-hero-band">
          <img src="/logo.svg" alt="" className="auth-hero-logo" width={48} height={48} />
          <h1 className="auth-hero-title">Accetta i termini</h1>
          <p className="auth-hero-tagline">
            Un ultimo passo per <strong>{user.email}</strong>
          </p>
        </div>
        <div className="auth-body">
          <p className="auth-terms-intro">Prima di usare Politost Smartbook, leggi e accetta:</p>
          <ul className="auth-terms-links">
            <li>
              <Link to="/termini" target="_blank">
                <Icon name="fileText" size={16} />
                Termini di servizio
              </Link>
            </li>
            <li>
              <Link to="/privacy" target="_blank">
                <Icon name="fileText" size={16} />
                Informativa privacy
              </Link>
            </li>
          </ul>
          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="checkbox-label auth-checkbox">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>Accetto Termini e Privacy (v. {versions.tos})</span>
            </label>
            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary auth-btn-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="loader" size={18} />
                  Salvataggio…
                </>
              ) : (
                'Continua'
              )}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
