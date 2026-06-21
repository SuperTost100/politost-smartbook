import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import versions from '../legal/versions.json';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icon';

export function AuthPage() {
  const { user, login, register, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!acceptTerms) {
          setError('Devi accettare Termini e Privacy per registrarti.');
          return;
        }
        await register(email, password, versions.tos, versions.privacy);
      } else {
        await login(email, password);
      }
      navigate(nextPath && nextPath.startsWith('/') ? nextPath : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="auth-page">
        <SiteHeader />
        <main id="main-content" className="auth-shell">
          <div className="auth-hero-band">
            <img src="/logo.svg" alt="" className="auth-hero-logo" width={48} height={48} />
            <h1 className="auth-hero-title">Il tuo account</h1>
            <p className="auth-hero-tagline">Gestisci l&apos;accesso a Politost Smartbook</p>
          </div>
          <div className="auth-body">
            <div className="auth-account">
              <div className="auth-avatar" aria-hidden>
                <Icon name="user" size={28} />
              </div>
              <p className="auth-account-email">{user.email}</p>
              <button type="button" className="btn-primary auth-btn-full" onClick={() => void logout()}>
                <Icon name="logOut" size={18} />
                Esci
              </button>
            </div>
          </div>
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
          <h1 className="auth-hero-title">Politost Smartbook</h1>
          <p className="auth-hero-tagline">Accedi ai tuoi libri interattivi</p>
        </div>

        <div className="auth-body">
          <div className="auth-tabs" role="tablist" aria-label="Modalità accesso">
            <button
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-controls="auth-panel"
              aria-selected={mode === 'login'}
              className={`auth-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Accedi
            </button>
            <button
              type="button"
              role="tab"
              id="auth-tab-register"
              aria-controls="auth-panel"
              aria-selected={mode === 'register'}
              className={`auth-tab${mode === 'register' ? ' active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Registrati
            </button>
          </div>

          <div
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={mode === 'login' ? 'auth-tab-login' : 'auth-tab-register'}
          >
          <button type="button" className="btn-google" onClick={loginWithGoogle}>
            <Icon name="google" size={20} />
            Continua con Google
          </button>

          <p className="auth-divider"><span>oppure email</span></p>

          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="auth-field">
              <span className="auth-field-label">Email</span>
              <span className="auth-field-control">
                <Icon name="mail" size={18} className="auth-field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nome@esempio.it"
                />
              </span>
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Password</span>
              <span className="auth-field-control">
                <Icon name="lock" size={18} className="auth-field-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? 'Minimo 8 caratteri' : '••••••••'}
                />
              </span>
            </label>

            {mode === 'register' && (
              <label className="checkbox-label auth-checkbox">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <span>
                  Ho letto e accetto i{' '}
                  <Link to="/termini" target="_blank">Termini</Link> e la{' '}
                  <Link to="/privacy" target="_blank">Privacy</Link>
                </span>
              </label>
            )}

            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary auth-btn-full" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="loader" size={18} />
                  Attendere…
                </>
              ) : (
                mode === 'login' ? 'Accedi' : 'Crea account'
              )}
            </button>
          </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
