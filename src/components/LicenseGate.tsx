import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchBookAccess } from '../lib/api';
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
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    if (!drm || access !== 'licensed') {
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
        if (!cancelled) setState(res.has_license ? 'ok' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setState('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [drm, access, authLoading, bookId, location.pathname, location.search, navigate, user]);

  if (!drm || access !== 'licensed') return <>{children}</>;
  if (authLoading || state === 'loading') {
    return <p className="empty-note">Verifica licenza in corso…</p>;
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
        <Link to="/" className="btn-primary">Torna al catalogo</Link>
      </div>
    );
  }
  return <>{children}</>;
}
