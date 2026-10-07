import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchBookAccess } from '../lib/api';
import { licensePhaseFromAccess } from '../lib/licenseGateState';
import { useAuth } from '../context/AuthContext';
import { useReaderFeatures } from '../context/ReaderConfigContext';

interface LicenseGateProps {
  bookId: string;
  access?: 'public' | 'licensed';
  children: ReactNode;
}

export function LicenseGate({ bookId, access = 'public', children }: LicenseGateProps) {
  const { drm } = useReaderFeatures();
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (access !== 'licensed' || !drm) {
      setState('ok');
      return;
    }

    if (authLoading) return;

    if (!user) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?next=${next}`, { replace: true });
      return;
    }

    let cancelled = false;
    fetchBookAccess(bookId)
      .then((res) => {
        if (!cancelled) setState(licensePhaseFromAccess(res));
      })
      .catch(() => {
        if (!cancelled) setState(licensePhaseFromAccess(null));
      });

    return () => {
      cancelled = true;
    };
  }, [access, attempt, authLoading, bookId, drm, location.pathname, location.search, navigate, user]);

  if (access !== 'licensed' || !drm) return <>{children}</>;
  if (authLoading || state === 'loading') {
    return <p className="empty-note">Verifica licenza in corso…</p>;
  }
  if (state === 'error') {
    return (
      <div className="license-locked">
        <h2>Verifica non riuscita</h2>
        <p>Non è stato possibile controllare la licenza. Controlla la connessione e riprova.</p>
        <div className="license-locked-actions">
          <button
            type="button"
            className="sb-btn sb-btn-primary"
            onClick={() => {
              setState('loading');
              setAttempt((n) => n + 1);
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <div className="license-locked">
        <h2>Accesso riservato</h2>
        <p>
          Questo smartbook richiede una licenza valida associata al tuo account.
        </p>
        <p>
          Se hai acquistato l&apos;accesso e non vedi il contenuto, contatta il supporto
          con l&apos;email <strong>{user?.email}</strong>.
        </p>
        <div className="license-locked-actions">
          <Link to="/redeem" className="sb-btn sb-btn-primary">Riscatta codice attivazione</Link>
          <Link to="/" className="license-locked-catalog-link">Torna al catalogo</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
