import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { redeemActivationKey } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Form, Input } from 'antd';
import { LockKeyhole } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

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

  async function handleSubmit() {
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
      <AuthLayout>
        <p className="empty-note">Caricamento…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Riscatta codice" tagline="Inserisci il codice di attivazione ricevuto dall'editore">
      {!hasConsent && (
        <Alert
          className="auth-error"
          type="error"
          showIcon={false}
          role="alert"
          title={
            <>
              Devi accettare Termini e Privacy prima di riscattare un codice.{' '}
              <Link to="/auth/accept-terms?next=/redeem">Completa il consenso</Link>
            </>
          }
        />
      )}

      <Form className="auth-form" layout="vertical" requiredMark={false} onFinish={() => void handleSubmit()}>
        <Form.Item label="Codice attivazione" htmlFor="redeem-code">
          <Input
            id="redeem-code"
            size="large"
            prefix={<LockKeyhole size={18} strokeWidth={1.75} aria-hidden />}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={8}
            autoComplete="off"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            disabled={!hasConsent}
          />
        </Form.Item>

        {error && <Alert className="auth-error" type="error" showIcon={false} title={error} role="alert" />}

        {success && (
          <div className="auth-success" role="status">
            <p>{success.message}</p>
            <Link to={`/libro/${success.smartbookId}`} className="sb-btn sb-btn-primary sb-btn-block">
              Apri smartbook
            </Link>
          </div>
        )}

        <Button block size="large" type="primary" shape="round" htmlType="submit" loading={loading} disabled={!hasConsent}>
          {loading ? 'Verifica codice…' : 'Riscatta codice'}
        </Button>
      </Form>
    </AuthLayout>
  );
}
