import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Form, Input } from 'antd';
import { LogOut, Mail, LockKeyhole, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import versions from '../legal/versions.json';
import { AuthLayout } from '../components/AuthLayout';
import { isSafeNextPath } from '../lib/safeNext';

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

  async function handleSubmit() {
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
      navigate(isSafeNextPath(nextPath) ? nextPath : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <AuthLayout title="Il tuo account" tagline="Gestisci l'accesso a Smartbook">
        <div className="auth-account">
          <div className="auth-avatar" aria-hidden>
            <User size={28} strokeWidth={1.75} />
          </div>
          <p className="auth-account-email">{user.email}</p>
          <Button block size="large" type="primary" shape="round" icon={<LogOut size={18} strokeWidth={1.75} />} onClick={() => void logout()}>
            Esci
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Smartbook" tagline="Accedi ai tuoi libri interattivi">
      <div className="sb-tabs" role="tablist" aria-label="Modalità accesso">
        <button
          type="button"
          role="tab"
          id="auth-tab-login"
          aria-controls="auth-panel"
          aria-selected={mode === 'login'}
          className="sb-tab"
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
          className="sb-tab"
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
        <Button block size="large" shape="round" onClick={() => loginWithGoogle(nextPath)}>
          Continua con Google
        </Button>

        <p className="auth-divider"><span>oppure email</span></p>

        <Form className="auth-form" layout="vertical" requiredMark={false} onFinish={() => void handleSubmit()}>
          <Form.Item label="Email" htmlFor="auth-email">
            <Input
              id="auth-email"
              type="email"
              size="large"
              prefix={<Mail size={18} strokeWidth={1.75} aria-hidden />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nome@esempio.it"
            />
          </Form.Item>

          <Form.Item label="Password" htmlFor="auth-password">
            <Input.Password
              id="auth-password"
              size="large"
              prefix={<LockKeyhole size={18} strokeWidth={1.75} aria-hidden />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'Minimo 8 caratteri' : '••••••••'}
            />
          </Form.Item>

          {mode === 'register' && (
            <Form.Item>
              <Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}>
                Ho letto e accetto i{' '}
                <Link to="/termini" target="_blank">Termini</Link> e la{' '}
                <Link to="/privacy" target="_blank">Privacy</Link>
              </Checkbox>
            </Form.Item>
          )}

          {error && <Alert className="auth-error" type="error" showIcon={false} title={error} role="alert" />}

          <Button block size="large" type="primary" shape="round" htmlType="submit" loading={loading}>
            {loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </Button>
        </Form>
      </div>
    </AuthLayout>
  );
}
