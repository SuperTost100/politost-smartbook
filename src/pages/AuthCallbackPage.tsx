import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchConsentStatus } from '../lib/api';
import { Icon } from '../components/Icon';

export function AuthCallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await refresh();
      try {
        const consent = await fetchConsentStatus();
        if (!consent.has_consent) {
          navigate('/auth/accept-terms', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch {
        navigate('/auth', { replace: true });
      }
    })();
  }, [refresh, navigate]);

  return (
    <div className="app-loading">
      <Icon name="loader" size={32} />
      <p>Accesso in corso…</p>
    </div>
  );
}
