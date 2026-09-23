import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { redeemActivationKey } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icon';

export function RedeemPage() {
  const { user, isLoading, hasConsent } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ message: string; smartbookId: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?next=/redeem', { replace: true });
    }
  }, [isLoading, navigate, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);
    try {
      const result = await redeemActivationKey(code.trim());
      setSuccess({ message: result.message, smartbookId: result.smartbook_id });
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Riscatto non riuscito');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="auth-page">
        <SiteHeader />
        <main id="main-content" className="auth-shell">
          <p className="empty-note">Caricamento…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <SiteHeader />
      <main id="main-content" className="auth-shell">
        <div className="auth-hero-band">
          <img src="/logo.svg" alt="" className="auth-hero-logo" width={48} height={48} />
          <h1 className="auth-hero-title">Riscatta codice</h1>
          <p className="auth-hero-tagline">Inserisci il codice di attivazione ricevuto dall&apos;editore</p>
        </div>

        <div className="auth-body">
          {!hasConsent && (
            <div className="auth-error-banner" role="alert">
              Devi accettare Termini e Privacy prima di riscattare un codice.{' '}
              <Link to="/auth/accept-terms?next=/redeem">Completa il consenso</Link>
            </div>
          )}

          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="auth-field">
              <span className="auth-field-label">Codice attivazione</span>
              <span className="auth-field-control">
                <Icon name="lock" size={18} className="auth-field-icon" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="off"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  disabled={!hasConsent}
                />
              </span>
            </label>

            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="upload-success" role="status">
                <p>{success.message}</p>
                <Link to={`/libro/${success.smartbookId}`} className="btn-primary auth-btn-full">
                  Apri smartbook
                </Link>
              </div>
            )}

            <button type="submit" className="btn-primary auth-btn-full" disabled={loading || !hasConsent}>
              {loading ? (
                <>
                  <Icon name="loader" size={18} />
                  Verifica codice…
                </>
              ) : (
                'Riscatta codice'
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
