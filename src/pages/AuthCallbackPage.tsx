import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchConsentStatus } from '../lib/api';
import { consentIsCurrent } from '../lib/consentVersion';
import versions from '../legal/versions.json';
import { consumeOAuthNext, isSafeNextPath } from '../lib/safeNext';
import { LoaderCircle } from 'lucide-react';

export function AuthCallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextQuery = searchParams.get('next');

  useEffect(() => {
    void (async () => {
      const next = consumeOAuthNext(nextQuery);
      await refresh();
      try {
        const consent = await fetchConsentStatus();
        if (!consentIsCurrent(consent, versions)) {
          const dest = isSafeNextPath(next)
            ? `/auth/accept-terms?next=${encodeURIComponent(next)}`
            : '/auth/accept-terms';
          navigate(dest, { replace: true });
        } else {
          navigate(isSafeNextPath(next) ? next : '/', { replace: true });
        }
      } catch {
        navigate('/auth', { replace: true });
      }
    })();
  }, [refresh, navigate, nextQuery]);

  return (
    <div className="app-loading">
      <LoaderCircle className="icon-spin" size={32} strokeWidth={1.75} aria-hidden />
      <p>Accesso in corso…</p>
    </div>
  );
}
