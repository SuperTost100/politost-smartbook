import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AntdProvider } from './context/AntdProvider';
import { ReaderConfigProvider } from './context/ReaderConfigContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstallBanner } from './components/InstallBanner';
import { initBuiltinBooks, initUploadedBooks } from './lib/loader';
import { initCloudBooks } from './lib/cloudLoader';
import { Home } from './pages/Home';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AcceptTermsPage } from './pages/AcceptTermsPage';
import { RedeemPage } from './pages/RedeemPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { getReaderConfig } from './config/readerConfig';
import { useReaderFeatures } from './context/ReaderConfigContext';

const SmartbookRouter = lazy(() =>
  import('./pages/SmartbookPage').then((m) => ({ default: m.SmartbookRouter })),
);
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

const queryClient = new QueryClient();

const CONSENT_OPEN = ['/auth', '/termini', '/privacy', '/cookie', '/docs'];

function ConsentGate({ children }: { children: ReactNode }) {
  const { auth: authEnabled } = useReaderFeatures();
  const { user, isLoading, hasConsent } = useAuth();
  const location = useLocation();
  if (!authEnabled || isLoading || !user || hasConsent) return children;
  const path = location.pathname;
  if (CONSENT_OPEN.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return children;
  const next = encodeURIComponent(path + location.search);
  return <Navigate to={`/auth/accept-terms?next=${next}`} replace />;
}

/**
 * A new page opens at the top (the router keeps the old scroll otherwise, so "next chapter"
 * opened at the bottom). Back/forward and links to an anchor (#p2, #formula-2.1) are left alone.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(pathname);
  useEffect(() => {
    // Only a new path: switching graph rewrites the query and must keep the scroll.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (navigationType !== 'POP' && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);
  return null;
}

function AppRoutes() {
  const { auth: authEnabled } = useReaderFeatures();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ConsentGate>
      <Routes>
        <Route path="/" element={<Home />} />
        {authEnabled && (
          <>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/accept-terms" element={<AcceptTermsPage />} />
            <Route path="/redeem" element={<RedeemPage />} />
          </>
        )}
        <Route
          path="/termini"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="tos" />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="privacy" />
            </Suspense>
          }
        />
        <Route
          path="/cookie"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <LegalPage doc="cookie" />
            </Suspense>
          }
        />
        <Route
          path="/docs"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento…</p></div>}>
              <DocsPage />
            </Suspense>
          }
        />
        <Route
          path="/libro/*"
          element={
            <Suspense fallback={<div className="app-loading"><p>Caricamento libro…</p></div>}>
              <SmartbookRouter />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </ConsentGate>
    </BrowserRouter>
  );
}

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cloudEnabled = getReaderConfig().features?.cloud;
    const jobs: Promise<unknown>[] = [
      initBuiltinBooks().catch(console.error),
      initUploadedBooks(null).catch(console.error),
    ];
    if (cloudEnabled) jobs.push(initCloudBooks().catch(console.error));
    void Promise.all(jobs).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" aria-hidden />
        <p>Caricamento Politost Smartbook…</p>
      </div>
    );
  }

  return (
    <ReaderConfigProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AntdProvider>
            <AuthProvider>
              <AppRoutes />
              <InstallBanner />
            </AuthProvider>
          </AntdProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReaderConfigProvider>
  );
}
