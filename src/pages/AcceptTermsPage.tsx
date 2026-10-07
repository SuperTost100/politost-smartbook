import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Form } from 'antd';
import { FileText } from 'lucide-react';
import { recordConsent } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import versions from '../legal/versions.json';
import { AuthLayout } from '../components/AuthLayout';
import { isSafeNextPath } from '../lib/safeNext';

export function AcceptTermsPage() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!accept) {
      setError('Devi accettare Termini e Privacy per continuare.');
      return;
    }
    setLoading(true);
    try {
      await recordConsent(versions.tos, versions.privacy);
      await refresh();
      navigate(isSafeNextPath(nextPath) ? nextPath : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <AuthLayout>
        <div className="auth-account">
          <p>Devi prima accedere.</p>
          <Link to="/auth" className="sb-btn sb-btn-primary">Vai al login</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Accetta i termini" tagline={<>Un ultimo passo per <strong>{user.email}</strong></>}>
      <p className="auth-terms-intro">Prima di usare Smartbook, leggi e accetta:</p>
      <ul className="auth-terms-links">
        <li>
          <Link to="/termini" target="_blank">
            <FileText size={16} strokeWidth={1.75} aria-hidden />
            Termini di servizio
          </Link>
        </li>
        <li>
          <Link to="/privacy" target="_blank">
            <FileText size={16} strokeWidth={1.75} aria-hidden />
            Informativa privacy
          </Link>
        </li>
      </ul>
      <Form className="auth-form" layout="vertical" onFinish={() => void handleSubmit()}>
        <Form.Item>
          <Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)}>
            Accetto Termini e Privacy (v. {versions.tos})
          </Checkbox>
        </Form.Item>
        {error && <Alert className="auth-error" type="error" showIcon={false} title={error} role="alert" />}
        <Button block size="large" type="primary" shape="round" htmlType="submit" loading={loading}>
          {loading ? 'Salvataggio…' : 'Continua'}
        </Button>
      </Form>
    </AuthLayout>
  );
}
