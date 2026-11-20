import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AntdProvider } from './context/AntdProvider';
import { ReaderConfigProvider } from './context/ReaderConfigContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstallBanner } from './components/InstallBanner';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { initBuiltinBooks, initRemoteBooks, initUploadedBooks } from './lib/loader';
import { initCloudBooks } from './lib/cloudLoader';
import { Home } from './pages/Home';
import { NotFoundPage } from './pages/NotFoundPage';
import { getReaderConfig } from './config/readerConfig';
import { useReaderFeatures } from './context/ReaderConfigContext';

const SmartbookRouter = lazy(() =>
  import('./pages/SmartbookPage').then((m) => ({ default: m.SmartbookRouter })),
);
// The account pages bring antd's forms, which the library does not need to show itself.
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const AcceptTermsPage = lazy(() => import('./pages/AcceptTermsPage').then((m) => ({ default: m.AcceptTermsPage })));
const RedeemPage = lazy(() => import('./pages/RedeemPage').then((m) => ({ default: m.RedeemPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

const queryClient = new QueryClient();

const PAGE_LOADING = <div className="app-loading"><p>Caricamento…</p></div>;

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
 * opened at the bottom). The jump is instant: html has smooth scrolling for in-page links, and a
 * page change should not slide up from thousands of pixels. Back/forward and links to an anchor
 * (#p2, #formula-2.1) are left alone.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(pathname);
  useEffect(() => {
    // Only a new path: switching graph rewrites the query and must keep the scroll.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (navigationType !== 'POP' && !hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);
  return null;
}

/** Only the library offers the install, so the banner never covers the reader's section bar. */
function HomeInstallBanner() {
  const { pathname } = useLocation();
  return <InstallBanner visible={pathname === '/'} />;
}

function AppRoutes() {
  const { auth: authEnabled } = useReaderFeatures();

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <ScrollToTop />
      <HomeInstallBanner />
      <ConsentGate>
      <Routes>
        <Route path="/" element={<Home />} />
        {authEnabled && (
          <>
            <Route path="/auth" element={<Suspense fallback={PAGE_LOADING}><AuthPage /></Suspense>} />
            <Route path="/auth/callback" element={<Suspense fallback={PAGE_LOADING}><AuthCallbackPage /></Suspense>} />
            <Route path="/auth/accept-terms" element={<Suspense fallback={PAGE_LOADING}><AcceptTermsPage /></Suspense>} />
            <Route path="/redeem" element={<Suspense fallback={PAGE_LOADING}><RedeemPage /></Suspense>} />
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
            <RouteErrorBoundary>
              <Suspense
                fallback={
                  <div className="app-loading" aria-busy="true">
                    <div className="app-loading-spinner" aria-hidden />
                    <p>Caricamento libro…</p>
                  </div>
                }
              >
                <SmartbookRouter />
              </Suspense>
            </RouteErrorBoundary>
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
    // Not awaited: the home page shows builtin books at once and adds the remote ones when they arrive.
    void initRemoteBooks();
    if (cloudEnabled) jobs.push(initCloudBooks().catch(console.error));
    void Promise.all(jobs).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" aria-hidden />
        <p>Caricamento PoliTost Smartbook…</p>
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
            </AuthProvider>
          </AntdProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReaderConfigProvider>
  );
}
